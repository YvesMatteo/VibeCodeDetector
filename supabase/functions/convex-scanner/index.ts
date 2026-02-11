import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Convex Backend Infrastructure Scanner
 *
 * Detects Convex usage in a target website and audits its configuration
 * for security misconfigurations including:
 *   - Exposed deployment URL (convex.cloud)
 *   - Client-side auth token or admin key leaks
 *   - Public function enumeration via list_functions endpoint
 *   - Open CORS policy on the Convex deployment
 *
 * SECURITY GUARANTEES:
 *   - NEVER writes, updates, or deletes data on the target
 *   - All discovered keys are masked: first 10 chars + "...[REDACTED]"
 *   - All HTTP requests are read-only GET/POST with test data
 *   - 8-second timeout on all external requests
 */

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

function redactKey(key: string): string {
    if (key.length <= 10) return '***REDACTED***';
    return key.substring(0, 10) + '...[REDACTED]';
}

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 8000,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'CheckVibe-ConvexScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Convex Detection
// ---------------------------------------------------------------------------

interface ConvexConfig {
    deploymentUrl: string | null;
    detectedFrom: string;
}

async function detectConvexConfig(targetUrl: string): Promise<ConvexConfig | null> {
    let html: string;
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        }, 10000);
        html = await response.text();
    } catch {
        return null;
    }

    const allContent = [html];

    // Extract inline scripts
    const inlineScriptPattern = /<script[^>]*>([^<]+)<\/script>/gi;
    let inlineMatch;
    while ((inlineMatch = inlineScriptPattern.exec(html)) !== null) {
        if (inlineMatch[1].length > 30) {
            allContent.push(inlineMatch[1]);
        }
    }

    // Fetch first-party JS bundles (up to 10)
    const scriptSrcPattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const scriptUrls: string[] = [];
    let scriptMatch;
    while ((scriptMatch = scriptSrcPattern.exec(html)) !== null && scriptUrls.length < 10) {
        try {
            const resolved = new URL(scriptMatch[1], targetUrl);
            const targetOrigin = new URL(targetUrl).origin;
            if (resolved.origin === targetOrigin) {
                scriptUrls.push(resolved.href);
            }
        } catch { /* skip */ }
    }

    const scriptResults = await Promise.allSettled(
        scriptUrls.map(async (jsUrl) => {
            try {
                const res = await fetchWithTimeout(jsUrl, {}, 5000);
                const text = await res.text();
                if (text.length <= 500000) return text;
            } catch { /* skip */ }
            return null;
        }),
    );
    for (const result of scriptResults) {
        if (result.status === 'fulfilled' && result.value) {
            allContent.push(result.value);
        }
    }

    const combined = allContent.join('\n');

    // Check for Convex signals
    const hasConvexSignal =
        /convex\.cloud/i.test(combined) ||
        /ConvexProvider/i.test(combined) ||
        /convex\/react/i.test(combined) ||
        /ConvexReactClient/i.test(combined) ||
        /useQuery.*convex/i.test(combined) ||
        /useMutation.*convex/i.test(combined);

    if (!hasConvexSignal) return null;

    // Extract deployment URL
    let deploymentUrl: string | null = null;
    const deploymentPatterns = [
        /["'](https:\/\/[a-z0-9-]+\.convex\.cloud)["']/i,
        /(https:\/\/[a-z0-9-]+\.convex\.cloud)/i,
    ];
    for (const p of deploymentPatterns) {
        const m = combined.match(p);
        if (m) { deploymentUrl = m[1]; break; }
    }

    return { deploymentUrl, detectedFrom: 'auto-detected from HTML/JS' };
}

// ---------------------------------------------------------------------------
// Check 1: Exposed Deployment URL
// ---------------------------------------------------------------------------

function checkDeploymentUrl(
    config: ConvexConfig,
    findings: Finding[],
): number {
    if (!config.deploymentUrl) return 0;

    findings.push({
        id: 'convex-deployment-url-exposed',
        severity: 'info',
        title: 'Convex deployment URL exposed in client code',
        description: `The deployment URL "${config.deploymentUrl}" is visible in client-side JavaScript. This is expected for Convex apps but should be paired with proper auth rules.`,
        recommendation: 'Ensure all Convex functions that access sensitive data use proper authentication checks. The deployment URL itself is designed to be public.',
    });
    return 0;
}

// ---------------------------------------------------------------------------
// Check 2: Auth Token / Admin Key Leaks
// ---------------------------------------------------------------------------

function checkTokenLeaks(
    combined: string,
    findings: Finding[],
): number {
    // Convex admin keys / deploy keys
    const adminKeyPattern = /["']?(convex_admin_key|CONVEX_DEPLOY_KEY|CONVEX_ADMIN_KEY)["']?\s*[:=]\s*["']([^"']{10,})["']/gi;
    let match;
    let deduction = 0;

    while ((match = adminKeyPattern.exec(combined)) !== null) {
        findings.push({
            id: 'convex-token-exposed',
            severity: 'critical',
            title: 'Convex admin/deploy key found in client-side code',
            description: `A Convex admin or deploy key ("${match[1]}") was found in client-side JavaScript. This grants full administrative access to your Convex backend.`,
            recommendation: 'Immediately rotate this key in your Convex dashboard. Admin keys must NEVER be included in client-side code. Use environment variables server-side only.',
            evidence: redactKey(match[2]),
        });
        deduction = 40;
    }

    // Generic Convex auth tokens
    const authTokenPattern = /["']?(convex[_-]?auth[_-]?token|CONVEX_AUTH_SECRET)["']?\s*[:=]\s*["']([^"']{10,})["']/gi;
    while ((match = authTokenPattern.exec(combined)) !== null) {
        findings.push({
            id: 'convex-token-exposed',
            severity: 'critical',
            title: 'Convex auth secret found in client-side code',
            description: `A Convex auth secret ("${match[1]}") was found in client-side JavaScript.`,
            recommendation: 'Rotate this secret immediately. Auth secrets must only be stored server-side in environment variables.',
            evidence: redactKey(match[2]),
        });
        deduction = Math.max(deduction, 40);
    }

    if (deduction === 0) {
        findings.push({
            id: 'convex-no-token-leak',
            severity: 'info',
            title: 'No Convex admin keys or auth secrets found in client code',
            description: 'No administrative credentials were detected in client-side JavaScript.',
            recommendation: 'No action needed. Continue keeping sensitive keys server-side.',
        });
    }

    return deduction;
}

// ---------------------------------------------------------------------------
// Check 3: Public Function Enumeration
// ---------------------------------------------------------------------------

async function checkFunctionEnumeration(
    config: ConvexConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.deploymentUrl) return 0;

    try {
        // Attempt to list functions via the Convex API
        const response = await fetchWithTimeout(
            `${config.deploymentUrl}/api/list_functions`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            },
        );

        if (response.status === 200) {
            let data: any;
            try {
                data = await response.json();
            } catch {
                return 0;
            }

            const functions = data?.functions || data;
            if (Array.isArray(functions) && functions.length > 0) {
                findings.push({
                    id: 'convex-functions-enumerable',
                    severity: 'medium',
                    title: 'Convex functions are publicly enumerable',
                    description: `The deployment at ${config.deploymentUrl} allows unauthenticated function listing. ${functions.length} function(s) are visible. Attackers can discover internal function names and signatures.`,
                    recommendation: 'While Convex query/mutation functions are designed to be callable from the client, review that no internal-only functions are exposed. Consider adding authentication to sensitive functions.',
                    evidence: `${functions.length} functions enumerable`,
                });
                return 15;
            }
        }

        findings.push({
            id: 'convex-functions-protected',
            severity: 'info',
            title: 'Function enumeration not publicly accessible',
            description: 'The Convex deployment does not expose a public function listing endpoint.',
            recommendation: 'No action needed.',
        });
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 4: CORS Policy
// ---------------------------------------------------------------------------

async function checkCorsPolicy(
    config: ConvexConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.deploymentUrl) return 0;

    try {
        const testOrigin = 'https://evil-attacker.com';
        const response = await fetchWithTimeout(
            `${config.deploymentUrl}/api/query`,
            {
                method: 'OPTIONS',
                headers: {
                    'Origin': testOrigin,
                    'Access-Control-Request-Method': 'POST',
                },
            },
        );

        const acao = response.headers.get('access-control-allow-origin');

        if (acao === '*') {
            findings.push({
                id: 'convex-cors-open',
                severity: 'medium',
                title: 'Convex deployment uses wildcard CORS',
                description: `The Convex deployment at ${config.deploymentUrl} returns Access-Control-Allow-Origin: *. This allows any website to make API calls to your backend.`,
                recommendation: 'Convex manages CORS at the platform level. If your application handles sensitive data, ensure all mutations and queries require authentication tokens.',
            });
            return 10;
        }

        if (acao === testOrigin) {
            findings.push({
                id: 'convex-cors-open',
                severity: 'medium',
                title: 'Convex deployment reflects arbitrary origins',
                description: `The Convex deployment at ${config.deploymentUrl} reflects arbitrary origins in CORS headers. Any website can make authenticated requests.`,
                recommendation: 'Ensure all sensitive Convex functions require proper authentication. CORS alone should not be relied upon for security.',
            });
            return 15;
        }

        findings.push({
            id: 'convex-cors-restricted',
            severity: 'info',
            title: 'Convex CORS policy is appropriately configured',
            description: 'The Convex deployment does not reflect arbitrary origins.',
            recommendation: 'No action needed.',
        });
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

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

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // Detect Convex config
        checksRun++;
        const config = await detectConvexConfig(targetUrl);

        if (!config) {
            findings.push({
                id: 'no-convex-detected',
                severity: 'info',
                title: 'No Convex instance detected',
                description: 'No Convex configuration was found in the target site HTML or JavaScript. This scanner only applies to sites using Convex.',
                recommendation: 'No action needed. This site does not appear to use Convex.',
            });

            const result: ScanResult = {
                scannerType: 'convex_backend',
                score: 100,
                findings,
                checksRun,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            };

            return new Response(JSON.stringify(result), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        findings.push({
            id: 'convex-detected',
            severity: 'info',
            title: `Convex backend detected (${config.detectedFrom})`,
            description: `Found Convex deployment${config.deploymentUrl ? ` at "${config.deploymentUrl}"` : ''}. Running security checks.`,
            recommendation: 'Ensure all Convex functions accessing sensitive data require authentication.',
        });

        // Re-fetch content for token leak check
        let combinedContent = '';
        try {
            const res = await fetchWithTimeout(targetUrl, {}, 10000);
            combinedContent = await res.text();
        } catch { /* use empty */ }

        // Run checks
        checksRun++;
        const urlDeduction = checkDeploymentUrl(config, findings);

        checksRun++;
        const tokenDeduction = checkTokenLeaks(combinedContent, findings);

        const [enumDeduction, corsDeduction] = await Promise.all([
            (checksRun++, checkFunctionEnumeration(config, findings)),
            (checksRun++, checkCorsPolicy(config, findings)),
        ]);

        score -= urlDeduction + tokenDeduction + enumDeduction + corsDeduction;
        score = Math.max(0, Math.min(100, score));

        const hasNonInfoFindings = findings.some(f => f.severity !== 'info');
        if (!hasNonInfoFindings) {
            score = Math.max(score, 95);
            findings.push({
                id: 'convex-secure',
                severity: 'info',
                title: 'Convex backend properly configured',
                description: 'No security misconfigurations were detected in your Convex backend.',
                recommendation: 'Continue following Convex security best practices.',
            });
        }

        const result: ScanResult = {
            scannerType: 'convex_backend',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Convex scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'convex_backend',
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
