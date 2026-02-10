import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * SSL/TLS Scanner
 * Analyzes SSL/TLS configuration, certificate health, HSTS policy,
 * HTTPS enforcement, mixed content, and TLS version support.
 *
 * Uses crt.sh (Certificate Transparency), hstspreload.org, SSL Labs
 * cached data, and direct HTTPS probing for fast, comprehensive results.
 */

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
  value?: string;
}

interface CrtShEntry {
  id: number;
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  not_before: string;
  not_after: string;
  serial_number: string;
  result_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDomain(url: string): string {
  return new URL(url).hostname;
}

/** Create an AbortSignal that fires after `ms` milliseconds. */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Safely fetch with a per-call timeout. Returns null on any failure. */
async function safeFetch(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {},
): Promise<Response | null> {
  const { timeoutMs = 10_000, ...fetchOpts } = opts;
  try {
    const response = await fetch(url, {
      ...fetchOpts,
      signal: timeoutSignal(timeoutMs),
    });
    return response;
  } catch {
    return null;
  }
}

/** Count days between now and a date string. Negative = in the past. */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Check 1: Certificate Transparency via crt.sh
// ---------------------------------------------------------------------------

interface CertCheckResult {
  findings: Finding[];
  deductions: number;
}

async function checkCertificateTransparency(domain: string): Promise<CertCheckResult> {
  const findings: Finding[] = [];
  let deductions = 0;

  const response = await safeFetch(
    `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&limit=10`,
    { timeoutMs: 10_000 },
  );

  if (!response || !response.ok) {
    findings.push({
      id: "crt-sh-unavailable",
      severity: "info",
      title: "Certificate Transparency lookup unavailable",
      description:
        "Could not query crt.sh for Certificate Transparency logs. This check was skipped.",
      recommendation:
        "No action needed. This is an informational check that depends on external service availability.",
    });
    return { findings, deductions };
  }

  let entries: CrtShEntry[];
  try {
    entries = await response.json();
  } catch {
    findings.push({
      id: "crt-sh-parse-error",
      severity: "info",
      title: "Certificate Transparency data could not be parsed",
      description: "The crt.sh API returned data that could not be parsed.",
      recommendation: "No action needed.",
    });
    return { findings, deductions };
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    findings.push({
      id: "crt-no-certs",
      severity: "medium",
      title: "No certificates found in CT logs",
      description:
        `No certificates were found in Certificate Transparency logs for ${domain}. This may indicate the domain does not have a publicly trusted certificate.`,
      recommendation:
        "Ensure your SSL certificate is issued by a publicly trusted CA that logs to CT.",
      value: domain,
    });
    deductions += 10;
    return { findings, deductions };
  }

  // Sort by not_after descending to find the latest certificate
  const sorted = [...entries].sort(
    (a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime(),
  );
  const latest = sorted[0];
  const daysLeft = daysUntil(latest.not_after);

  // Certificate expiry analysis
  if (daysLeft < 0) {
    deductions += 30;
    findings.push({
      id: "cert-expired",
      severity: "critical",
      title: "SSL certificate has expired",
      description:
        `The most recent certificate for ${domain} expired ${Math.abs(daysLeft)} day(s) ago (expiry: ${latest.not_after}). Visitors will see browser security warnings.`,
      recommendation:
        "Renew your SSL certificate immediately. If using Let's Encrypt, check that auto-renewal is configured correctly.",
      value: `Expired: ${latest.not_after}`,
    });
  } else if (daysLeft <= 30) {
    deductions += 10;
    findings.push({
      id: "cert-expiring-soon",
      severity: "medium",
      title: "SSL certificate expiring soon",
      description:
        `The certificate for ${domain} expires in ${daysLeft} day(s) on ${latest.not_after}. Renew promptly to avoid service disruption.`,
      recommendation:
        "Renew your SSL certificate before it expires. Consider enabling auto-renewal.",
      value: `Expires: ${latest.not_after} (${daysLeft} days)`,
    });
  } else {
    findings.push({
      id: "cert-valid",
      severity: "info",
      title: "SSL certificate is valid",
      description:
        `The certificate for ${domain} is valid until ${latest.not_after} (${daysLeft} days remaining).`,
      recommendation: "No action needed. Certificate validity is healthy.",
      value: `Expires: ${latest.not_after} (${daysLeft} days)`,
    });
  }

  // Certificate issuer info
  const issuerName = latest.issuer_name || "Unknown";
  findings.push({
    id: "cert-issuer",
    severity: "info",
    title: "Certificate issuer identified",
    description: `Certificate issued by: ${issuerName}.`,
    recommendation: "Informational only. Ensure your CA is reputable and trusted.",
    value: issuerName,
  });

  // Check for wildcard certificates
  const wildcardCerts = entries.filter(
    (e) => e.common_name?.startsWith("*.") || e.name_value?.includes("*."),
  );
  if (wildcardCerts.length > 0) {
    findings.push({
      id: "cert-wildcard",
      severity: "info",
      title: "Wildcard certificate detected",
      description:
        `A wildcard certificate (${wildcardCerts[0].common_name}) was found. Wildcard certs cover all subdomains but should be stored securely as compromise affects all subdomains.`,
      recommendation:
        "Ensure wildcard certificate private keys are stored securely. Consider using specific certificates for critical subdomains.",
      value: wildcardCerts[0].common_name,
    });
  }

  // Check for many distinct issuers (potential mismanagement)
  const uniqueIssuers = new Set(entries.map((e) => e.issuer_ca_id));
  if (uniqueIssuers.size > 3) {
    findings.push({
      id: "cert-multiple-issuers",
      severity: "info",
      title: "Multiple certificate issuers detected",
      description:
        `${uniqueIssuers.size} different certificate authorities have issued certificates for this domain. This may indicate CA migration or certificate management inconsistency.`,
      recommendation:
        "Review your certificate management process. Consolidating to a single CA simplifies renewal and monitoring.",
      value: `${uniqueIssuers.size} distinct CAs`,
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 2: HTTPS Availability & Check 3: HSTS Header & Check 5: Cert Headers
// & Check 6: Mixed Content
// (Combined into a single HTTPS probe to minimise requests)
// ---------------------------------------------------------------------------

interface HttpsProbeResult {
  findings: Finding[];
  deductions: number;
  httpsResponse: Response | null;
}

async function probeHttps(domain: string): Promise<HttpsProbeResult> {
  const findings: Finding[] = [];
  let deductions = 0;

  // --- HTTPS availability ---
  const httpsUrl = `https://${domain}`;
  const httpsResponse = await safeFetch(httpsUrl, {
    timeoutMs: 10_000,
    redirect: "follow",
  });

  if (!httpsResponse) {
    deductions += 30;
    findings.push({
      id: "https-unavailable",
      severity: "critical",
      title: "HTTPS connection failed",
      description:
        `Could not establish an HTTPS connection to ${domain}. The site may not have a valid SSL certificate or TLS is misconfigured.`,
      recommendation:
        "Install a valid SSL certificate and ensure your server supports TLS 1.2 or higher on port 443.",
    });
    return { findings, deductions, httpsResponse: null };
  }

  findings.push({
    id: "https-available",
    severity: "info",
    title: "HTTPS connection successful",
    description: `Successfully connected to ${domain} over HTTPS.`,
    recommendation: "No action needed.",
  });

  // --- HSTS Header Analysis (Check 3) ---
  const hstsHeader = httpsResponse.headers.get("Strict-Transport-Security");

  if (!hstsHeader) {
    deductions += 15;
    findings.push({
      id: "hsts-missing",
      severity: "high",
      title: "Strict-Transport-Security header missing",
      description:
        "The HSTS header is not set. Without it, browsers may allow downgrade attacks from HTTPS to HTTP.",
      recommendation:
        "Add the Strict-Transport-Security header with a max-age of at least 31536000 (1 year). Example: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    });
  } else {
    const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
    const hasIncludeSubDomains = /includesubdomains/i.test(hstsHeader);
    const hasPreload = /preload/i.test(hstsHeader);

    if (maxAge < 31536000) {
      deductions += 5;
      findings.push({
        id: "hsts-short-max-age",
        severity: "medium",
        title: "HSTS max-age is too short",
        description:
          `HSTS max-age is ${maxAge} seconds (${Math.floor(maxAge / 86400)} days). The recommended minimum is 31536000 seconds (1 year).`,
        recommendation:
          "Increase the HSTS max-age to at least 31536000 (1 year) to ensure long-term HTTPS enforcement.",
        value: hstsHeader,
      });
    } else {
      findings.push({
        id: "hsts-valid",
        severity: "info",
        title: "HSTS properly configured",
        description:
          `HSTS is set with max-age=${maxAge} (${Math.floor(maxAge / 86400)} days).`,
        recommendation: "No action needed. HSTS max-age meets the recommended minimum.",
        value: hstsHeader,
      });
    }

    if (!hasIncludeSubDomains) {
      deductions += 3;
      findings.push({
        id: "hsts-no-include-subdomains",
        severity: "low",
        title: "HSTS missing includeSubDomains directive",
        description:
          "The HSTS header does not include the includeSubDomains directive. Subdomains may still be accessed over insecure HTTP.",
        recommendation:
          "Add includeSubDomains to the HSTS header to enforce HTTPS on all subdomains.",
        value: hstsHeader,
      });
    }

    if (hasPreload) {
      findings.push({
        id: "hsts-preload-directive",
        severity: "info",
        title: "HSTS preload directive present",
        description:
          "The HSTS header includes the preload directive, indicating intent to be added to browser preload lists.",
        recommendation: "Ensure the domain is submitted to hstspreload.org for inclusion.",
        value: hstsHeader,
      });
    }
  }

  // --- Deprecated security headers (Check 5) ---
  const hpkpHeader = httpsResponse.headers.get("Public-Key-Pins");
  if (hpkpHeader) {
    findings.push({
      id: "hpkp-deprecated",
      severity: "medium",
      title: "Deprecated Public-Key-Pins header detected",
      description:
        "The Public-Key-Pins (HPKP) header is present but has been deprecated by all major browsers due to the risk of bricking sites. It should be removed.",
      recommendation:
        "Remove the Public-Key-Pins header. Use Certificate Transparency and CAA DNS records instead.",
      value: hpkpHeader.substring(0, 200),
    });
  }

  const expectCtHeader = httpsResponse.headers.get("Expect-CT");
  if (expectCtHeader) {
    findings.push({
      id: "expect-ct-deprecated",
      severity: "info",
      title: "Deprecated Expect-CT header detected",
      description:
        "The Expect-CT header is present but is no longer needed as Certificate Transparency is now enforced by default in all major browsers.",
      recommendation:
        "The Expect-CT header can be safely removed as CT is universally enforced.",
      value: expectCtHeader.substring(0, 200),
    });
  }

  // --- Mixed Content Check (Check 6) ---
  // Only scan HTML responses for mixed content
  const contentType = httpsResponse.headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    try {
      const htmlBody = await httpsResponse.text();
      // Limit scan to first 200KB to avoid memory issues on large pages
      const scanBody = htmlBody.substring(0, 200_000);

      // Patterns that indicate active mixed content (scripts, stylesheets, iframes)
      const activeMixedPattern =
        /(?:<script[^>]+src\s*=\s*["']http:\/\/)|(?:<link[^>]+href\s*=\s*["']http:\/\/[^"']*(?:\.css|stylesheet))|(?:<iframe[^>]+src\s*=\s*["']http:\/\/)/gi;
      const activeMixedMatches = scanBody.match(activeMixedPattern);

      // Patterns that indicate passive mixed content (images, audio, video)
      const passiveMixedPattern =
        /(?:<img[^>]+src\s*=\s*["']http:\/\/)|(?:<audio[^>]+src\s*=\s*["']http:\/\/)|(?:<video[^>]+src\s*=\s*["']http:\/\/)|(?:<source[^>]+src\s*=\s*["']http:\/\/)/gi;
      const passiveMixedMatches = scanBody.match(passiveMixedPattern);

      if (activeMixedMatches && activeMixedMatches.length > 0) {
        deductions += 5;
        findings.push({
          id: "mixed-content-active",
          severity: "medium",
          title: "Active mixed content detected",
          description:
            `Found ${activeMixedMatches.length} active mixed content reference(s) (scripts, stylesheets, or iframes loaded over HTTP on an HTTPS page). Browsers will block these resources.`,
          recommendation:
            "Update all script, stylesheet, and iframe references to use HTTPS URLs or protocol-relative URLs.",
          value: `${activeMixedMatches.length} active mixed content reference(s)`,
        });
      }

      if (passiveMixedMatches && passiveMixedMatches.length > 0) {
        // Passive mixed content is less severe; browsers show warnings but usually still load
        findings.push({
          id: "mixed-content-passive",
          severity: "low",
          title: "Passive mixed content detected",
          description:
            `Found ${passiveMixedMatches.length} passive mixed content reference(s) (images, audio, or video loaded over HTTP). Browsers may show security warnings.`,
          recommendation:
            "Update all media resource references to use HTTPS URLs.",
          value: `${passiveMixedMatches.length} passive mixed content reference(s)`,
        });
      }

      if (
        (!activeMixedMatches || activeMixedMatches.length === 0) &&
        (!passiveMixedMatches || passiveMixedMatches.length === 0)
      ) {
        findings.push({
          id: "no-mixed-content",
          severity: "info",
          title: "No mixed content detected",
          description:
            "No HTTP resources were found referenced in the page HTML.",
          recommendation: "No action needed.",
        });
      }
    } catch {
      // If we can't read the body (e.g., already consumed), skip mixed content check
      findings.push({
        id: "mixed-content-skipped",
        severity: "info",
        title: "Mixed content check skipped",
        description: "Could not read the page body for mixed content analysis.",
        recommendation: "No action needed.",
      });
    }
  }

  return { findings, deductions, httpsResponse };
}

// ---------------------------------------------------------------------------
// Check 2b: HTTP -> HTTPS Redirect
// ---------------------------------------------------------------------------

interface RedirectCheckResult {
  findings: Finding[];
  deductions: number;
}

async function checkHttpRedirect(domain: string): Promise<RedirectCheckResult> {
  const findings: Finding[] = [];
  let deductions = 0;

  const httpUrl = `http://${domain}`;
  const response = await safeFetch(httpUrl, {
    timeoutMs: 10_000,
    redirect: "manual",
  });

  if (!response) {
    findings.push({
      id: "http-redirect-check-failed",
      severity: "info",
      title: "HTTP redirect check inconclusive",
      description:
        "Could not connect to the HTTP version of this site. Port 80 may be closed or the server is unreachable over HTTP.",
      recommendation:
        "Ensure HTTP requests on port 80 redirect to HTTPS, or that port 80 is intentionally closed.",
    });
    return { findings, deductions };
  }

  const location = response.headers.get("Location");
  const status = response.status;
  const isRedirectStatus = [301, 302, 307, 308].includes(status);

  if (isRedirectStatus && location && location.startsWith("https://")) {
    findings.push({
      id: "http-redirects-to-https",
      severity: "info",
      title: "HTTP properly redirects to HTTPS",
      description:
        `HTTP requests are redirected to HTTPS with a ${status} status code.`,
      recommendation: "No action needed. HTTP to HTTPS redirect is correctly configured.",
      value: `${status} -> ${location}`,
    });
  } else {
    deductions += 15;
    findings.push({
      id: "http-no-https-redirect",
      severity: "high",
      title: "HTTP does not redirect to HTTPS",
      description:
        `The HTTP version of ${domain} does not redirect to HTTPS (status: ${status}). Users who visit via HTTP will not be upgraded to a secure connection.`,
      recommendation:
        "Configure your server to redirect all HTTP requests to HTTPS with a 301 permanent redirect.",
      value: `HTTP status: ${status}${location ? `, Location: ${location}` : ""}`,
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 4: HSTS Preload Status
// ---------------------------------------------------------------------------

interface PreloadCheckResult {
  findings: Finding[];
  deductions: number;
}

async function checkHstsPreload(domain: string): Promise<PreloadCheckResult> {
  const findings: Finding[] = [];
  let deductions = 0;

  const response = await safeFetch(
    `https://hstspreload.org/api/v2/status?domain=${encodeURIComponent(domain)}`,
    { timeoutMs: 5_000 },
  );

  if (!response || !response.ok) {
    findings.push({
      id: "hsts-preload-check-failed",
      severity: "info",
      title: "HSTS preload check unavailable",
      description:
        "Could not query the HSTS preload list status. This check was skipped.",
      recommendation: "No action needed. You can check manually at hstspreload.org.",
    });
    return { findings, deductions };
  }

  try {
    const data = await response.json();
    const status = data.status;

    if (status === "preloaded") {
      findings.push({
        id: "hsts-preloaded",
        severity: "info",
        title: "Domain is HSTS preloaded",
        description:
          `${domain} is included in the HSTS browser preload list. Browsers will always use HTTPS for this domain, even on first visit.`,
        recommendation: "No action needed. HSTS preload is the strongest HTTPS enforcement.",
        value: "preloaded",
      });
    } else if (status === "pending") {
      findings.push({
        id: "hsts-preload-pending",
        severity: "info",
        title: "HSTS preload submission pending",
        description:
          `${domain} has been submitted to the HSTS preload list and is pending inclusion.`,
        recommendation:
          "No action needed. Your domain will be included in upcoming browser releases.",
        value: "pending",
      });
    } else {
      deductions += 3;
      findings.push({
        id: "hsts-not-preloaded",
        severity: "low",
        title: "Domain not in HSTS preload list",
        description:
          `${domain} is not in the HSTS browser preload list. Without preloading, the first visit to your site could still be over HTTP before the HSTS header is received.`,
        recommendation:
          "Submit your domain to hstspreload.org for inclusion. Requires HSTS with max-age >= 31536000, includeSubDomains, and preload directives.",
        value: status || "unknown",
      });
    }
  } catch {
    findings.push({
      id: "hsts-preload-parse-error",
      severity: "info",
      title: "HSTS preload response could not be parsed",
      description: "The hstspreload.org API returned data that could not be parsed.",
      recommendation: "No action needed. Check manually at hstspreload.org.",
    });
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Check 7: TLS Version via SSL Labs Cached Data
// ---------------------------------------------------------------------------

interface TlsVersionCheckResult {
  findings: Finding[];
  deductions: number;
}

async function checkTlsVersion(domain: string): Promise<TlsVersionCheckResult> {
  const findings: Finding[] = [];
  let deductions = 0;

  // First try to get cached assessment from SSL Labs (fast — no new scan)
  const assessResponse = await safeFetch(
    `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&fromCache=on&maxAge=72`,
    { timeoutMs: 8_000 },
  );

  if (!assessResponse || !assessResponse.ok) {
    findings.push({
      id: "ssllabs-unavailable",
      severity: "info",
      title: "SSL Labs cached data unavailable",
      description:
        "Could not retrieve cached SSL Labs data. TLS version check was skipped.",
      recommendation:
        "Run a manual scan at ssllabs.com/ssltest for comprehensive TLS analysis.",
    });
    return { findings, deductions };
  }

  let assessData: any;
  try {
    assessData = await assessResponse.json();
  } catch {
    findings.push({
      id: "ssllabs-parse-error",
      severity: "info",
      title: "SSL Labs response could not be parsed",
      description: "The SSL Labs API returned data that could not be parsed.",
      recommendation:
        "Run a manual scan at ssllabs.com/ssltest for comprehensive TLS analysis.",
    });
    return { findings, deductions };
  }

  // If no cached data is available, SSL Labs returns status "DNS" or "IN_PROGRESS"
  // We only want fully resolved cached results
  if (assessData.status !== "READY" || !assessData.endpoints || assessData.endpoints.length === 0) {
    findings.push({
      id: "ssllabs-no-cache",
      severity: "info",
      title: "No cached SSL Labs results available",
      description:
        `SSL Labs has no recent cached scan for ${domain}. A new scan was not initiated to stay within timeout.`,
      recommendation:
        "Visit ssllabs.com/ssltest to run a full TLS analysis (takes 1-2 minutes).",
    });
    return { findings, deductions };
  }

  // Process the first endpoint (primary IP)
  const endpoint = assessData.endpoints[0];

  // Report the grade if available
  if (endpoint.grade) {
    const gradeColors: Record<string, Finding["severity"]> = {
      "A+": "info",
      "A": "info",
      "A-": "info",
      "B": "low",
      "C": "medium",
      "D": "high",
      "E": "high",
      "F": "critical",
      "T": "critical",
      "M": "critical",
    };

    const severity = gradeColors[endpoint.grade] || "medium";
    findings.push({
      id: "ssllabs-grade",
      severity,
      title: `SSL Labs grade: ${endpoint.grade}`,
      description:
        `SSL Labs rates this server's TLS configuration as grade ${endpoint.grade}.${endpoint.gradeTrustIgnored ? ` (Grade if trust issues ignored: ${endpoint.gradeTrustIgnored})` : ""}`,
      recommendation:
        severity === "info"
          ? "No action needed. Your TLS configuration has a strong grade."
          : "Improve your TLS configuration. Disable legacy protocols, use strong cipher suites, and ensure certificate chain is valid.",
      value: endpoint.grade,
    });
  }

  // If we have detailed endpoint data, try to get it
  if (endpoint.ipAddress) {
    const detailResponse = await safeFetch(
      `https://api.ssllabs.com/api/v3/getEndpointData?host=${encodeURIComponent(domain)}&s=${encodeURIComponent(endpoint.ipAddress)}&fromCache=on`,
      { timeoutMs: 8_000 },
    );

    if (detailResponse && detailResponse.ok) {
      let detailData: any;
      try {
        detailData = await detailResponse.json();
      } catch {
        // Can't parse detail data, skip
      }

      if (detailData?.details) {
        const details = detailData.details;

        // Check protocol support
        if (details.protocols && Array.isArray(details.protocols)) {
          const protocolNames = details.protocols.map(
            (p: any) => `${p.name} ${p.version}`,
          );

          const hasSSL3 = details.protocols.some(
            (p: any) => p.name === "SSL" && p.version === "3.0",
          );
          const hasTLS10 = details.protocols.some(
            (p: any) => p.name === "TLS" && p.version === "1.0",
          );
          const hasTLS11 = details.protocols.some(
            (p: any) => p.name === "TLS" && p.version === "1.1",
          );
          const hasTLS12 = details.protocols.some(
            (p: any) => p.name === "TLS" && p.version === "1.2",
          );
          const hasTLS13 = details.protocols.some(
            (p: any) => p.name === "TLS" && p.version === "1.3",
          );

          if (hasSSL3) {
            deductions += 25;
            findings.push({
              id: "tls-ssl3-supported",
              severity: "critical",
              title: "SSL 3.0 is supported (POODLE vulnerable)",
              description:
                "The server supports SSL 3.0 which is fundamentally broken and vulnerable to the POODLE attack. All major browsers have disabled SSL 3.0.",
              recommendation:
                "Disable SSL 3.0 immediately. Only TLS 1.2 and TLS 1.3 should be enabled.",
              value: protocolNames.join(", "),
            });
          }

          if (hasTLS10) {
            deductions += 15;
            findings.push({
              id: "tls-10-supported",
              severity: "high",
              title: "TLS 1.0 is still supported",
              description:
                "The server supports TLS 1.0 which has known vulnerabilities (BEAST, CRIME) and has been deprecated by IETF (RFC 8996). PCI DSS requires TLS 1.0 to be disabled.",
              recommendation:
                "Disable TLS 1.0. Configure your server to support only TLS 1.2 and TLS 1.3.",
              value: protocolNames.join(", "),
            });
          }

          if (hasTLS11) {
            deductions += 15;
            findings.push({
              id: "tls-11-supported",
              severity: "high",
              title: "TLS 1.1 is still supported",
              description:
                "The server supports TLS 1.1 which has been deprecated by IETF (RFC 8996) and all major browsers.",
              recommendation:
                "Disable TLS 1.1. Configure your server to support only TLS 1.2 and TLS 1.3.",
              value: protocolNames.join(", "),
            });
          }

          if (hasTLS13) {
            findings.push({
              id: "tls-13-supported",
              severity: "info",
              title: "TLS 1.3 is supported",
              description:
                "The server supports TLS 1.3, the latest and most secure version of the TLS protocol.",
              recommendation: "No action needed. TLS 1.3 support is excellent.",
              value: protocolNames.join(", "),
            });
          } else if (hasTLS12) {
            findings.push({
              id: "tls-12-only",
              severity: "info",
              title: "TLS 1.2 supported, TLS 1.3 not detected",
              description:
                "The server supports TLS 1.2 but not TLS 1.3. TLS 1.2 is still considered secure but TLS 1.3 offers improved performance and security.",
              recommendation:
                "Consider enabling TLS 1.3 for improved performance (0-RTT) and security.",
              value: protocolNames.join(", "),
            });
          }
        }

        // Check for weak cipher suites
        if (details.suites && Array.isArray(details.suites)) {
          const weakCiphers: string[] = [];
          for (const suite of details.suites) {
            if (suite.list && Array.isArray(suite.list)) {
              for (const cipher of suite.list) {
                const cipherName = (cipher.name || "").toUpperCase();
                // Flag known weak ciphers
                if (
                  cipherName.includes("RC4") ||
                  cipherName.includes("DES") ||
                  cipherName.includes("3DES") ||
                  cipherName.includes("NULL") ||
                  cipherName.includes("EXPORT") ||
                  cipherName.includes("ANON")
                ) {
                  weakCiphers.push(cipher.name);
                }
              }
            }
          }

          if (weakCiphers.length > 0) {
            deductions += 10;
            findings.push({
              id: "tls-weak-ciphers",
              severity: "high",
              title: "Weak cipher suites detected",
              description:
                `${weakCiphers.length} weak cipher suite(s) are supported: ${weakCiphers.slice(0, 5).join(", ")}${weakCiphers.length > 5 ? ` and ${weakCiphers.length - 5} more` : ""}. These ciphers have known vulnerabilities.`,
              recommendation:
                "Disable weak cipher suites (RC4, DES, 3DES, NULL, EXPORT, anonymous). Use only modern AEAD ciphers like AES-GCM and ChaCha20-Poly1305.",
              value: weakCiphers.slice(0, 10).join(", "),
            });
          }
        }

        // Check for forward secrecy
        if (details.forwardSecrecy !== undefined) {
          // SSL Labs: 0 = no, 1 = some (not with reference browsers), 2 = with modern, 4 = with all
          if (details.forwardSecrecy === 0) {
            deductions += 10;
            findings.push({
              id: "tls-no-forward-secrecy",
              severity: "high",
              title: "Forward secrecy not supported",
              description:
                "The server does not support forward secrecy. If the server's private key is compromised, all past communication can be decrypted.",
              recommendation:
                "Enable cipher suites that support forward secrecy (ECDHE or DHE key exchange).",
            });
          } else if (details.forwardSecrecy >= 2) {
            findings.push({
              id: "tls-forward-secrecy",
              severity: "info",
              title: "Forward secrecy supported",
              description:
                "The server supports forward secrecy with modern browsers, protecting past sessions from future key compromise.",
              recommendation: "No action needed.",
            });
          }
        }
      }
    }
  }

  return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  if (!validateScannerAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const validation = validateTargetUrl(body.targetUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const targetUrl = validation.url!;
    const domain = extractDomain(targetUrl);

    // Run all checks in parallel for speed
    const [certResult, httpsResult, redirectResult, preloadResult, tlsResult] =
      await Promise.allSettled([
        checkCertificateTransparency(domain),
        probeHttps(domain),
        checkHttpRedirect(domain),
        checkHstsPreload(domain),
        checkTlsVersion(domain),
      ]);

    // Aggregate findings and deductions
    const allFindings: Finding[] = [];
    let totalDeductions = 0;
    let checksRun = 0;

    const results = [
      { name: "Certificate Transparency", result: certResult },
      { name: "HTTPS Probe", result: httpsResult },
      { name: "HTTP Redirect", result: redirectResult },
      { name: "HSTS Preload", result: preloadResult },
      { name: "TLS Version", result: tlsResult },
    ];

    for (const { name, result } of results) {
      checksRun++;
      if (result.status === "fulfilled") {
        allFindings.push(...result.value.findings);
        totalDeductions += result.value.deductions;
      } else {
        console.error(`${name} check failed:`, result.reason);
        allFindings.push({
          id: `check-failed-${name.toLowerCase().replace(/\s+/g, "-")}`,
          severity: "info",
          title: `${name} check failed`,
          description: `The ${name} check encountered an error and was skipped.`,
          recommendation: "No action needed. This may be a temporary issue.",
        });
      }
    }

    const score = Math.max(0, Math.min(100, 100 - totalDeductions));

    return new Response(
      JSON.stringify({
        scannerType: "ssl_tls",
        score,
        findings: allFindings,
        checksRun,
        scannedAt: new Date().toISOString(),
        url: targetUrl,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Scanner error:", error);
    return new Response(
      JSON.stringify({
        scannerType: "ssl_tls",
        score: 0,
        error: "Scan failed. Please try again.",
        findings: [],
        checksRun: 0,
        scannedAt: new Date().toISOString(),
        url: "",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
