import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * DNS & Email Security Scanner
 * Analyzes domain DNS configuration for email authentication,
 * certificate authority authorization, DNSSEC, and subdomain takeover risks.
 *
 * Checks:
 * 1. SPF record validation
 * 2. DMARC policy analysis
 * 3. DKIM selector probing
 * 4. MX record inspection
 * 5. CAA record presence
 * 6. DNSSEC validation
 * 7. Subdomain takeover detection via CT logs + dangling CNAMEs
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    value?: string;
}

interface DnsAnswer {
    name: string;
    type: number;
    TTL: number;
    data: string;
}

interface DnsResponse {
    Status: number; // 0 = NOERROR, 3 = NXDOMAIN
    TC?: boolean;
    RD?: boolean;
    RA?: boolean;
    AD?: boolean; // Authenticated Data (DNSSEC)
    CD?: boolean;
    Answer?: DnsAnswer[];
    Authority?: DnsAnswer[];
    Comment?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DNS_TIMEOUT_MS = 8000;
const CT_LOG_TIMEOUT_MS = 10000;
const MAX_SUBDOMAINS_TO_CHECK = 15;
const MAX_TAKEOVER_FINDINGS = 3;

const DKIM_SELECTORS = [
    'default._domainkey',
    'google._domainkey',
    'selector1._domainkey',
    'selector2._domainkey',
    'k1._domainkey',
    'mail._domainkey',
    'dkim._domainkey',
    's1._domainkey',
    's2._domainkey',
];

const KNOWN_EMAIL_PROVIDERS: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\.google\.com\.?$/i, name: 'Google Workspace' },
    { pattern: /\.googlemail\.com\.?$/i, name: 'Google Workspace' },
    { pattern: /\.outlook\.com\.?$/i, name: 'Microsoft 365' },
    { pattern: /\.microsoft\.com\.?$/i, name: 'Microsoft 365' },
    { pattern: /\.protonmail\.ch\.?$/i, name: 'ProtonMail' },
    { pattern: /\.mimecast\.com\.?$/i, name: 'Mimecast' },
    { pattern: /\.pphosted\.com\.?$/i, name: 'Proofpoint' },
];

const TAKEOVER_VULNERABLE_PATTERNS: RegExp[] = [
    /\.herokuapp\.com\.?$/i,
    /\.s3\.amazonaws\.com\.?$/i,
    /\.cloudfront\.net\.?$/i,
    /\.azurewebsites\.net\.?$/i,
    /\.trafficmanager\.net\.?$/i,
    /\.blob\.core\.windows\.net\.?$/i,
    /\.cloudapp\.net\.?$/i,
    /\.github\.io\.?$/i,
    /\.netlify\.app\.?$/i,
    /\.vercel\.app\.?$/i,
    /\.surge\.sh\.?$/i,
    /\.bitbucket\.io\.?$/i,
    /\.ghost\.io\.?$/i,
    /\.readme\.io\.?$/i,
    /\.fly\.dev\.?$/i,
];

// ---------------------------------------------------------------------------
// DNS Lookup via Google DNS-over-HTTPS
// ---------------------------------------------------------------------------

async function dnsLookup(name: string, type: string): Promise<DnsResponse> {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/dns-json' },
            signal: controller.signal,
        });
        return await res.json() as DnsResponse;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * DNSSEC-aware lookup: sets the DO (DNSSEC OK) flag so the resolver
 * returns the AD (Authenticated Data) bit when validation passes.
 */
async function dnsLookupDnssec(name: string, type: string): Promise<DnsResponse> {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&do=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/dns-json' },
            signal: controller.signal,
        });
        return await res.json() as DnsResponse;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Extract the registrable domain from a hostname.
 * e.g. "www.sub.example.co.uk" -> "example.co.uk" (simplified heuristic)
 * For most cases: take last two labels, or last three if the second-to-last is short (co, com, org, etc. under a ccTLD).
 */
function extractDomain(hostname: string): string {
    // Remove trailing dot if present
    const h = hostname.replace(/\.$/, '').toLowerCase();
    const parts = h.split('.');
    if (parts.length <= 2) return h;

    // Simple heuristic for two-part TLDs like co.uk, com.au, etc.
    const twoPartTlds = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'co.jp', 'co.kr', 'co.in', 'org.uk', 'net.au', 'ac.uk'];
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTlds.includes(lastTwo) && parts.length >= 3) {
        return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
}

// ---------------------------------------------------------------------------
// Check 1: SPF Record
// ---------------------------------------------------------------------------

async function checkSpf(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        const response = await dnsLookup(domain, 'TXT');
        const txtRecords = (response.Answer || [])
            .filter(a => a.type === 16) // TXT record type
            .map(a => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, '')); // Strip quotes and join split strings

        const spfRecord = txtRecords.find(r => r.toLowerCase().startsWith('v=spf1'));

        if (!spfRecord) {
            deduction = 15;
            findings.push({
                id: 'dns-spf-missing',
                severity: 'high',
                title: 'No SPF record found',
                description: 'No SPF (Sender Policy Framework) record was found for this domain. Without SPF, any server can send email pretending to be from this domain, enabling phishing and spoofing attacks.',
                recommendation: 'Add a TXT record with an SPF policy. A basic starting point: v=spf1 include:_spf.google.com ~all (adjust for your email provider).',
            });
        } else {
            const spfLower = spfRecord.toLowerCase();

            if (spfLower.includes('+all')) {
                deduction = 10;
                findings.push({
                    id: 'dns-spf-plus-all',
                    severity: 'high',
                    title: 'SPF allows all senders (+all)',
                    description: 'The SPF record uses "+all" which explicitly allows any server to send email on behalf of this domain. This completely defeats the purpose of SPF and enables unrestricted email spoofing.',
                    recommendation: 'Replace "+all" with "-all" (hard fail) or "~all" (soft fail) to restrict which servers can send email for your domain.',
                    value: spfRecord,
                });
            } else if (spfLower.includes('~all')) {
                deduction = 3;
                findings.push({
                    id: 'dns-spf-softfail',
                    severity: 'low',
                    title: 'SPF uses softfail (~all)',
                    description: 'The SPF record uses "~all" (softfail), which means unauthorized senders are flagged but not necessarily rejected. While this is common during SPF rollout, a strict "-all" policy provides stronger protection.',
                    recommendation: 'Once you have verified all legitimate sending sources are included, upgrade to "-all" for strict enforcement.',
                    value: spfRecord,
                });
            } else if (spfLower.includes('-all') || spfLower.includes('redirect=')) {
                // Strict SPF or delegated — pass
                findings.push({
                    id: 'dns-spf-pass',
                    severity: 'info',
                    title: 'SPF record configured',
                    description: spfLower.includes('-all')
                        ? 'SPF record is configured with a strict "-all" policy, which rejects email from unauthorized senders.'
                        : 'SPF record delegates policy via a redirect mechanism.',
                    recommendation: 'No action needed. Continue monitoring SPF alignment in DMARC reports.',
                    value: spfRecord,
                });
            }

            // Check for too many DNS lookups (include, a, mx, ptr, exists, redirect count toward 10-lookup limit)
            const lookupMechanisms = spfLower.match(/\b(include:|a:|mx:|ptr:|exists:|redirect=)/gi) || [];
            if (lookupMechanisms.length > 10) {
                deduction += 5;
                findings.push({
                    id: 'dns-spf-too-many-lookups',
                    severity: 'medium',
                    title: 'SPF record exceeds 10 DNS lookup limit',
                    description: `The SPF record contains ${lookupMechanisms.length} DNS lookup mechanisms, exceeding the RFC 7208 limit of 10. Receiving mail servers may return a permanent error (permerror) and reject email.`,
                    recommendation: 'Flatten the SPF record by replacing nested includes with direct IP ranges, or use an SPF flattening service.',
                    value: spfRecord,
                });
            }
        }
    } catch (err) {
        findings.push({
            id: 'dns-spf-error',
            severity: 'info',
            title: 'SPF check failed',
            description: `Could not query SPF records: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 2: DMARC Record
// ---------------------------------------------------------------------------

async function checkDmarc(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        const response = await dnsLookup(`_dmarc.${domain}`, 'TXT');
        const txtRecords = (response.Answer || [])
            .filter(a => a.type === 16)
            .map(a => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''));

        const dmarcRecord = txtRecords.find(r => r.toLowerCase().startsWith('v=dmarc1'));

        if (!dmarcRecord) {
            deduction = 15;
            findings.push({
                id: 'dns-dmarc-missing',
                severity: 'high',
                title: 'No DMARC record found',
                description: 'No DMARC (Domain-based Message Authentication, Reporting and Conformance) record was found. Without DMARC, there is no policy telling receiving servers how to handle emails that fail SPF or DKIM checks, leaving the domain vulnerable to spoofing.',
                recommendation: 'Add a TXT record at _dmarc.yourdomain.com. Start with: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com to monitor, then escalate to p=quarantine or p=reject.',
            });
        } else {
            const dmarcLower = dmarcRecord.toLowerCase();

            // Extract policy
            const policyMatch = dmarcLower.match(/;\s*p\s*=\s*(\w+)/);
            const policy = policyMatch ? policyMatch[1] : 'none';

            if (policy === 'none') {
                deduction = 5;
                findings.push({
                    id: 'dns-dmarc-policy-none',
                    severity: 'medium',
                    title: "DMARC policy is 'none' (monitoring only)",
                    description: 'The DMARC policy is set to "none", meaning failed authentication is reported but email is still delivered. This is useful for initial monitoring but does not prevent spoofing.',
                    recommendation: 'After reviewing DMARC aggregate reports and confirming legitimate senders pass checks, upgrade to p=quarantine or p=reject.',
                    value: dmarcRecord,
                });
            } else if (policy === 'quarantine') {
                deduction = 2;
                findings.push({
                    id: 'dns-dmarc-policy-quarantine',
                    severity: 'low',
                    title: "DMARC policy is 'quarantine'",
                    description: 'The DMARC policy is set to "quarantine", which flags or spam-folders emails that fail authentication. This is good but "reject" provides stronger protection.',
                    recommendation: 'Consider upgrading to p=reject once you are confident all legitimate email passes SPF and DKIM.',
                    value: dmarcRecord,
                });
            } else if (policy === 'reject') {
                findings.push({
                    id: 'dns-dmarc-policy-reject',
                    severity: 'info',
                    title: "DMARC policy is 'reject' (strict enforcement)",
                    description: 'The DMARC policy is set to "reject", which instructs receiving servers to reject emails that fail authentication. This is the strongest anti-spoofing configuration.',
                    recommendation: 'No action needed. Continue monitoring DMARC reports for legitimate mail that may be affected.',
                    value: dmarcRecord,
                });
            }

            // Check for reporting URI
            if (!dmarcLower.includes('rua=')) {
                deduction += 2;
                findings.push({
                    id: 'dns-dmarc-no-rua',
                    severity: 'low',
                    title: 'No DMARC aggregate reporting configured',
                    description: 'The DMARC record does not include a rua= tag for aggregate reports. Without reporting, you have no visibility into who is sending email using your domain.',
                    recommendation: 'Add rua=mailto:dmarc-reports@yourdomain.com to receive daily aggregate reports from receiving mail servers.',
                    value: dmarcRecord,
                });
            }
        }
    } catch (err) {
        findings.push({
            id: 'dns-dmarc-error',
            severity: 'info',
            title: 'DMARC check failed',
            description: `Could not query DMARC records: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 3: DKIM Records
// ---------------------------------------------------------------------------

async function checkDkim(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        const foundSelectors: string[] = [];

        // Query all DKIM selectors in parallel
        const results = await Promise.allSettled(
            DKIM_SELECTORS.map(async (selector) => {
                const fqdn = `${selector}.${domain}`;
                const response = await dnsLookup(fqdn, 'TXT');
                const txtRecords = (response.Answer || [])
                    .filter(a => a.type === 16 || a.type === 5) // TXT or CNAME
                    .map(a => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''));

                const hasDkim = txtRecords.some(r => {
                    const lower = r.toLowerCase();
                    return lower.includes('v=dkim1') || lower.includes('k=rsa') || lower.includes('k=ed25519');
                });

                // Also check if there's a CNAME pointing to a DKIM key (common with hosted email)
                const hasCname = (response.Answer || []).some(a => a.type === 5);

                if (hasDkim || hasCname) {
                    return selector.replace('._domainkey', '');
                }
                return null;
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                foundSelectors.push(result.value);
            }
        }

        if (foundSelectors.length > 0) {
            findings.push({
                id: 'dns-dkim-found',
                severity: 'info',
                title: 'DKIM records found',
                description: `DKIM (DomainKeys Identified Mail) records were found for selector(s): ${foundSelectors.join(', ')}. DKIM cryptographically signs outgoing email to prove it originated from your domain and has not been tampered with.`,
                recommendation: 'No action needed. Ensure DKIM signing is active on all outbound mail servers.',
                value: foundSelectors.join(', '),
            });
        } else {
            deduction = 8;
            findings.push({
                id: 'dns-dkim-not-found',
                severity: 'medium',
                title: 'No DKIM records found for common selectors',
                description: `No DKIM records were found for any of the commonly used selectors (${DKIM_SELECTORS.map(s => s.replace('._domainkey', '')).join(', ')}). DKIM selector names vary by provider, so your domain may still have DKIM configured under a custom selector name.`,
                recommendation: 'Verify with your email provider that DKIM signing is enabled. Check your provider documentation for the correct selector name and ensure a corresponding DNS TXT record exists.',
            });
        }
    } catch (err) {
        findings.push({
            id: 'dns-dkim-error',
            severity: 'info',
            title: 'DKIM check failed',
            description: `Could not query DKIM records: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 4: MX Records
// ---------------------------------------------------------------------------

async function checkMx(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    const deduction = 0; // MX findings are informational only

    try {
        const response = await dnsLookup(domain, 'MX');
        const mxRecords = (response.Answer || [])
            .filter(a => a.type === 15) // MX record type
            .map(a => {
                // MX data format: "priority mailserver"
                const parts = a.data.split(/\s+/);
                const priority = parseInt(parts[0]) || 0;
                const server = (parts[1] || a.data).toLowerCase().replace(/\.$/, '');
                return { priority, server };
            })
            .sort((a, b) => a.priority - b.priority);

        if (mxRecords.length === 0) {
            findings.push({
                id: 'dns-mx-missing',
                severity: 'info',
                title: 'No MX records found',
                description: 'This domain does not have any MX (Mail Exchange) records configured. The domain may not be set up to receive email, or it may use an A record fallback for mail delivery.',
                recommendation: 'If this domain should receive email, configure MX records pointing to your mail server(s).',
            });
        } else {
            const serverList = mxRecords.map(r => `${r.server} (priority ${r.priority})`).join(', ');

            // Identify known providers
            const providers = new Set<string>();
            for (const mx of mxRecords) {
                for (const { pattern, name } of KNOWN_EMAIL_PROVIDERS) {
                    if (pattern.test(mx.server)) {
                        providers.add(name);
                    }
                }
            }

            if (providers.size > 0) {
                findings.push({
                    id: 'dns-mx-known-provider',
                    severity: 'info',
                    title: `MX records point to ${[...providers].join(', ')}`,
                    description: `Mail is handled by ${[...providers].join(' and ')}, which ${providers.size === 1 ? 'is a' : 'are'} well-known email provider(s) with built-in security features (TLS, spam filtering, anti-phishing).`,
                    recommendation: 'No action needed. Ensure your provider configuration (SPF, DKIM, DMARC) is aligned with your MX records.',
                    value: serverList,
                });
            } else {
                findings.push({
                    id: 'dns-mx-present',
                    severity: 'info',
                    title: 'MX records configured',
                    description: `The domain has ${mxRecords.length} MX record(s) for mail delivery.`,
                    recommendation: 'Ensure your mail servers support TLS encryption and that SPF, DKIM, and DMARC records are aligned with these servers.',
                    value: serverList,
                });
            }
        }
    } catch (err) {
        findings.push({
            id: 'dns-mx-error',
            severity: 'info',
            title: 'MX check failed',
            description: `Could not query MX records: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 5: CAA Records
// ---------------------------------------------------------------------------

async function checkCaa(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        // Google DNS uses type 257 for CAA records
        const response = await dnsLookup(domain, 'CAA');

        // CAA record type number is 257
        const caaRecords = (response.Answer || [])
            .filter(a => a.type === 257)
            .map(a => a.data);

        // Also try with type number directly if no results
        let finalCaaRecords = caaRecords;
        if (finalCaaRecords.length === 0) {
            const response2 = await dnsLookup(domain, '257');
            finalCaaRecords = (response2.Answer || [])
                .filter(a => a.type === 257)
                .map(a => a.data);
        }

        if (finalCaaRecords.length === 0) {
            deduction = 3;
            findings.push({
                id: 'dns-caa-missing',
                severity: 'low',
                title: 'No CAA records found',
                description: 'No CAA (Certificate Authority Authorization) records were found. Without CAA, any Certificate Authority can issue TLS certificates for this domain, increasing the risk of unauthorized certificate issuance.',
                recommendation: 'Add CAA records to restrict which Certificate Authorities can issue certificates. Example: 0 issue "letsencrypt.org" to only allow Let\'s Encrypt.',
            });
        } else {
            const caList = finalCaaRecords.join('; ');
            findings.push({
                id: 'dns-caa-present',
                severity: 'info',
                title: 'CAA records configured',
                description: 'CAA records restrict which Certificate Authorities can issue TLS certificates for this domain, reducing the risk of unauthorized certificate issuance.',
                recommendation: 'No action needed. Periodically review your CAA records to ensure they include all CAs you use.',
                value: caList,
            });
        }
    } catch (err) {
        findings.push({
            id: 'dns-caa-error',
            severity: 'info',
            title: 'CAA check failed',
            description: `Could not query CAA records: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 6: DNSSEC Validation
// ---------------------------------------------------------------------------

async function checkDnssec(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        const response = await dnsLookupDnssec(domain, 'A');

        if (response.AD === true) {
            findings.push({
                id: 'dns-dnssec-valid',
                severity: 'info',
                title: 'DNSSEC validated',
                description: 'DNSSEC (Domain Name System Security Extensions) is enabled and validated for this domain. DNSSEC provides cryptographic authentication of DNS responses, preventing DNS spoofing and cache poisoning attacks.',
                recommendation: 'No action needed. DNSSEC is properly configured.',
            });
        } else {
            deduction = 3;
            findings.push({
                id: 'dns-dnssec-not-enabled',
                severity: 'low',
                title: 'DNSSEC not enabled',
                description: 'DNSSEC is not enabled or not validated for this domain. Without DNSSEC, DNS responses can be spoofed by attackers (DNS cache poisoning), potentially redirecting users to malicious servers.',
                recommendation: 'Enable DNSSEC through your domain registrar or DNS hosting provider. Most modern registrars support one-click DNSSEC activation.',
            });
        }
    } catch (err) {
        findings.push({
            id: 'dns-dnssec-error',
            severity: 'info',
            title: 'DNSSEC check failed',
            description: `Could not verify DNSSEC: ${err instanceof Error ? err.message : 'DNS lookup timeout or error'}.`,
            recommendation: 'Retry the scan. If the issue persists, verify the domain has valid DNS configuration.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Check 7: Subdomain Takeover Detection via CT Logs
// ---------------------------------------------------------------------------

async function checkSubdomainTakeover(domain: string): Promise<{ findings: Finding[]; deduction: number }> {
    const findings: Finding[] = [];
    let deduction = 0;

    try {
        // Fetch certificate transparency logs from crt.sh
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CT_LOG_TIMEOUT_MS);

        let ctResponse: Response;
        try {
            ctResponse = await fetch(
                `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json&limit=50`,
                {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'CheckVibe-Scanner/2.0' },
                    signal: controller.signal,
                }
            );
        } finally {
            clearTimeout(timeout);
        }

        if (!ctResponse.ok) {
            findings.push({
                id: 'dns-ct-fetch-failed',
                severity: 'info',
                title: 'Certificate transparency log query failed',
                description: `crt.sh returned HTTP ${ctResponse.status}. Subdomain takeover check was skipped.`,
                recommendation: 'This is typically a transient error. Retry the scan later.',
            });
            return { findings, deduction };
        }

        const ctData = await ctResponse.json() as Array<{ common_name?: string; name_value?: string }>;

        // Extract unique subdomains
        const subdomains = new Set<string>();
        for (const entry of ctData) {
            const names = [entry.common_name, entry.name_value].filter(Boolean) as string[];
            for (const name of names) {
                // name_value can contain newline-separated names
                const parts = name.split('\n');
                for (const part of parts) {
                    const cleaned = part.trim().toLowerCase().replace(/^\*\./, '');
                    // Only include subdomains of the target domain, not the domain itself
                    if (
                        cleaned.endsWith(`.${domain}`) &&
                        cleaned !== domain &&
                        !cleaned.includes('*') &&
                        cleaned.length < 253
                    ) {
                        subdomains.add(cleaned);
                    }
                }
            }
        }

        if (subdomains.size === 0) {
            findings.push({
                id: 'dns-ct-no-subdomains',
                severity: 'info',
                title: 'No subdomains found in certificate transparency logs',
                description: 'No subdomains were discovered via certificate transparency logs. This limits the subdomain takeover check.',
                recommendation: 'No action needed. Consider a dedicated subdomain enumeration tool for more comprehensive coverage.',
            });
            return { findings, deduction };
        }

        // Check a limited set of subdomains for dangling CNAMEs
        const subdomainList = [...subdomains].slice(0, MAX_SUBDOMAINS_TO_CHECK);
        let takeoverCount = 0;

        const cnameResults = await Promise.allSettled(
            subdomainList.map(async (subdomain) => {
                const cnameResponse = await dnsLookup(subdomain, 'CNAME');
                const cnameRecords = (cnameResponse.Answer || [])
                    .filter(a => a.type === 5) // CNAME type
                    .map(a => a.data.toLowerCase().replace(/\.$/, ''));

                return { subdomain, cnameRecords };
            })
        );

        for (const result of cnameResults) {
            if (result.status !== 'fulfilled') continue;
            if (takeoverCount >= MAX_TAKEOVER_FINDINGS) break;

            const { subdomain, cnameRecords } = result.value;

            for (const cname of cnameRecords) {
                if (takeoverCount >= MAX_TAKEOVER_FINDINGS) break;

                // Check if CNAME points to a vulnerable service
                const isVulnerable = TAKEOVER_VULNERABLE_PATTERNS.some(p => p.test(cname));
                if (!isVulnerable) continue;

                // Check if the CNAME target resolves
                try {
                    const targetResolve = await dnsLookup(cname, 'A');
                    if (targetResolve.Status === 3 || (!targetResolve.Answer || targetResolve.Answer.length === 0)) {
                        // NXDOMAIN or no answer — potential takeover
                        deduction += 15;
                        takeoverCount++;
                        findings.push({
                            id: `dns-takeover-${takeoverCount}`,
                            severity: 'high',
                            title: `Potential subdomain takeover: ${subdomain}`,
                            description: `The subdomain "${subdomain}" has a CNAME pointing to "${cname}" which does not resolve (NXDOMAIN). An attacker could claim this resource on the hosting platform and serve malicious content on your subdomain.`,
                            recommendation: `Remove the DNS CNAME record for "${subdomain}" if the service is no longer in use, or reclaim the resource on the hosting platform.`,
                            value: `${subdomain} CNAME ${cname} (unresolved)`,
                        });
                    }
                } catch {
                    // DNS lookup failed for CNAME target — skip, don't flag as takeover
                }
            }
        }

        // Info finding about how many subdomains were checked
        if (takeoverCount === 0) {
            findings.push({
                id: 'dns-takeover-none',
                severity: 'info',
                title: 'No subdomain takeover risks detected',
                description: `Checked ${subdomainList.length} subdomain(s) from certificate transparency logs. No dangling CNAME records pointing to unclaimed external services were found.`,
                recommendation: 'Continue monitoring. Periodically audit DNS records when decommissioning external services.',
                value: `${subdomains.size} unique subdomains found, ${subdomainList.length} checked`,
            });
        }
    } catch (err) {
        // CT log timeout or parse error — skip gracefully
        const message = err instanceof Error ? err.message : 'unknown error';
        const isTimeout = message.includes('abort') || message.includes('timeout');
        findings.push({
            id: 'dns-ct-error',
            severity: 'info',
            title: isTimeout ? 'Certificate transparency log query timed out' : 'Subdomain takeover check failed',
            description: `Could not complete subdomain takeover check: ${message}. This check queries crt.sh which can be slow under load.`,
            recommendation: 'Retry the scan later for subdomain takeover analysis.',
        });
    }

    return { findings, deduction };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }
        const url = validation.url!;

        // Extract domain from the validated URL
        const parsed = new URL(url);
        const domain = extractDomain(parsed.hostname);

        // Run all 7 checks in parallel
        const [spfResult, dmarcResult, dkimResult, mxResult, caaResult, dnssecResult, takeoverResult] =
            await Promise.allSettled([
                checkSpf(domain),
                checkDmarc(domain),
                checkDkim(domain),
                checkMx(domain),
                checkCaa(domain),
                checkDnssec(domain),
                checkSubdomainTakeover(domain),
            ]);

        // Aggregate findings and deductions
        const allFindings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        const results = [spfResult, dmarcResult, dkimResult, mxResult, caaResult, dnssecResult, takeoverResult];
        const checkNames = ['SPF', 'DMARC', 'DKIM', 'MX', 'CAA', 'DNSSEC', 'Subdomain Takeover'];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            checksRun++;

            if (result.status === 'fulfilled') {
                allFindings.push(...result.value.findings);
                score -= result.value.deduction;
            } else {
                // Promise rejected (unexpected) — add error finding
                allFindings.push({
                    id: `dns-check-${i}-failed`,
                    severity: 'info',
                    title: `${checkNames[i]} check encountered an error`,
                    description: `The ${checkNames[i]} check failed unexpectedly: ${result.reason?.message || 'unknown error'}.`,
                    recommendation: 'Retry the scan. If the issue persists, this check may be unavailable.',
                });
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        return new Response(JSON.stringify({
            scannerType: 'dns_email',
            score,
            findings: allFindings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url,
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('DNS Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'dns_email',
            score: 0,
            error: 'Scan failed. Please try again.',
            findings: [],
            checksRun: 0,
        }), {
            status: 500,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }
});
