import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Open Redirect Scanner
 * Detects open redirect vulnerabilities by:
 * 1. Testing common redirect parameter names with malicious URLs
 * 2. Testing common redirect path endpoints
 * 3. Detecting meta refresh and JavaScript-based client-side redirects
 *
 * Safety rules:
 * - Non-destructive, read-only scanning
 * - Uses redirect: 'manual' to inspect Location headers without following
 * - Never loads or follows malicious redirect targets
 * - 5-second timeout per probe request
 * - Max ~30 probes total, batched with rate limiting
 * - Only uses https://evil.example.com as test domain (IANA-reserved, safe)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVIL_DOMAIN = 'evil.example.com';
const EVIL_URL = `https://${EVIL_DOMAIN}`;
const USER_AGENT = 'CheckVibe-RedirectScanner/1.0';
const PROBE_TIMEOUT_MS = 5000;
const BATCH_SIZE = 5;
const DELAY_BETWEEN_PROBES_MS = 100;

const REDIRECT_PARAMS = [
    'redirect', 'redirect_uri', 'redirect_url', 'redirectUrl', 'redirectUri',
    'next', 'url', 'return', 'return_to', 'returnTo', 'returnUrl',
    'continue', 'dest', 'destination', 'goto', 'target',
    'rurl', 'redir', 'callback', 'forward', 'forward_url',
    'success_url', 'error_url', 'cancel_url',
];

const REDIRECT_PATHS = [
    '/redirect?url=https://evil.example.com',
    '/redirect?to=https://evil.example.com',
    '/goto?url=https://evil.example.com',
    '/oauth/authorize?redirect_uri=https://evil.example.com',
    '/login?next=https://evil.example.com',
    '/login?return_to=https://evil.example.com',
    '/auth/callback?redirect=https://evil.example.com',
    '/out?url=https://evil.example.com',
    '/external?url=https://evil.example.com',
    '/link?url=https://evil.example.com',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface ProbeResult {
    status: number;
    location: string;
    body: string;
}

interface RedirectVulnerability {
    endpoint: string;
    method: string;
    severity: 'critical' | 'high' | 'medium';
    penalty: number;
    title: string;
    description: string;
    evidence: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL with redirect: 'manual' to inspect the Location header
 * without following the redirect. Returns status, location, and body.
 */
async function fetchManual(url: string, timeout = PROBE_TIMEOUT_MS): Promise<ProbeResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT },
        });
        const location = res.headers.get('location') || '';
        // Only read body for 200 responses (for meta refresh / JS redirect detection)
        const body = res.status === 200 ? await res.text() : '';
        return { status: res.status, location, body };
    } catch {
        return { status: 0, location: '', body: '' };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Simple non-cryptographic hash for comparing response bodies.
 * Used to detect SPA catch-all routes that return the same content for any path.
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 2000); i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

/**
 * Check if a Location header value points to the evil domain.
 */
function locationContainsEvil(location: string): boolean {
    if (!location) return false;
    try {
        // Try to parse as absolute URL
        const parsed = new URL(location, 'https://placeholder.invalid');
        return parsed.hostname === EVIL_DOMAIN || parsed.hostname.endsWith(`.${EVIL_DOMAIN}`);
    } catch {
        // Fallback: string-based check
        return location.toLowerCase().includes(EVIL_DOMAIN);
    }
}

/**
 * Check if an HTTP status code is a redirect.
 */
function isRedirectStatus(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * Check response body for meta refresh or JavaScript redirects to the evil domain.
 */
function detectClientSideRedirect(body: string): { found: boolean; type: string; evidence: string } {
    if (!body) return { found: false, type: '', evidence: '' };

    const bodyLower = body.toLowerCase();

    // Meta refresh detection: <meta http-equiv="refresh" content="0;url=https://evil.example.com">
    const metaRefreshRegex = /<meta\s[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^"']*url\s*=\s*[^"']*evil\.example\.com[^"']*["'][^>]*>/i;
    const metaRefreshAlt = /<meta\s[^>]*content\s*=\s*["'][^"']*url\s*=\s*[^"']*evil\.example\.com[^"']*["'][^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/i;

    if (metaRefreshRegex.test(body) || metaRefreshAlt.test(body)) {
        const match = body.match(/<meta[^>]*refresh[^>]*>/i);
        return {
            found: true,
            type: 'meta_refresh',
            evidence: match ? match[0].substring(0, 200) : 'Meta refresh redirect detected',
        };
    }

    // JavaScript redirect detection
    const jsRedirectPatterns = [
        /window\.location\s*=\s*["'][^"']*evil\.example\.com[^"']*["']/i,
        /window\.location\.href\s*=\s*["'][^"']*evil\.example\.com[^"']*["']/i,
        /window\.location\.replace\s*\(\s*["'][^"']*evil\.example\.com[^"']*["']\s*\)/i,
        /document\.location\s*=\s*["'][^"']*evil\.example\.com[^"']*["']/i,
        /document\.location\.href\s*=\s*["'][^"']*evil\.example\.com[^"']*["']/i,
        /document\.location\.replace\s*\(\s*["'][^"']*evil\.example\.com[^"']*["']\s*\)/i,
        /location\.assign\s*\(\s*["'][^"']*evil\.example\.com[^"']*["']\s*\)/i,
    ];

    for (const pattern of jsRedirectPatterns) {
        const match = body.match(pattern);
        if (match) {
            return {
                found: true,
                type: 'javascript',
                evidence: match[0].substring(0, 200),
            };
        }
    }

    return { found: false, type: '', evidence: '' };
}

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run an array of async functions in batches with a delay between batches.
 */
async function runInBatches<T>(
    tasks: Array<() => Promise<T>>,
    batchSize: number,
    delayMs: number,
): Promise<Array<PromiseSettledResult<T>>> {
    const results: Array<PromiseSettledResult<T>> = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(fn => fn()));
        results.push(...batchResults);

        // Add delay between batches (not after the last batch)
        if (i + batchSize < tasks.length) {
            await sleep(delayMs);
        }
    }

    return results;
}

/**
 * Truncate a string for safe evidence display.
 */
function truncateEvidence(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

// ---------------------------------------------------------------------------
// Detection Methods
// ---------------------------------------------------------------------------

/**
 * Method 1: Parameter-Based Redirect Testing
 *
 * Tests common redirect parameter names on the target origin's /login path
 * with various bypass techniques. Also tests any existing redirect parameters
 * found in the target URL.
 */
async function testParameterRedirects(
    targetUrl: string,
): Promise<{ vulnerabilities: RedirectVulnerability[]; checksRun: number }> {
    const vulnerabilities: RedirectVulnerability[] = [];
    let checksRun = 0;

    const parsed = new URL(targetUrl);
    const targetOrigin = parsed.origin;
    const targetDomain = parsed.hostname;

    // Build bypass variants for testing
    function getBypassPayloads(targetDomain: string): Array<{ payload: string; label: string }> {
        return [
            { payload: EVIL_URL, label: 'direct URL' },
            { payload: `//${EVIL_DOMAIN}`, label: 'protocol-relative' },
            { payload: `/\\${EVIL_DOMAIN}`, label: 'backslash trick' },
            { payload: `${EVIL_URL}%23.${targetDomain}`, label: 'fragment injection' },
            { payload: `${EVIL_URL}?.${targetDomain}`, label: 'query-based bypass' },
        ];
    }

    const bypassPayloads = getBypassPayloads(targetDomain);

    // Collect all params to test: REDIRECT_PARAMS on /login + any existing redirect params in the URL
    const existingRedirectParams: Array<{ param: string; basePath: string }> = [];

    // Check if the target URL has any query params matching REDIRECT_PARAMS
    for (const [key] of parsed.searchParams) {
        if (REDIRECT_PARAMS.includes(key.toLowerCase()) || REDIRECT_PARAMS.includes(key)) {
            existingRedirectParams.push({
                param: key,
                basePath: parsed.origin + parsed.pathname,
            });
        }
    }

    // Build probe tasks: each param gets tested with the direct payload first,
    // then bypass variants if the direct payload shows a redirect.
    // To stay within ~30 probes total, we limit parameter testing.
    const tasks: Array<() => Promise<void>> = [];

    // Test existing redirect params with all bypass variants
    for (const { param, basePath } of existingRedirectParams) {
        for (const { payload, label } of bypassPayloads) {
            tasks.push(async () => {
                checksRun++;
                const testUrl = `${basePath}?${encodeURIComponent(param)}=${encodeURIComponent(payload)}`;
                const result = await fetchManual(testUrl);

                if (isRedirectStatus(result.status) && locationContainsEvil(result.location)) {
                    vulnerabilities.push({
                        endpoint: testUrl,
                        method: label,
                        severity: 'critical',
                        penalty: -25,
                        title: `Open redirect via existing parameter "${param}" (${label})`,
                        description: `The parameter "${param}" in the target URL redirects to an external domain when set to a malicious URL using the ${label} technique. Status: ${result.status}.`,
                        evidence: `Location: ${truncateEvidence(result.location)}`,
                    });
                } else if (result.status === 200) {
                    // Check for client-side redirects
                    const clientRedirect = detectClientSideRedirect(result.body);
                    if (clientRedirect.found) {
                        vulnerabilities.push({
                            endpoint: testUrl,
                            method: `${label} (${clientRedirect.type})`,
                            severity: 'medium',
                            penalty: -15,
                            title: `Client-side redirect via existing parameter "${param}" (${clientRedirect.type})`,
                            description: `The parameter "${param}" triggers a ${clientRedirect.type} redirect to an external domain using the ${label} technique.`,
                            evidence: truncateEvidence(clientRedirect.evidence),
                        });
                    }
                }
            });
        }
    }

    // Test REDIRECT_PARAMS on /login path with direct payload only (to save probes)
    // We test each param with the direct evil URL first; bypass variants are skipped
    // unless we find a redirect (to keep total probes manageable).
    const paramsToTest = REDIRECT_PARAMS.slice(0, 15); // Cap at 15 params
    for (const param of paramsToTest) {
        // Skip if this param was already tested as an existing param
        if (existingRedirectParams.some(e => e.param === param)) continue;

        tasks.push(async () => {
            checksRun++;
            const testUrl = `${targetOrigin}/login?${param}=${encodeURIComponent(EVIL_URL)}`;
            const result = await fetchManual(testUrl);

            if (isRedirectStatus(result.status) && locationContainsEvil(result.location)) {
                vulnerabilities.push({
                    endpoint: testUrl,
                    method: 'direct URL',
                    severity: 'critical',
                    penalty: -25,
                    title: `Open redirect via parameter "${param}"`,
                    description: `The parameter "${param}" on /login redirects to an external domain. An attacker can craft a phishing link like ${targetOrigin}/login?${param}=https://evil-site.com to redirect users after login. Status: ${result.status}.`,
                    evidence: `Location: ${truncateEvidence(result.location)}`,
                });

                // If direct URL works, also test bypass variants
                for (const { payload, label } of bypassPayloads.slice(1)) {
                    checksRun++;
                    const bypassUrl = `${targetOrigin}/login?${param}=${encodeURIComponent(payload)}`;
                    const bypassResult = await fetchManual(bypassUrl);
                    if (isRedirectStatus(bypassResult.status) && locationContainsEvil(bypassResult.location)) {
                        vulnerabilities.push({
                            endpoint: bypassUrl,
                            method: label,
                            severity: 'critical',
                            penalty: -25,
                            title: `Open redirect via parameter "${param}" (${label} bypass)`,
                            description: `The parameter "${param}" is also vulnerable to the ${label} bypass technique, indicating the redirect validation can be circumvented. Status: ${bypassResult.status}.`,
                            evidence: `Location: ${truncateEvidence(bypassResult.location)}`,
                        });
                    }
                }
            } else if (result.status === 200) {
                const clientRedirect = detectClientSideRedirect(result.body);
                if (clientRedirect.found) {
                    vulnerabilities.push({
                        endpoint: testUrl,
                        method: `direct URL (${clientRedirect.type})`,
                        severity: 'medium',
                        penalty: -15,
                        title: `Client-side redirect via parameter "${param}" (${clientRedirect.type})`,
                        description: `The parameter "${param}" on /login triggers a ${clientRedirect.type} redirect to an external domain.`,
                        evidence: truncateEvidence(clientRedirect.evidence),
                    });
                }
            }
        });
    }

    // Limit total tasks to ~30
    const limitedTasks = tasks.slice(0, 30);
    await runInBatches(limitedTasks, BATCH_SIZE, DELAY_BETWEEN_PROBES_MS);

    return { vulnerabilities, checksRun };
}

/**
 * Method 2: Path-Based Redirect Testing
 *
 * Tests common redirect endpoint paths on the target origin.
 * Uses SPA detection to skip paths that are just catch-all routes.
 */
async function testPathRedirects(
    targetUrl: string,
): Promise<{ vulnerabilities: RedirectVulnerability[]; checksRun: number }> {
    const vulnerabilities: RedirectVulnerability[] = [];
    let checksRun = 0;

    const parsed = new URL(targetUrl);
    const targetOrigin = parsed.origin;

    // SPA Detection: fetch a random nonexistent path to fingerprint 404 behavior
    checksRun++;
    const randomPath = `/__checkvibe_nonexistent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const notFoundResult = await fetchManual(`${targetOrigin}${randomPath}`);
    const notFoundFingerprint = {
        status: notFoundResult.status,
        bodyHash: simpleHash(notFoundResult.body),
    };

    const tasks: Array<() => Promise<void>> = [];

    for (const path of REDIRECT_PATHS) {
        tasks.push(async () => {
            checksRun++;
            const testUrl = `${targetOrigin}${path}`;
            const result = await fetchManual(testUrl);

            // SPA detection: if this response matches the 404 fingerprint, skip it
            if (
                result.status === notFoundFingerprint.status &&
                result.status === 200 &&
                simpleHash(result.body) === notFoundFingerprint.bodyHash
            ) {
                return; // SPA catch-all, not a real endpoint
            }

            // Check for HTTP redirect to evil domain
            if (isRedirectStatus(result.status) && locationContainsEvil(result.location)) {
                vulnerabilities.push({
                    endpoint: testUrl,
                    method: 'path-based',
                    severity: 'high',
                    penalty: -20,
                    title: `Open redirect via path endpoint`,
                    description: `The endpoint ${path.split('?')[0]} accepts a redirect parameter and redirects to an external domain. Status: ${result.status}.`,
                    evidence: `URL: ${testUrl} -> Location: ${truncateEvidence(result.location)}`,
                });
            }

            // Check for client-side redirects on 200 responses
            if (result.status === 200) {
                const clientRedirect = detectClientSideRedirect(result.body);
                if (clientRedirect.found) {
                    vulnerabilities.push({
                        endpoint: testUrl,
                        method: `path-based (${clientRedirect.type})`,
                        severity: 'medium',
                        penalty: -15,
                        title: `Client-side redirect via path endpoint (${clientRedirect.type})`,
                        description: `The endpoint ${path.split('?')[0]} triggers a ${clientRedirect.type} redirect to an external domain.`,
                        evidence: truncateEvidence(clientRedirect.evidence),
                    });
                }
            }
        });
    }

    await runInBatches(tasks, BATCH_SIZE, DELAY_BETWEEN_PROBES_MS);

    return { vulnerabilities, checksRun };
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Deduplicates vulnerabilities by endpoint (base path + param name).
 * If the same endpoint is vulnerable to multiple bypass variants,
 * only keep the one with the highest severity (largest penalty).
 */
function deduplicateVulnerabilities(vulns: RedirectVulnerability[]): RedirectVulnerability[] {
    const grouped = new Map<string, RedirectVulnerability>();

    for (const vuln of vulns) {
        // Normalize the endpoint to its base form for grouping
        // e.g., "/login?redirect=..." regardless of payload variant
        let endpointKey: string;
        try {
            const parsed = new URL(vuln.endpoint);
            // Group by path + first param name
            const paramName = parsed.searchParams.keys().next().value || '';
            endpointKey = `${parsed.pathname}:${paramName}`;
        } catch {
            endpointKey = vuln.endpoint;
        }

        const existing = grouped.get(endpointKey);
        if (!existing || Math.abs(vuln.penalty) > Math.abs(existing.penalty)) {
            grouped.set(endpointKey, vuln);
        }
    }

    return Array.from(grouped.values());
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
        const targetUrl = validation.url!;

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // -----------------------------------------------------------------
        // Verify the target is reachable before running probes
        // -----------------------------------------------------------------
        try {
            const reachCheck = await fetchManual(targetUrl, 10000);
            checksRun++;

            if (reachCheck.status === 0) {
                return new Response(JSON.stringify({
                    scannerType: 'open_redirect',
                    score: 0,
                    checksRun: 1,
                    findings: [{
                        id: 'redirect-fetch-failed',
                        severity: 'info',
                        title: 'Unable to Reach Target',
                        description: `Could not connect to ${targetUrl}. The site may be unreachable, blocking automated requests, or experiencing downtime.`,
                        recommendation: 'Verify the URL is correct and the site is accessible.',
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }), {
                    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                });
            }
        } catch {
            return new Response(JSON.stringify({
                scannerType: 'open_redirect',
                score: 0,
                checksRun: 1,
                findings: [{
                    id: 'redirect-fetch-failed',
                    severity: 'info',
                    title: 'Unable to Reach Target',
                    description: `Could not connect to ${targetUrl}. The site may be unreachable or blocking automated requests.`,
                    recommendation: 'Verify the URL is correct and the site is accessible.',
                }],
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // -----------------------------------------------------------------
        // Run all detection methods
        // -----------------------------------------------------------------
        const allVulnerabilities: RedirectVulnerability[] = [];

        // Method 1: Parameter-based redirect testing
        const paramResults = await testParameterRedirects(targetUrl);
        allVulnerabilities.push(...paramResults.vulnerabilities);
        checksRun += paramResults.checksRun;

        // Method 2: Path-based redirect testing
        const pathResults = await testPathRedirects(targetUrl);
        allVulnerabilities.push(...pathResults.vulnerabilities);
        checksRun += pathResults.checksRun;

        // Note: Method 3 (meta refresh & JS redirect detection) is integrated
        // into Methods 1 and 2 — any 200 response is checked for client-side redirects.

        // -----------------------------------------------------------------
        // Deduplicate and convert vulnerabilities to findings
        // -----------------------------------------------------------------
        const deduped = deduplicateVulnerabilities(allVulnerabilities);

        for (let i = 0; i < deduped.length; i++) {
            const vuln = deduped[i];
            findings.push({
                id: `redirect-${vuln.method.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${i}`,
                severity: vuln.severity,
                title: vuln.title,
                description: vuln.description,
                recommendation: 'Validate redirect targets against a strict allowlist of permitted domains. Never redirect to user-supplied URLs without verification. Use relative paths for internal redirects. Avoid passing full URLs as redirect parameters — use path-only values and reconstruct the full URL server-side.',
                evidence: vuln.evidence,
            });

            score += vuln.penalty; // penalty is negative
        }

        // -----------------------------------------------------------------
        // If no vulnerabilities found, add informational finding
        // -----------------------------------------------------------------
        if (deduped.length === 0) {
            findings.push({
                id: 'redirect-none-found',
                severity: 'info',
                title: 'No Open Redirects Detected',
                description: `No open redirect vulnerabilities were found on ${targetUrl}. The scanner tested ${checksRun} endpoints including common redirect parameters, path-based redirects, and client-side redirect patterns. This does not guarantee the absence of open redirects — other endpoints or authenticated routes may still be vulnerable.`,
                recommendation: 'Continue to validate redirect targets against allowlists. Regularly audit new endpoints that accept URL parameters.',
            });
        }

        // -----------------------------------------------------------------
        // Return results
        // -----------------------------------------------------------------
        return new Response(JSON.stringify({
            scannerType: 'open_redirect',
            score: Math.max(0, Math.min(100, score)),
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'open_redirect',
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
