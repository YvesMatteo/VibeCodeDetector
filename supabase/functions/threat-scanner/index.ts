import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Environment variables
const GOOGLE_SAFE_BROWSING_KEY = Deno.env.get("GOOGLE_SAFE_BROWSING_API_KEY");
const VIRUSTOTAL_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const SHODAN_KEY = Deno.env.get("SHODAN_API_KEY");
const URLSCAN_KEY = Deno.env.get("URLSCAN_API_KEY");

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        const { targetUrl } = await req.json();

        if (!targetUrl) {
            throw new Error("targetUrl is required");
        }

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

        // 3. Shodan (Domain/IP check)
        if (SHODAN_KEY) {
            checksRun++;
            checks.push(checkShodan(targetUrl, SHODAN_KEY).then(res => {
                if (res.ports && res.ports.length > 0) {
                    // Open ports aren't necessarily bad, but unexpected ones are
                    const riskyPorts = [21, 23, 3389, 5900]; // FTP, Telnet, RDP, VNC
                    const foundRisky = res.ports.filter((p: number) => riskyPorts.includes(p));

                    if (foundRisky.length > 0) {
                        score -= 20;
                        findings.push({
                            title: "Risky Open Ports Detected",
                            severity: "high",
                            description: `Open ports detected: ${foundRisky.join(', ')}`,
                            recommendation: "Close unnecessary ports and ensure exposed services are secured."
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

        await Promise.all(checks);

        // If no threat APIs are configured, note this transparently
        if (checksRun === 0) {
            findings.push({
                title: "No Threat APIs Configured",
                severity: "info",
                description: "No external threat intelligence APIs are configured. Score is based on the absence of detected threats, but no active checks were performed.",
                recommendation: "Configure Google Safe Browsing, VirusTotal, Shodan, or URLScan API keys for comprehensive threat analysis."
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
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({
            scannerType: 'threat-intelligence',
            error: errorMessage,
            score: 0,
            findings: []
        }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});

async function checkSafeBrowsing(url: string, key: string) {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

async function checkShodan(url: string, key: string) {
    try {
        const domain = new URL(url).hostname;
        // Resolve IP first (Shodan works best with IPs)
        // In Deno Deploy/Edge, we might not have direct DNS resolution easily without params
        // defaulting to a simple host search for now
        const response = await fetch(`https://api.shodan.io/shodan/host/${domain}?key=${key}`);
        if (!response.ok) return {};
        const data = await response.json();
        return { ports: data.ports || [] };
    } catch {
        return {};
    }
}

async function checkUrlScan(url: string, key: string) {
    try {
        const response = await fetch(`https://urlscan.io/api/v1/search/?q=page.url:"${url}"`, {
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
