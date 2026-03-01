import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

// Environment variables
const GOOGLE_SAFE_BROWSING_KEY = Deno.env.get("GOOGLE_SAFE_BROWSING_API_KEY");

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

        interface Finding {
            title: string;
            severity: string;
            description: string;
            recommendation: string;
        }

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // Google Safe Browsing check
        if (GOOGLE_SAFE_BROWSING_KEY) {
            checksRun++;
            try {
                const res = await checkSafeBrowsing(targetUrl, GOOGLE_SAFE_BROWSING_KEY);
                if (res.unsafe) {
                    score -= 50;
                    findings.push({
                        title: "Google Safe Browsing Alert",
                        severity: "critical",
                        description: `URL detected as ${res.type} by Google Safe Browsing.`,
                        recommendation: "Immediate investigation required. Site is flagged as dangerous."
                    });
                }
            } catch (e) {
                console.error("Safe Browsing Error:", e);
            }
        }

        // If Google Safe Browsing API key is not configured, note this transparently
        if (checksRun === 0) {
            findings.push({
                title: "No Threat APIs Configured",
                severity: "info",
                description: "Google Safe Browsing API key is not configured. Score is based on the absence of detected threats, but no active checks were performed.",
                recommendation: "Configure the GOOGLE_SAFE_BROWSING_API_KEY environment variable for threat analysis."
            });
        }

        return new Response(JSON.stringify({
            scannerType: 'threat_intelligence',
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
            scannerType: 'threat_intelligence',
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
            client: { clientId: "checkvibe", clientVersion: "1.0.0" },
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
