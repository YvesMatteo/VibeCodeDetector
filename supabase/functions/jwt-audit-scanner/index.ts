import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    checksRun: number;
    scannedAt: string;
    url: string;
}

function base64urlEncode(source: BufferSource): string {
    let binary = '';
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function hmacSha256(secret: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC', key, encoder.encode(data)
    );
    return base64urlEncode(signature);
}

// Extract JWTs found in the "cookies" array passed from the Playwright renderer
function extractJWTs(cookies: any[], html: string): string[] {
    const jwts = new Set<string>();
    const jwtRegex = /(eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]*)/g;

    // Check cookies
    for (const cookie of cookies) {
        if (typeof cookie === 'string') {
            const matches = cookie.match(jwtRegex);
            if (matches) matches.forEach(m => jwts.add(m));
        } else if (cookie && cookie.value) {
            const matches = cookie.value.match(jwtRegex);
            if (matches) matches.forEach((m: string) => jwts.add(m));
        }
    }

    // Check raw HTML (for hardcoded tokens or localstorage initial state)
    if (html) {
        const matches = html.match(jwtRegex);
        if (matches) matches.forEach(m => jwts.add(m));
    }

    return Array.from(jwts);
}

Deno.serve(async (req: Request) => {
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
        const cookies = body.interceptedCookies || [];
        const html = body.renderedHtml || '';

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        checksRun++;
        const jwts = extractJWTs(cookies, html);

        if (jwts.length === 0) {
            findings.push({
                id: 'no-jwt-found',
                severity: 'info',
                title: 'No JWTs Detected',
                description: 'No JSON Web Tokens were found in cookies or page source.',
                recommendation: 'No action needed.'
            });
        }

        const COMMON_SECRETS = ['secret', 'password', '123456', 'test', 'admin', 'admin123', 'root', 'changeme', 'jwtsecret'];

        for (const token of jwts) {
            checksRun++;
            const parts = token.split('.');
            if (parts.length !== 3) continue;

            let headerObj: any;
            let payloadObj: any;

            try {
                // btoa/atob require base64 (not base64url) padding
                const toBase64 = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');
                headerObj = JSON.parse(atob(toBase64(parts[0])));
                payloadObj = JSON.parse(atob(toBase64(parts[1])));
            } catch {
                continue; // Not a valid JWT or we couldn't parse it
            }

            const alg = (headerObj.alg || '').toLowerCase();

            // 1. None Algorithm Check
            if (alg === 'none') {
                findings.push({
                    id: 'jwt-alg-none',
                    severity: 'critical',
                    title: 'JWT Accepts "none" Algorithm',
                    description: 'A JWT was found specifying the "none" algorithm. If the server accepts this token without validating a signature, attackers can forge admin tokens.',
                    recommendation: 'Ensure your JWT library explicitly requires a strong algorithm (e.g., HS256, RS256) and rejects tokens with alg: "none".',
                    evidence: `Payload suggests: ${JSON.stringify(payloadObj)}`
                });
                score -= 35;
            }

            // 2. Weak Secret Cracking (HS256 only)
            if (alg === 'hs256' && parts[2]) {
                const dataToSign = `${parts[0]}.${parts[1]}`;
                let foundSecret = null;
                for (const secret of COMMON_SECRETS) {
                    const signature = await hmacSha256(secret, dataToSign);
                    if (signature === parts[2]) {
                        foundSecret = secret;
                        break;
                    }
                }

                if (foundSecret) {
                    findings.push({
                        id: 'jwt-weak-secret',
                        severity: 'critical',
                        title: 'JWT Uses Weak Secret Key',
                        description: `A JWT was signed using a trivially guessable secret key ("${foundSecret}").Attackers can forge valid tokens for any user.`,
                        recommendation: 'Rotate your JWT signing key immediately. Use a long, random, cryptographically secure string (at least 32 bytes/256 bits).',
                        evidence: `Token: ${token.substring(0, 20)}...`
                    });
                    score -= 40;
                }
            }
        }

        score = Math.max(0, Math.min(100, score));

        return new Response(JSON.stringify({
            scannerType: 'jwt_audit',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        } satisfies ScanResult), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('JWT scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'jwt_audit',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: '',
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
        );
    }
});
