import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  validateTargetUrl,
  validateScannerAuth,
  getCorsHeaders,
} from "../_shared/security.ts";
import type { Finding, ScannerResponse } from "../_shared/types.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DNS_TIMEOUT_MS = 8_000;
const RDAP_TIMEOUT_MS = 10_000;
const GOOGLE_DNS = "https://dns.google/resolve";

// Two-part TLDs where the registrable domain is third-level
const TWO_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "net.uk",
  "co.jp", "or.jp", "ne.jp", "ac.jp",
  "com.au", "net.au", "org.au", "edu.au",
  "co.nz", "net.nz", "org.nz",
  "co.za", "org.za", "web.za",
  "com.br", "net.br", "org.br",
  "co.in", "net.in", "org.in",
  "co.kr", "or.kr", "ne.kr",
  "com.cn", "net.cn", "org.cn",
  "com.tw", "net.tw", "org.tw",
  "com.mx", "net.mx", "org.mx",
  "com.ar", "net.ar", "org.ar",
  "co.il", "org.il", "net.il",
  "com.sg", "net.sg", "org.sg",
  "com.hk", "net.hk", "org.hk",
  "co.id", "or.id", "web.id",
  "com.tr", "net.tr", "org.tr",
  "com.my", "net.my", "org.my",
  "co.th", "or.th", "in.th",
]);

// Homoglyph map for typosquatting
const HOMOGLYPHS: Record<string, string[]> = {
  a: ["@", "4"],
  e: ["3"],
  i: ["1", "l"],
  l: ["1", "i"],
  o: ["0"],
  s: ["5"],
  g: ["9"],
  t: ["7"],
};

// Known vulnerable CNAME targets for dangling NS detection
const KNOWN_NS_PROVIDERS: Record<string, string> = {
  "cloudflare.com": "Cloudflare",
  "awsdns": "AWS Route 53",
  "google": "Google Cloud DNS",
  "azure-dns": "Azure DNS",
  "nsone.net": "NS1",
  "digitalocean.com": "DigitalOcean",
  "domaincontrol.com": "GoDaddy",
  "name-services.com": "Enom",
  "dnsmadeeasy.com": "DNS Made Easy",
  "ultradns": "UltraDNS",
  "dynect.net": "Oracle Dyn",
  "registrar-servers.com": "Namecheap",
  "linode.com": "Linode/Akamai",
  "hetzner": "Hetzner",
  "ovh.net": "OVH",
  "gandi.net": "Gandi",
  "hover.com": "Hover",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** DNS lookup via Google DNS-over-HTTPS */
async function dnsLookup(
  name: string,
  type: string,
  timeoutMs = DNS_TIMEOUT_MS,
): Promise<{ Status: number; Answer?: { type: number; data: string; name: string }[]; Authority?: any[] }> {
  const url = `${GOOGLE_DNS}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
    signal: timeoutSignal(timeoutMs),
  });
  return res.json();
}

/** Extract registrable domain from hostname (handles two-part TLDs) */
function extractDomain(hostname: string): string {
  const parts = hostname.replace(/\.$/, "").split(".");
  if (parts.length <= 2) return parts.join(".");

  const lastTwo = parts.slice(-2).join(".");
  if (TWO_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

/** Identify NS provider from hostname */
function identifyNsProvider(nsHostname: string): string {
  const lower = nsHostname.toLowerCase();
  for (const [pattern, name] of Object.entries(KNOWN_NS_PROVIDERS)) {
    if (lower.includes(pattern)) return name;
  }
  return extractDomain(lower);
}

// ---------------------------------------------------------------------------
// Check 1: Domain Registration via RDAP
// ---------------------------------------------------------------------------

async function checkRegistration(domain: string): Promise<{ findings: Finding[]; deductions: number }> {
  const findings: Finding[] = [];
  let deductions = 0;

  try {
    // Step 1: Get RDAP bootstrap data to find the right server
    const bootstrapRes = await fetch("https://data.iana.org/rdap/dns.json", {
      signal: timeoutSignal(RDAP_TIMEOUT_MS),
    });
    const bootstrap = await bootstrapRes.json();

    // Find RDAP server for our TLD
    const tld = domain.split(".").pop()!.toLowerCase();
    let rdapServer = "";
    for (const entry of bootstrap.services || []) {
      const [tlds, urls] = entry;
      if (tlds.some((t: string) => t.toLowerCase() === tld)) {
        rdapServer = urls[0];
        break;
      }
    }

    if (!rdapServer) {
      findings.push({
        id: "hijack-rdap-unsupported",
        severity: "low",
        title: "RDAP not available for this TLD",
        description: `No RDAP server found for .${tld} TLD. Domain registration status could not be verified.`,
        recommendation: "Consider using a registrar that supports RDAP for better transparency.",
      });
      return { findings, deductions: 0 };
    }

    // Normalize server URL
    if (!rdapServer.endsWith("/")) rdapServer += "/";

    // Step 2: Query RDAP for domain info
    const rdapRes = await fetch(`${rdapServer}domain/${domain}`, {
      signal: timeoutSignal(RDAP_TIMEOUT_MS),
      headers: { Accept: "application/rdap+json" },
    });

    if (!rdapRes.ok) {
      findings.push({
        id: "hijack-rdap-failed",
        severity: "low",
        title: "RDAP lookup failed",
        description: `RDAP query returned HTTP ${rdapRes.status}. Domain registration details could not be verified.`,
        recommendation: "This may indicate the domain is not registered or the RDAP server is unavailable.",
      });
      return { findings, deductions: 0 };
    }

    const rdap = await rdapRes.json();

    // --- Expiration check ---
    const events: { eventAction: string; eventDate: string }[] = rdap.events || [];
    const expiryEvent = events.find((e) => e.eventAction === "expiration");
    const registrationEvent = events.find((e) => e.eventAction === "registration");
    const lastChangedEvent = events.find((e) => e.eventAction === "last changed");

    if (expiryEvent) {
      const expiryDate = new Date(expiryEvent.eventDate);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 86_400_000);

      if (daysUntilExpiry <= 0) {
        findings.push({
          id: "hijack-expiry-expired",
          severity: "critical",
          title: "Domain has expired",
          description: `Domain expired on ${expiryDate.toISOString().split("T")[0]}. An expired domain can be registered by anyone, leading to complete domain hijacking.`,
          recommendation: "Renew the domain immediately to prevent takeover.",
          evidence: `Expired: ${expiryDate.toISOString().split("T")[0]}`,
        });
        deductions += 30;
      } else if (daysUntilExpiry <= 30) {
        findings.push({
          id: "hijack-expiry-critical",
          severity: "critical",
          title: "Domain expires within 30 days",
          description: `Domain expires on ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days). If not renewed, the domain can be registered by attackers.`,
          recommendation: "Enable auto-renewal and renew the domain immediately.",
          evidence: `Expires: ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days)`,
        });
        deductions += 25;
      } else if (daysUntilExpiry <= 90) {
        findings.push({
          id: "hijack-expiry-warning",
          severity: "high",
          title: "Domain expires within 90 days",
          description: `Domain expires on ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days). Ensure auto-renewal is enabled.`,
          recommendation: "Enable auto-renewal and consider extending the registration period.",
          evidence: `Expires: ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days)`,
        });
        deductions += 15;
      } else if (daysUntilExpiry <= 180) {
        findings.push({
          id: "hijack-expiry-soon",
          severity: "medium",
          title: "Domain expires within 6 months",
          description: `Domain expires on ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days).`,
          recommendation: "Ensure auto-renewal is enabled to prevent accidental expiration.",
          evidence: `Expires: ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days)`,
        });
        deductions += 5;
      } else {
        findings.push({
          id: "hijack-expiry-ok",
          severity: "info",
          title: "Domain registration is current",
          description: `Domain expires on ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days remaining).`,
          recommendation: "No action needed. Consider enabling auto-renewal if not already enabled.",
          evidence: `Expires: ${expiryDate.toISOString().split("T")[0]} (${daysUntilExpiry} days)`,
        });
      }
    } else {
      findings.push({
        id: "hijack-expiry-unknown",
        severity: "medium",
        title: "Domain expiration date not available",
        description: "RDAP response did not include an expiration date. This may indicate a non-standard registrar.",
        recommendation: "Verify domain expiration through your registrar's control panel.",
      });
      deductions += 3;
    }

    // --- Lock status check ---
    const statuses: string[] = (rdap.status || []).map((s: string) => s.toLowerCase());
    const hasTransferLock = statuses.some((s) =>
      s.includes("clienttransferprohibited") || s.includes("servertransferprohibited")
    );
    const hasDeleteLock = statuses.some((s) =>
      s.includes("clientdeleteprohibited") || s.includes("serverdeleteprohibited")
    );
    const hasUpdateLock = statuses.some((s) =>
      s.includes("clientupdateprohibited") || s.includes("serverupdateprohibited")
    );

    if (!hasTransferLock) {
      findings.push({
        id: "hijack-no-transfer-lock",
        severity: "high",
        title: "Domain transfer lock not enabled",
        description: "The domain does not have clientTransferProhibited status. Without a transfer lock, an attacker with registrar access could transfer the domain away.",
        recommendation: "Enable domain transfer lock (clientTransferProhibited) at your registrar.",
        evidence: `Current statuses: ${statuses.join(", ") || "none"}`,
      });
      deductions += 15;
    }

    if (!hasDeleteLock) {
      findings.push({
        id: "hijack-no-delete-lock",
        severity: "medium",
        title: "Domain delete lock not enabled",
        description: "The domain does not have clientDeleteProhibited status. Without this lock, the domain could be accidentally or maliciously deleted.",
        recommendation: "Enable domain delete lock (clientDeleteProhibited) at your registrar.",
        evidence: `Current statuses: ${statuses.join(", ") || "none"}`,
      });
      deductions += 5;
    }

    if (hasTransferLock && hasDeleteLock) {
      findings.push({
        id: "hijack-locks-ok",
        severity: "info",
        title: "Domain lock protections enabled",
        description: `Domain has transfer and delete lock protections.${hasUpdateLock ? " Update lock also enabled." : ""}`,
        recommendation: "No action needed.",
        evidence: `Statuses: ${statuses.join(", ")}`,
      });
    }

    // --- Registrar info ---
    const registrarEntity = (rdap.entities || []).find((e: any) =>
      (e.roles || []).includes("registrar")
    );
    if (registrarEntity) {
      const vcards = registrarEntity.vcardArray?.[1] || [];
      const fnEntry = vcards.find((v: any[]) => v[0] === "fn");
      const registrarName = fnEntry ? fnEntry[3] : "Unknown";

      // Add metadata-style finding for registrar info
      if (registrationEvent) {
        findings.push({
          id: "hijack-registrar-info",
          severity: "info",
          title: "Domain registrar information",
          description: `Registered through ${registrarName} since ${registrationEvent.eventDate.split("T")[0]}.${lastChangedEvent ? ` Last updated: ${lastChangedEvent.eventDate.split("T")[0]}.` : ""}`,
          evidence: `Registrar: ${registrarName}`,
        });
      }
    }
  } catch (err) {
    findings.push({
      id: "hijack-rdap-error",
      severity: "low",
      title: "RDAP lookup error",
      description: `Could not query RDAP: ${err instanceof Error ? err.message : "Unknown error"}. Domain registration status was not verified.`,
      recommendation: "Check your domain registration status manually at your registrar.",
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 2: Nameserver Integrity
// ---------------------------------------------------------------------------

async function checkNameserverIntegrity(domain: string): Promise<{ findings: Finding[]; deductions: number; nsRecords: string[] }> {
  const findings: Finding[] = [];
  let deductions = 0;
  let nsRecords: string[] = [];

  try {
    const nsResult = await dnsLookup(domain, "NS");
    nsRecords = (nsResult.Answer || [])
      .filter((a) => a.type === 2) // NS record type
      .map((a) => a.data.replace(/\.$/, "").toLowerCase());

    if (nsRecords.length === 0) {
      findings.push({
        id: "hijack-no-ns",
        severity: "critical",
        title: "No NS records found",
        description: "No nameserver records were found for this domain. This indicates the domain may not be properly delegated.",
        recommendation: "Configure nameserver records at your domain registrar.",
      });
      deductions += 25;
      return { findings, deductions, nsRecords };
    }

    // Check each NS resolves
    const nsChecks = nsRecords.slice(0, 8).map(async (ns) => {
      try {
        const aResult = await dnsLookup(ns, "A");
        if (aResult.Status === 3 || (!aResult.Answer?.length)) {
          // NXDOMAIN or no A records — dangling NS
          return { ns, status: "dangling" as const };
        }
        return { ns, status: "ok" as const };
      } catch {
        return { ns, status: "error" as const };
      }
    });

    const results = await Promise.allSettled(nsChecks);
    let danglingCount = 0;

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { ns, status } = result.value;

      if (status === "dangling") {
        danglingCount++;
        findings.push({
          id: "hijack-dangling-ns",
          severity: "critical",
          title: `Dangling nameserver: ${ns}`,
          description: `Nameserver ${ns} does not resolve to any IP address (NXDOMAIN). An attacker could register this hostname and take control of DNS resolution for your domain.`,
          recommendation: `Remove the dangling NS record pointing to ${ns} and replace it with a valid nameserver.`,
          evidence: `NS: ${ns} → NXDOMAIN`,
        });
        deductions += 20;
      }
    }

    if (danglingCount === 0 && nsRecords.length > 0) {
      findings.push({
        id: "hijack-ns-healthy",
        severity: "info",
        title: "All nameservers resolve correctly",
        description: `All ${nsRecords.length} nameserver(s) resolve to valid IP addresses.`,
        recommendation: "No action needed.",
        evidence: `NS records: ${nsRecords.join(", ")}`,
      });
    }
  } catch (err) {
    findings.push({
      id: "hijack-ns-check-error",
      severity: "low",
      title: "Nameserver integrity check failed",
      description: `Could not verify nameserver integrity: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }

  return { findings, deductions, nsRecords };
}

// ---------------------------------------------------------------------------
// Check 3: Nameserver Diversity
// ---------------------------------------------------------------------------

function checkNameserverDiversity(nsRecords: string[]): { findings: Finding[]; deductions: number } {
  const findings: Finding[] = [];
  let deductions = 0;

  if (nsRecords.length === 0) {
    // Already flagged by integrity check
    return { findings, deductions };
  }

  if (nsRecords.length === 1) {
    findings.push({
      id: "hijack-single-ns",
      severity: "critical",
      title: "Only one nameserver configured",
      description: "Having a single nameserver is a single point of failure. If it goes down, your entire domain becomes unreachable.",
      recommendation: "Add at least one additional nameserver from a different provider for redundancy.",
      evidence: `NS: ${nsRecords[0]}`,
    });
    deductions += 15;
    return { findings, deductions };
  }

  // Check provider diversity
  const providers = new Set(nsRecords.map(identifyNsProvider));

  if (providers.size === 1) {
    const provider = [...providers][0];
    findings.push({
      id: "hijack-ns-single-provider",
      severity: "medium",
      title: "All nameservers from same provider",
      description: `All ${nsRecords.length} nameservers are hosted by ${provider}. If this provider experiences an outage, your domain becomes unreachable.`,
      recommendation: "Consider adding a secondary DNS provider for resilience against provider-level outages.",
      evidence: `Provider: ${provider}, NS count: ${nsRecords.length}`,
    });
    deductions += 5;
  } else {
    findings.push({
      id: "hijack-ns-diverse",
      severity: "info",
      title: "Nameserver diversity is good",
      description: `Nameservers are distributed across ${providers.size} providers: ${[...providers].join(", ")}.`,
      recommendation: "No action needed.",
      evidence: `${nsRecords.length} NS across ${providers.size} providers`,
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 4: Typosquatting Detection
// ---------------------------------------------------------------------------

async function checkTyposquatting(domain: string): Promise<{ findings: Finding[]; deductions: number }> {
  const findings: Finding[] = [];
  let deductions = 0;

  const parts = domain.split(".");
  if (parts.length < 2) return { findings, deductions };

  const tld = parts.slice(1).join(".");
  const name = parts[0];
  const mutations = new Set<string>();

  // 1. Character omission (drop one char at a time)
  for (let i = 0; i < name.length && mutations.size < 20; i++) {
    const m = name.slice(0, i) + name.slice(i + 1);
    if (m.length >= 2) mutations.add(`${m}.${tld}`);
  }

  // 2. Adjacent character swap
  for (let i = 0; i < name.length - 1 && mutations.size < 25; i++) {
    const chars = name.split("");
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
    const m = chars.join("");
    if (m !== name) mutations.add(`${m}.${tld}`);
  }

  // 3. Homoglyphs
  for (let i = 0; i < name.length && mutations.size < 30; i++) {
    const ch = name[i].toLowerCase();
    const replacements = HOMOGLYPHS[ch];
    if (replacements) {
      for (const r of replacements) {
        if (mutations.size >= 30) break;
        const m = name.slice(0, i) + r + name.slice(i + 1);
        mutations.add(`${m}.${tld}`);
      }
    }
  }

  // 4. TLD swaps
  const tldSwaps = ["com", "net", "org", "io", "co", "dev", "app"];
  const baseTld = tld.split(".")[0];
  for (const t of tldSwaps) {
    if (t !== baseTld) mutations.add(`${name}.${t}`);
  }

  // 5. Double character
  for (let i = 0; i < name.length && mutations.size < 40; i++) {
    const m = name.slice(0, i) + name[i] + name.slice(i);
    mutations.add(`${m}.${tld}`);
  }

  // Remove the original domain
  mutations.delete(domain);

  // Check up to 15 mutations via DNS (batch)
  const toCheck = [...mutations].slice(0, 15);
  const registered: string[] = [];

  const checks = toCheck.map(async (typo) => {
    try {
      const result = await dnsLookup(typo, "A", 5_000);
      // Status 0 = NOERROR (domain exists), has Answer = resolves
      if (result.Status === 0 && result.Answer && result.Answer.length > 0) {
        return { domain: typo, registered: true };
      }
      return { domain: typo, registered: false };
    } catch {
      return { domain: typo, registered: false };
    }
  });

  const results = await Promise.allSettled(checks);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.registered) {
      registered.push(r.value.domain);
    }
  }

  if (registered.length >= 5) {
    findings.push({
      id: "hijack-typosquat-many",
      severity: "high",
      title: `${registered.length} typosquat domains detected`,
      description: `Found ${registered.length} registered domains that are similar to ${domain}. These could be used for phishing, credential theft, or brand impersonation.`,
      recommendation: "Consider registering common typo variations of your domain to prevent abuse. Monitor these domains for malicious activity.",
      evidence: `Typosquats: ${registered.slice(0, 10).join(", ")}${registered.length > 10 ? ` (+${registered.length - 10} more)` : ""}`,
    });
    deductions += 10;
  } else if (registered.length > 0) {
    findings.push({
      id: "hijack-typosquat-some",
      severity: "medium",
      title: `${registered.length} typosquat domain(s) detected`,
      description: `Found ${registered.length} registered domain(s) similar to ${domain}. These could be used for phishing attacks.`,
      recommendation: "Consider registering these domains or monitoring them for abuse.",
      evidence: `Typosquats: ${registered.join(", ")}`,
    });
    deductions += 5;
  } else {
    findings.push({
      id: "hijack-typosquat-clean",
      severity: "info",
      title: "No typosquat domains detected",
      description: `Checked ${toCheck.length} common typo variations of ${domain}. None appear to be registered.`,
      recommendation: "No action needed. Consider periodically monitoring for new typosquat registrations.",
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 5: Zone Exposure
// ---------------------------------------------------------------------------

async function checkZoneExposure(domain: string): Promise<{ findings: Finding[]; deductions: number }> {
  const findings: Finding[] = [];
  let deductions = 0;

  try {
    // Check for common enumerable records that reveal zone structure
    const recordTypes = ["A", "AAAA", "MX", "TXT", "CNAME", "SRV", "CAA"];
    const queries = recordTypes.map((type) =>
      dnsLookup(domain, type, 5_000).catch(() => ({ Status: -1, Answer: [] }))
    );

    const results = await Promise.allSettled(queries);
    let totalRecords = 0;
    const foundTypes: string[] = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        const r = (results[i] as PromiseFulfilledResult<any>).value;
        const count = r.Answer?.length || 0;
        if (count > 0) {
          totalRecords += count;
          foundTypes.push(`${recordTypes[i]}(${count})`);
        }
      }
    }

    // Also check some common subdomains that reveal infrastructure
    const probeSubdomains = [
      `_dmarc.${domain}`,
      `mail.${domain}`,
      `www.${domain}`,
      `ftp.${domain}`,
      `autodiscover.${domain}`,
      `_sip._tcp.${domain}`,
    ];

    const subChecks = probeSubdomains.map((sub) =>
      dnsLookup(sub, "A", 5_000).catch(() => ({ Status: -1, Answer: [] }))
    );

    const subResults = await Promise.allSettled(subChecks);
    let resolvedSubs = 0;
    for (const r of subResults) {
      if (r.status === "fulfilled" && (r.value as any).Answer?.length > 0) {
        resolvedSubs++;
      }
    }

    totalRecords += resolvedSubs;

    if (totalRecords > 25) {
      findings.push({
        id: "hijack-zone-exposed",
        severity: "medium",
        title: "Large DNS zone surface detected",
        description: `Found ${totalRecords} DNS records across ${foundTypes.length} types and ${resolvedSubs} resolvable subdomains. A large DNS surface makes zone enumeration easier for attackers.`,
        recommendation: "Review DNS records for unnecessary entries. Remove stale or unused records to reduce attack surface.",
        evidence: `Records: ${foundTypes.join(", ")}. Resolvable subdomains: ${resolvedSubs}/6`,
      });
      deductions += 5;
    } else {
      findings.push({
        id: "hijack-zone-ok",
        severity: "info",
        title: "DNS zone surface is minimal",
        description: `Found ${totalRecords} DNS records. Zone exposure appears controlled.`,
        recommendation: "No action needed. Periodically audit DNS records for stale entries.",
        evidence: `Records: ${foundTypes.join(", ") || "minimal"}`,
      });
    }
  } catch (err) {
    findings.push({
      id: "hijack-zone-check-error",
      severity: "low",
      title: "Zone exposure check failed",
      description: `Could not assess zone exposure: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 6: NS Security
// ---------------------------------------------------------------------------

async function checkNsSecurity(domain: string, nsRecords: string[]): Promise<{ findings: Finding[]; deductions: number }> {
  const findings: Finding[] = [];
  let deductions = 0;

  if (nsRecords.length === 0) return { findings, deductions };

  // Check 6a: NS pointing to CNAME (RFC 2181 violation)
  const cnameChecks = nsRecords.slice(0, 6).map(async (ns) => {
    try {
      const result = await dnsLookup(ns, "CNAME", 5_000);
      if (result.Answer?.some((a) => a.type === 5)) {
        return { ns, hasCname: true };
      }
      return { ns, hasCname: false };
    } catch {
      return { ns, hasCname: false };
    }
  });

  const cnameResults = await Promise.allSettled(cnameChecks);
  for (const r of cnameResults) {
    if (r.status === "fulfilled" && r.value.hasCname) {
      findings.push({
        id: "hijack-ns-cname",
        severity: "high",
        title: `Nameserver ${r.value.ns} points to CNAME`,
        description: `Nameserver ${r.value.ns} has a CNAME record, which violates RFC 2181. This can cause unpredictable DNS resolution and makes the NS vulnerable to CNAME-based hijacking.`,
        recommendation: `Configure ${r.value.ns} with A/AAAA records instead of a CNAME.`,
        evidence: `${r.value.ns} → CNAME`,
      });
      deductions += 10;
    }
  }

  // Check 6b: In-bailiwick NS (NS hostname is under the domain itself)
  const inBailiwick = nsRecords.filter((ns) => ns.endsWith(`.${domain}`) || ns === domain);
  const outOfBailiwick = nsRecords.filter((ns) => !ns.endsWith(`.${domain}`) && ns !== domain);

  if (inBailiwick.length > 0 && outOfBailiwick.length === 0) {
    findings.push({
      id: "hijack-ns-all-inbailiwick",
      severity: "medium",
      title: "All nameservers are in-bailiwick",
      description: `All NS records (${inBailiwick.join(", ")}) are subdomains of ${domain}. If the parent zone's glue records are compromised, all nameservers become attacker-controlled simultaneously.`,
      recommendation: "Add at least one out-of-bailiwick nameserver (e.g., from an external DNS provider) for resilience.",
      evidence: `In-bailiwick: ${inBailiwick.join(", ")}`,
    });
    deductions += 5;
  } else if (inBailiwick.length > 0 && outOfBailiwick.length > 0) {
    findings.push({
      id: "hijack-ns-mixed-bailiwick",
      severity: "info",
      title: "Mixed in-bailiwick and external nameservers",
      description: `Domain has ${inBailiwick.length} in-bailiwick and ${outOfBailiwick.length} external nameserver(s).`,
      recommendation: "No action needed. External NS provides resilience against glue record attacks.",
      evidence: `In-bailiwick: ${inBailiwick.join(", ")}; External: ${outOfBailiwick.join(", ")}`,
    });
  }

  // Check 6c: NS security summary if no issues found
  const hasNsIssues = findings.some((f) =>
    f.id === "hijack-ns-cname" || f.id === "hijack-ns-all-inbailiwick"
  );
  if (!hasNsIssues) {
    findings.push({
      id: "hijack-ns-security-ok",
      severity: "info",
      title: "Nameserver configuration is secure",
      description: "No RFC violations or in-bailiwick risks detected in nameserver configuration.",
      recommendation: "No action needed.",
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  // Method check
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  // Auth check
  if (!validateScannerAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const body = await req.json();
    const validation = validateTargetUrl(body.targetUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const url = validation.url!;
    const hostname = new URL(url).hostname;
    const domain = extractDomain(hostname);

    // Run all checks in parallel
    const [registrationResult, nsIntegrityResult, typosquatResult, zoneResult] =
      await Promise.allSettled([
        checkRegistration(domain),
        checkNameserverIntegrity(domain),
        checkTyposquatting(domain),
        checkZoneExposure(domain),
      ]);

    // Collect all findings and deductions
    const allFindings: Finding[] = [];
    let totalDeductions = 0;

    // Process registration
    if (registrationResult.status === "fulfilled") {
      allFindings.push(...registrationResult.value.findings);
      totalDeductions += registrationResult.value.deductions;
    }

    // Process NS integrity — also need nsRecords for diversity & security checks
    let nsRecords: string[] = [];
    if (nsIntegrityResult.status === "fulfilled") {
      allFindings.push(...nsIntegrityResult.value.findings);
      totalDeductions += nsIntegrityResult.value.deductions;
      nsRecords = nsIntegrityResult.value.nsRecords;
    }

    // NS Diversity (sync, depends on nsRecords)
    const diversityResult = checkNameserverDiversity(nsRecords);
    allFindings.push(...diversityResult.findings);
    totalDeductions += diversityResult.deductions;

    // NS Security (async, depends on nsRecords)
    try {
      const nsSecResult = await checkNsSecurity(domain, nsRecords);
      allFindings.push(...nsSecResult.findings);
      totalDeductions += nsSecResult.deductions;
    } catch {
      // Non-critical
    }

    // Process typosquatting
    if (typosquatResult.status === "fulfilled") {
      allFindings.push(...typosquatResult.value.findings);
      totalDeductions += typosquatResult.value.deductions;
    }

    // Process zone exposure
    if (zoneResult.status === "fulfilled") {
      allFindings.push(...zoneResult.value.findings);
      totalDeductions += zoneResult.value.deductions;
    }

    // Calculate score
    const score = Math.max(0, Math.min(100, 100 - totalDeductions));

    const response: ScannerResponse = {
      scannerType: "domain_hijacking",
      score,
      findings: allFindings,
      scannedAt: new Date().toISOString(),
      url,
      metadata: {
        domain,
        checksRun: 6,
        nameservers: nsRecords,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (err) {
    const response: ScannerResponse = {
      scannerType: "domain_hijacking",
      score: 0,
      findings: [],
      scannedAt: new Date().toISOString(),
      url: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: jsonHeaders,
    });
  }
});
