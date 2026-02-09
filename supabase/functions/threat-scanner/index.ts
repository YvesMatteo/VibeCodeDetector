import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

// Environment variables
const GOOGLE_SAFE_BROWSING_KEY = Deno.env.get("GOOGLE_SAFE_BROWSING_API_KEY");
const VIRUSTOTAL_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const SHODAN_KEY = Deno.env.get("SHODAN_API_KEY");
const URLSCAN_KEY = Deno.env.get("URLSCAN_API_KEY");
const LEAKIX_KEY = Deno.env.get("LEAKIX_API_KEY");

// Port categories for Shodan
const REMOTE_ACCESS_PORTS: Record<number, string> = {
    21: 'FTP',
    23: 'Telnet',
    3389: 'RDP',
    5900: 'VNC',
};

const DATABASE_PORTS: Record<number, string> = {
    3306: 'MySQL',
    5432: 'PostgreSQL',
    27017: 'MongoDB',
    6379: 'Redis',
    9200: 'Elasticsearch',
    5984: 'CouchDB',
    11211: 'Memcached',
    9042: 'Cassandra',
    1433: 'MSSQL',
};

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
        const targetUrl = validation.url!;

        const findings: any[] = [];
        let score = 100;
        let checksRun = 0;

        // Parallelize checks
        const checks = [];

        // 1. Google Safe Browsing
        if (GOOGLE_SAFE_BROWSING_KEY) {
            checksRun++;
            checks.push(checkSafeBrowsing(targetUrl, GOOGLE_SAFE_BROWSING_KEY).then(res => {
                if (res.unsafe) {
                    score -= 50;
                    findings.push({
                        title: "Google Safe Browsing Alert",
                        severity: "critical",
                        description: `URL detected as ${res.type} by Google Safe Browsing.`,
                        recommendation: "Immediate investigation required. Site is flagged as dangerous."
                    });
                }
            }).catch(e => console.error("Safe Browsing Error:", e)));
        }

        // 2. VirusTotal
        if (VIRUSTOTAL_KEY) {
            checksRun++;
            checks.push(checkVirusTotal(targetUrl, VIRUSTOTAL_KEY).then(res => {
                if (res.malicious > 0) {
                    score -= (res.malicious * 10); // Deduct 10 points per engine detection
                    findings.push({
                        title: "VirusTotal Detection",
                        severity: res.malicious > 2 ? "critical" : "high",
                        description: `Flagged as malicious by ${res.malicious} security vendors.`,
                        recommendation: "Check VirusTotal report for specific malware details."
                    });
                }
            }).catch(e => console.error("VirusTotal Error:", e)));
        }

        // 3. Shodan (Domain/IP check) - expanded port detection
        if (SHODAN_KEY) {
            checksRun++;
            checks.push(checkShodan(targetUrl, SHODAN_KEY).then(res => {
                if (res.ports && res.ports.length > 0) {
                    const allRiskyPorts = { ...REMOTE_ACCESS_PORTS, ...DATABASE_PORTS };
                    const foundRemoteAccess = res.ports.filter((p: number) => REMOTE_ACCESS_PORTS[p]);
                    const foundDatabase = res.ports.filter((p: number) => DATABASE_PORTS[p]);

                    if (foundRemoteAccess.length > 0) {
                        score -= 20;
                        const portDetails = foundRemoteAccess.map((p: number) => `${p} (${REMOTE_ACCESS_PORTS[p]})`).join(', ');
                        findings.push({
                            title: "Risky Remote Access Ports Detected",
                            severity: "high",
                            description: `Exposed remote access ports: ${portDetails}. These services allow direct remote control of the server.`,
                            recommendation: "Close unnecessary remote access ports. Use VPN or SSH tunneling instead of exposing these services directly."
                        });
                    }

                    if (foundDatabase.length > 0) {
                        score -= 30;
                        const portDetails = foundDatabase.map((p: number) => `${p} (${DATABASE_PORTS[p]})`).join(', ');
                        findings.push({
                            title: "Exposed Database Ports Detected",
                            severity: "critical",
                            description: `Database ports directly reachable from the internet: ${portDetails}. Attackers can attempt brute-force or exploit known vulnerabilities.`,
                            recommendation: "Never expose database ports to the public internet. Use firewall rules, VPN, or SSH tunneling for database access."
                        });
                    }
                }
            }).catch(e => console.error("Shodan Error:", e)));
        }

        // 4. URLScan
        if (URLSCAN_KEY) {
            checksRun++;
            checks.push(checkUrlScan(targetUrl, URLSCAN_KEY).then(res => {
                if (res.malicious) {
                    score -= 30;
                    findings.push({
                        title: "URLScan Malicious Verdict",
                        severity: "high",
                        description: `URLScan verdict: ${res.verdict || 'malicious'}.`,
                        recommendation: "Review URLScan report."
                    });
                }
            }).catch(e => console.error("URLScan Error:", e)));
        }

        // 5. LeakIX
        if (LEAKIX_KEY) {
            checksRun++;
            checks.push(checkLeakIX(targetUrl, LEAKIX_KEY).then(res => {
                if (res.leaks && res.leaks.length > 0) {
                    // Group leaks by type
                    const leakTypes: Record<string, number> = {};
                    for (const leak of res.leaks) {
                        const type = leak.event_type || leak.type_name || 'unknown';
                        leakTypes[type] = (leakTypes[type] || 0) + 1;
                    }

                    const leakCount = res.leaks.length;
                    const deduction = Math.min(40, leakCount * 15);
                    score -= deduction;

                    const typesSummary = Object.entries(leakTypes)
                        .map(([type, count]) => `${type} (${count})`)
                        .join(', ');

                    findings.push({
                        title: "Known Data Leaks (LeakIX)",
                        severity: leakCount > 2 ? "critical" : "high",
                        description: `LeakIX found ${leakCount} known data leak(s) associated with this domain: ${typesSummary}.`,
                        recommendation: "Investigate each leak immediately. Rotate all exposed credentials, patch vulnerable services, and review access logs for signs of exploitation."
                    });
                }
            }).catch(e => console.error("LeakIX Error:", e)));
        }

        await Promise.all(checks);

        // If no threat APIs are configured, note this transparently
        if (checksRun === 0) {
            findings.push({
                title: "No Threat APIs Configured",
                severity: "info",
                description: "No external threat intelligence APIs are configured. Score is based on the absence of detected threats, but no active checks were performed.",
                recommendation: "Configure Google Safe Browsing, VirusTotal, Shodan, URLScan, or LeakIX API keys for comprehensive threat analysis."
            });
        }

        return new Response(JSON.stringify({
            scannerType: 'threat-intelligence',
            score: Math.max(0, score),
            checksRun,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'threat-intelligence',
            score: 0,
            error: 'Scan failed. Please try again.',
            findings: [],
            metadata: {}
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 500
        });
    }
});

async function checkSafeBrowsing(url: string, key: string) {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
            client: { clientId: "vibe-code", clientVersion: "1.0.0" },
            threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: [{ url }]
            }
        })
    });
    const data = await response.json();
    if (data.matches && data.matches.length > 0) {
        return { unsafe: true, type: data.matches[0].threatType };
    }
    return { unsafe: false };
}

async function checkVirusTotal(url: string, key: string) {
    // VT requires URL to be base64 encoded without padding
    const encodedUrl = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${encodedUrl}`, {
        headers: { 'x-apikey': key }
    });

    if (!response.ok) return { malicious: 0 };

    const data = await response.json();
    return {
        malicious: data.data?.attributes?.last_analysis_stats?.malicious || 0
    };
}

// NOTE: Shodan API only supports query-param auth (?key=). No header alternative exists.
async function checkShodan(url: string, key: string) {
    try {
        const domain = new URL(url).hostname;
        const dnsRes = await fetch(`https://api.shodan.io/dns/resolve?hostnames=${domain}&key=${key}`);
        if (!dnsRes.ok) return {};
        const dnsData = await dnsRes.json();
        const ip = dnsData[domain];
        if (!ip) return {};

        const response = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${key}`);
        if (!response.ok) return {};
        const data = await response.json();
        return { ports: data.ports || [] };
    } catch {
        return {};
    }
}

async function checkUrlScan(url: string, key: string) {
    try {
        const response = await fetch(`https://urlscan.io/api/v1/search/?q=page.url:"${encodeURIComponent(url)}"`, {
            headers: { 'API-Key': key }
        });
        if (!response.ok) return {};
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const latest = data.results[0];
            const malicious = latest.verdicts?.overall?.malicious;
            return { malicious, verdict: malicious ? 'malicious' : 'clean' };
        }
        return {};
    } catch {
        return {};
    }
}

async function checkLeakIX(url: string, key: string) {
    try {
        const domain = new URL(url).hostname;
        const response = await fetch(`https://leakix.net/search?q=domain:${encodeURIComponent(domain)}&scope=leak`, {
            headers: {
                'api-key': key,
                'Accept': 'application/json',
            },
        });
        if (!response.ok) return { leaks: [] };
        const data = await response.json();
        return { leaks: Array.isArray(data) ? data : [] };
    } catch {
        return { leaks: [] };
    }
}
