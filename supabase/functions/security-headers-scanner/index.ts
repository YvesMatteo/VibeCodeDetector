import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Security Headers Scanner
 * Analyzes HTTP response headers for security best practices
 */

const SECURITY_HEADERS = [
    { name: 'Content-Security-Policy', weight: 15, severity: 'medium', description: 'Prevents XSS and injection attacks. Note: many large sites use alternative mitigations like nonce-based scripts or Trusted Types instead of a strict CSP.' },
    { name: 'Strict-Transport-Security', weight: 20, severity: 'high', description: 'Enforces HTTPS connections' },
    { name: 'X-Frame-Options', weight: 10, severity: 'medium', description: 'Prevents clickjacking attacks (superseded by CSP frame-ancestors)' },
    { name: 'X-Content-Type-Options', weight: 10, severity: 'medium', description: 'Prevents MIME-type sniffing' },
    { name: 'Referrer-Policy', weight: 5, severity: 'low', description: 'Controls referrer information' },
    { name: 'Permissions-Policy', weight: 5, severity: 'low', description: 'Controls browser feature access (relatively new header, adoption is still growing)' },
    // X-XSS-Protection intentionally excluded: it's deprecated, modern browsers ignore it,
    // and in some cases it can actually introduce vulnerabilities (Chrome removed it in 2023).
];

const SENSITIVE_COOKIE_NAMES = /session|token|auth|sid|jwt|csrf|password|user/i;
const AUTH_COOKIE_NAMES = /session|token|auth|sid|jwt|csrf/i;

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    value?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    headers: Record<string, string>;
    scannedAt: string;
    url: string;
}

/**
 * Extract all Set-Cookie headers from a Response.
 * Deno's Headers object coalesces multiple Set-Cookie headers,
 * so we iterate all entries to collect each one individually.
 */
function getAllSetCookieHeaders(headers: Headers): string[] {
    const cookies: string[] = [];
    // Try the modern getSetCookie method first (Deno supports this)
    if (typeof (headers as any).getSetCookie === 'function') {
        const result = (headers as any).getSetCookie();
        if (Array.isArray(result)) return result.filter((c: string) => c.length > 0);
    }
    // Fallback: iterate all header entries
    for (const [key, value] of headers.entries()) {
        if (key.toLowerCase() === 'set-cookie') {
            // Headers.entries() may coalesce multiple Set-Cookie into one comma-separated string
            // but cookies can legitimately contain commas in values (e.g. expires dates)
            // so we split carefully on patterns like ", <name>="
            cookies.push(value);
        }
    }
    return cookies;
}

/**
 * Parse a cookie string to extract the name and flags.
 */
function parseCookie(cookieStr: string): { name: string; flags: string } {
    const parts = cookieStr.split(';').map(p => p.trim());
    const nameValue = parts[0] || '';
    const name = nameValue.split('=')[0] || '';
    const flags = cookieStr.toLowerCase();
    return { name, flags };
}

// @ts-ignore
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

        // Fetch headers from target + CORS probe in parallel
        const abortController = new AbortController();
        const corsTimeout = setTimeout(() => abortController.abort(), 5000);
        const mainAbort = new AbortController();
        const mainTimeout = setTimeout(() => mainAbort.abort(), 15000);

        const [response, corsResponse] = await Promise.all([
            fetch(url, {
                method: 'HEAD',
                redirect: 'follow',
                signal: mainAbort.signal,
            }),
            fetch(url, {
                method: 'HEAD',
                redirect: 'follow',
                headers: { 'Origin': 'https://evil.com' },
                signal: abortController.signal,
            }).catch(() => null), // Don't fail scan if CORS probe times out
        ]);

        clearTimeout(corsTimeout);
        clearTimeout(mainTimeout);

        const findings: Finding[] = [];
        let score = 100;
        const headersRecord: Record<string, string> = {};

        // Collect all headers
        response.headers.forEach((value, key) => {
            headersRecord[key.toLowerCase()] = value;
        });

        // Pre-check: does CSP include frame-ancestors? If so, X-Frame-Options is redundant.
        const cspHeader = response.headers.get('Content-Security-Policy');
        const hasFrameAncestors = cspHeader?.toLowerCase().includes('frame-ancestors');

        // Check each security header
        for (const header of SECURITY_HEADERS) {
            const headerValue = response.headers.get(header.name);

            if (!headerValue) {
                // Don't penalize for missing X-Frame-Options if CSP frame-ancestors is set
                if (header.name === 'X-Frame-Options' && hasFrameAncestors) {
                    findings.push({
                        id: `info-${header.name.toLowerCase()}`,
                        severity: 'info',
                        title: `${header.name} not set (covered by CSP)`,
                        description: 'X-Frame-Options is not set, but CSP frame-ancestors directive is present which provides the same protection.',
                        recommendation: 'No action needed — CSP frame-ancestors is the modern replacement.',
                    });
                    continue;
                }

                score -= header.weight;
                findings.push({
                    id: `missing-${header.name.toLowerCase()}`,
                    severity: header.severity as Finding['severity'],
                    title: `Missing ${header.name} header`,
                    description: header.description,
                    recommendation: `Add the ${header.name} header to your server response.`,
                });
            } else {
                // Header exists - check for weak configurations
                if (header.name === 'Strict-Transport-Security') {
                    const maxAge = parseInt(headerValue.match(/max-age=(\d+)/)?.[1] ?? '0');
                    if (maxAge < 31536000) {
                        score -= 5;
                        findings.push({
                            id: 'weak-hsts',
                            severity: 'medium',
                            title: 'Weak HSTS max-age',
                            description: 'HSTS max-age should be at least 1 year (31536000 seconds).',
                            recommendation: 'Set max-age=31536000 or higher.',
                            value: headerValue,
                        });
                    }
                }

                if (header.name === 'X-Frame-Options') {
                    if (!['DENY', 'SAMEORIGIN'].includes(headerValue.toUpperCase())) {
                        score -= 5;
                        findings.push({
                            id: 'weak-xfo',
                            severity: 'low',
                            title: 'Weak X-Frame-Options value',
                            description: 'X-Frame-Options should be DENY or SAMEORIGIN.',
                            recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN.',
                            value: headerValue,
                        });
                    }
                }
            }
        }

        // Check for HTTPS
        if (!url.startsWith('https://')) {
            score -= 25;
            findings.push({
                id: 'no-https',
                severity: 'critical',
                title: 'Site not using HTTPS',
                description: 'The site is not served over HTTPS, exposing users to man-in-the-middle attacks.',
                recommendation: 'Configure your server to use HTTPS with a valid SSL certificate.',
            });
        }

        // =====================================================================
        // NEW CHECK 1: Deep Cookie Analysis (replaces old single Set-Cookie check)
        // =====================================================================
        const allCookies = getAllSetCookieHeaders(response.headers);
        let cookieScoreDeduction = 0;
        const COOKIE_DEDUCTION_CAP = 15;

        for (const cookieStr of allCookies) {
            const { name, flags } = parseCookie(cookieStr);
            const isSensitiveName = SENSITIVE_COOKIE_NAMES.test(name);
            const isAuthName = AUTH_COOKIE_NAMES.test(name);
            const truncatedValue = cookieStr.length > 60 ? cookieStr.substring(0, 60) + '...' : cookieStr;

            // Missing Secure flag
            if (!flags.includes('secure')) {
                const deduction = Math.min(3, COOKIE_DEDUCTION_CAP - cookieScoreDeduction);
                cookieScoreDeduction += deduction;
                findings.push({
                    id: `cookie-no-secure-${name}`,
                    severity: 'medium',
                    title: `Cookie "${name}" missing Secure flag`,
                    description: `The cookie "${name}" is set without the Secure flag, allowing it to be sent over unencrypted HTTP connections.`,
                    recommendation: 'Add the Secure flag to this cookie to ensure it is only sent over HTTPS.',
                    value: truncatedValue,
                });
            }

            // Missing HttpOnly flag
            if (!flags.includes('httponly')) {
                if (isSensitiveName) {
                    // Sensitive cookie without HttpOnly is high severity
                    const deduction = Math.min(3, COOKIE_DEDUCTION_CAP - cookieScoreDeduction);
                    cookieScoreDeduction += deduction;
                    findings.push({
                        id: `cookie-sensitive-no-httponly-${name}`,
                        severity: 'high',
                        title: `Sensitive cookie "${name}" missing HttpOnly flag`,
                        description: `The cookie "${name}" appears to contain session/auth data but is accessible to JavaScript, making it vulnerable to XSS-based session theft.`,
                        recommendation: 'Add the HttpOnly flag to prevent JavaScript access to this sensitive cookie.',
                        value: truncatedValue,
                    });
                } else if (isAuthName) {
                    const deduction = Math.min(3, COOKIE_DEDUCTION_CAP - cookieScoreDeduction);
                    cookieScoreDeduction += deduction;
                    findings.push({
                        id: `cookie-no-httponly-${name}`,
                        severity: 'medium',
                        title: `Cookie "${name}" missing HttpOnly flag`,
                        description: `The cookie "${name}" is accessible to JavaScript. If it contains session data, this could be exploited via XSS.`,
                        recommendation: 'Add the HttpOnly flag to cookies that don\'t need JavaScript access.',
                        value: truncatedValue,
                    });
                }
            }

            // Missing SameSite attribute
            if (!flags.includes('samesite')) {
                const deduction = Math.min(3, COOKIE_DEDUCTION_CAP - cookieScoreDeduction);
                cookieScoreDeduction += deduction;
                findings.push({
                    id: `cookie-no-samesite-${name}`,
                    severity: 'low',
                    title: `Cookie "${name}" missing SameSite attribute`,
                    description: `The cookie "${name}" does not set a SameSite attribute, which may leave it vulnerable to CSRF attacks in older browsers.`,
                    recommendation: 'Add SameSite=Lax or SameSite=Strict to this cookie.',
                    value: truncatedValue,
                });
            }

            // SameSite=None without Secure
            if (flags.includes('samesite=none') && !flags.includes('secure')) {
                const deduction = Math.min(3, COOKIE_DEDUCTION_CAP - cookieScoreDeduction);
                cookieScoreDeduction += deduction;
                findings.push({
                    id: `cookie-samesite-none-insecure-${name}`,
                    severity: 'medium',
                    title: `Cookie "${name}" has SameSite=None without Secure`,
                    description: `The cookie "${name}" is set with SameSite=None but without the Secure flag. Modern browsers will reject this cookie.`,
                    recommendation: 'When using SameSite=None, the Secure flag is required.',
                    value: truncatedValue,
                });
            }
        }

        score -= Math.min(cookieScoreDeduction, COOKIE_DEDUCTION_CAP);

        // =====================================================================
        // NEW CHECK 2: CORS Misconfiguration Detection
        // =====================================================================
        if (corsResponse) {
            const corsAcao = corsResponse.headers.get('Access-Control-Allow-Origin');
            const corsAcac = corsResponse.headers.get('Access-Control-Allow-Credentials');
            const hasCredentials = corsAcac?.toLowerCase() === 'true';

            if (corsAcao) {
                // Record CORS headers for output
                headersRecord['access-control-allow-origin'] = corsAcao;
                if (corsAcac) headersRecord['access-control-allow-credentials'] = corsAcac;

                if (corsAcao === '*' && hasCredentials) {
                    // Critical: wildcard + credentials
                    score -= 20;
                    findings.push({
                        id: 'cors-wildcard-credentials',
                        severity: 'critical',
                        title: 'Credentialed CORS misconfiguration',
                        description: 'CORS is configured with Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true. This allows any website to make credentialed requests and steal user data.',
                        recommendation: 'Restrict Access-Control-Allow-Origin to specific trusted domains. Never use wildcard with credentials.',
                        value: `ACAO: ${corsAcao}, ACAC: ${corsAcac}`,
                    });
                } else if (corsAcao === 'https://evil.com') {
                    // Origin reflection
                    if (hasCredentials) {
                        score -= 20;
                        findings.push({
                            id: 'cors-reflected-credentials',
                            severity: 'critical',
                            title: 'Credentialed CORS reflects arbitrary origins',
                            description: 'CORS reflects arbitrary Origin headers with Access-Control-Allow-Credentials: true. Any website can steal authenticated user data and hijack sessions.',
                            recommendation: 'Restrict Access-Control-Allow-Origin to specific trusted domains. Never use wildcard with credentials.',
                            value: `ACAO: ${corsAcao}, ACAC: ${corsAcac}`,
                        });
                    } else {
                        score -= 10;
                        findings.push({
                            id: 'cors-reflected-origin',
                            severity: 'high',
                            title: 'CORS reflects arbitrary origins',
                            description: 'CORS is configured to reflect any Origin header back in Access-Control-Allow-Origin. Any website can read responses from this server.',
                            recommendation: 'Restrict Access-Control-Allow-Origin to specific trusted domains. Never use wildcard with credentials.',
                            value: `ACAO: ${corsAcao}`,
                        });
                    }
                } else if (corsAcao === '*') {
                    // Wildcard without credentials
                    score -= 5;
                    findings.push({
                        id: 'cors-wildcard',
                        severity: 'medium',
                        title: 'Wildcard CORS policy',
                        description: 'Access-Control-Allow-Origin is set to *, allowing any website to read responses. While credentials are not allowed with wildcard, this may still leak sensitive data.',
                        recommendation: 'Consider restricting Access-Control-Allow-Origin to specific trusted origins instead of using a wildcard.',
                        value: `ACAO: ${corsAcao}`,
                    });
                }
            }
        }

        // =====================================================================
        // NEW CHECK 3: Information Disclosure
        // =====================================================================
        const serverHeader = response.headers.get('Server');
        if (serverHeader) {
            // Check if version number is included (e.g., Apache/2.4.51, nginx/1.21.3)
            const versionMatch = serverHeader.match(/[\d]+\.[\d]+/);
            if (versionMatch) {
                score -= 5;
                findings.push({
                    id: 'info-disclosure-server-version',
                    severity: 'medium',
                    title: 'Server version disclosed',
                    description: `Server version disclosed: ${serverHeader}. Attackers can look up known CVEs for this exact version.`,
                    recommendation: 'Remove or obscure the version number from the Server header. Configure your web server to send a generic Server header.',
                    value: serverHeader,
                });
            } else {
                findings.push({
                    id: 'info-disclosure-server',
                    severity: 'low',
                    title: 'Server header present',
                    description: `Server header reveals: ${serverHeader}. While no version is disclosed, this still identifies the server software.`,
                    recommendation: 'Consider removing the Server header entirely to minimize information disclosure.',
                    value: serverHeader,
                });
            }
        }

        const xPoweredBy = response.headers.get('X-Powered-By');
        if (xPoweredBy) {
            score -= 5;
            findings.push({
                id: 'info-disclosure-x-powered-by',
                severity: 'medium',
                title: 'X-Powered-By header reveals technology',
                description: `X-Powered-By header reveals: ${xPoweredBy}. Remove this header to reduce attack surface.`,
                recommendation: 'Remove the X-Powered-By header from server responses. Most frameworks have a configuration option to disable it.',
                value: xPoweredBy,
            });
        }

        const xAspNetVersion = response.headers.get('X-AspNet-Version');
        const xAspNetMvcVersion = response.headers.get('X-AspNetMvc-Version');
        if (xAspNetVersion) {
            score -= 5;
            findings.push({
                id: 'info-disclosure-aspnet-version',
                severity: 'medium',
                title: 'ASP.NET version disclosed',
                description: `X-AspNet-Version header reveals: ${xAspNetVersion}. This helps attackers identify specific framework vulnerabilities.`,
                recommendation: 'Remove the X-AspNet-Version header by setting <httpRuntime enableVersionHeader="false" /> in web.config.',
                value: xAspNetVersion,
            });
        }
        if (xAspNetMvcVersion) {
            score -= 5;
            findings.push({
                id: 'info-disclosure-aspnetmvc-version',
                severity: 'medium',
                title: 'ASP.NET MVC version disclosed',
                description: `X-AspNetMvc-Version header reveals: ${xAspNetMvcVersion}. This helps attackers identify specific framework vulnerabilities.`,
                recommendation: 'Remove the X-AspNetMvc-Version header by adding MvcHandler.DisableMvcResponseHeader = true in Application_Start.',
                value: xAspNetMvcVersion,
            });
        }

        const xDebugToken = response.headers.get('X-Debug-Token');
        const xDebugTokenLink = response.headers.get('X-Debug-Token-Link');
        if (xDebugToken || xDebugTokenLink) {
            score -= 10;
            findings.push({
                id: 'info-disclosure-debug-tokens',
                severity: 'high',
                title: 'Debug tokens exposed in production',
                description: 'X-Debug-Token or X-Debug-Token-Link headers are present, indicating a debug/profiler is enabled in production. This can expose sensitive application internals.',
                recommendation: 'Disable the debug profiler in production. For Symfony, set APP_DEBUG=false and ensure the profiler is not loaded.',
                value: xDebugToken || xDebugTokenLink || '',
            });
        }

        const xRuntime = response.headers.get('X-Runtime');
        if (xRuntime) {
            findings.push({
                id: 'info-disclosure-x-runtime',
                severity: 'low',
                title: 'X-Runtime header exposes timing information',
                description: `X-Runtime header reveals request processing time (${xRuntime}). This can be used for timing-based side-channel attacks.`,
                recommendation: 'Remove the X-Runtime header from production responses to prevent timing analysis.',
                value: xRuntime,
            });
        }

        // =====================================================================
        // NEW CHECK 4: CSP Deep Analysis (enhances existing CSP check)
        // =====================================================================
        if (cspHeader) {
            const cspLower = cspHeader.toLowerCase();
            let isStrongCsp = true;

            if (cspLower.includes("'unsafe-inline'")) {
                // Check if nonce or hash is present in the CSP — browsers ignore
                // unsafe-inline in script-src when a nonce or hash is specified,
                // so it's not a real weakness in that case.
                const hasNonceOrHash = /nonce-|sha256-|sha384-|sha512-/i.test(cspLower);
                if (hasNonceOrHash) {
                    findings.push({
                        id: 'csp-unsafe-inline-with-nonce',
                        severity: 'info',
                        title: "CSP has unsafe-inline but nonce/hash overrides it",
                        description: "CSP includes 'unsafe-inline' alongside a nonce or hash directive. Modern browsers ignore unsafe-inline when a nonce or hash is present, so this is safe. The unsafe-inline serves as a fallback for older browsers.",
                        recommendation: "No action needed. Consider removing 'unsafe-inline' once you no longer need to support browsers that don't understand nonces/hashes.",
                        value: cspHeader.substring(0, 200),
                    });
                } else {
                    score -= 5;
                    isStrongCsp = false;
                    findings.push({
                        id: 'csp-unsafe-inline',
                        severity: 'medium',
                        title: 'CSP allows unsafe-inline',
                        description: "CSP allows 'unsafe-inline' scripts, which significantly weakens XSS protection since inline scripts and event handlers are permitted.",
                        recommendation: "Remove 'unsafe-inline' from CSP and use nonce-based or hash-based script loading instead.",
                        value: cspHeader.substring(0, 200),
                    });
                }
            }

            if (cspLower.includes("'unsafe-eval'")) {
                score -= 5;
                isStrongCsp = false;
                findings.push({
                    id: 'csp-unsafe-eval',
                    severity: 'medium',
                    title: 'CSP allows unsafe-eval',
                    description: "CSP allows 'unsafe-eval', enabling eval()-based code execution which can be exploited for XSS attacks.",
                    recommendation: "Remove 'unsafe-eval' from CSP. Refactor code to avoid eval(), new Function(), and setTimeout/setInterval with strings.",
                    value: cspHeader.substring(0, 200),
                });
            }

            // Check for wildcard * as a source (but not in URLs like *.example.com)
            // Match standalone * that isn't part of a subdomain wildcard
            const cspDirectives = cspLower.split(';');
            const hasWildcardSource = cspDirectives.some(directive => {
                const parts = directive.trim().split(/\s+/);
                // Skip the directive name (first part), check source values
                return parts.slice(1).some(part => part === '*');
            });

            if (hasWildcardSource) {
                score -= 10;
                isStrongCsp = false;
                findings.push({
                    id: 'csp-wildcard-source',
                    severity: 'high',
                    title: 'CSP contains wildcard source',
                    description: 'CSP contains a wildcard (*) source, effectively allowing resources to be loaded from any origin, which disables protection.',
                    recommendation: 'Replace wildcard sources with specific trusted domains.',
                    value: cspHeader.substring(0, 200),
                });
            }

            // Check for data: and blob: URI schemes in script-src
            const scriptSrcForSchemes = cspDirectives.find(d => d.trim().startsWith('script-src'));
            if (scriptSrcForSchemes) {
                const hasDataScheme = /\bdata:/i.test(scriptSrcForSchemes);
                const hasBlobScheme = /\bblob:/i.test(scriptSrcForSchemes);

                if (hasDataScheme) {
                    score -= 5;
                    isStrongCsp = false;
                    findings.push({
                        id: 'csp-data-uri-script',
                        severity: 'high',
                        title: 'CSP script-src allows data: URIs',
                        description: "CSP script-src includes 'data:' as an allowed scheme. This allows attackers to inject scripts via data: URIs (e.g., <script src=\"data:text/javascript,...\">), effectively bypassing CSP protection against XSS.",
                        recommendation: "Remove 'data:' from script-src. Use nonce-based or hash-based script loading for inline scripts instead.",
                        value: cspHeader.substring(0, 200),
                    });
                }

                if (hasBlobScheme) {
                    score -= 5;
                    isStrongCsp = false;
                    findings.push({
                        id: 'csp-blob-uri-script',
                        severity: 'high',
                        title: 'CSP script-src allows blob: URIs',
                        description: "CSP script-src includes 'blob:' as an allowed scheme. This can be exploited to execute arbitrary JavaScript by creating blob URLs containing malicious scripts, bypassing CSP protections.",
                        recommendation: "Remove 'blob:' from script-src unless absolutely required. If needed, combine with strict nonce-based CSP.",
                        value: cspHeader.substring(0, 200),
                    });
                }
            }

            // Check for missing default-src
            if (!cspLower.includes('default-src')) {
                score -= 5;
                isStrongCsp = false;
                findings.push({
                    id: 'csp-missing-default-src',
                    severity: 'medium',
                    title: 'CSP missing default-src directive',
                    description: 'CSP does not include a default-src fallback directive. Without it, resource types not covered by specific directives have no restrictions.',
                    recommendation: "Add a default-src directive (e.g., default-src 'self') as a fallback for unspecified resource types.",
                    value: cspHeader.substring(0, 200),
                });
            }

            // Check if script-src or default-src allows http:
            const scriptSrcDirective = cspDirectives.find(d => d.trim().startsWith('script-src'));
            const defaultSrcDirective = cspDirectives.find(d => d.trim().startsWith('default-src'));
            const hasHttpSource = (scriptSrcDirective && scriptSrcDirective.includes('http:')) ||
                (defaultSrcDirective && defaultSrcDirective.includes('http:'));

            if (hasHttpSource) {
                score -= 5;
                isStrongCsp = false;
                findings.push({
                    id: 'csp-allows-http',
                    severity: 'medium',
                    title: 'CSP allows scripts over insecure HTTP',
                    description: 'CSP script-src or default-src includes http: as an allowed scheme, permitting scripts to be loaded over unencrypted connections.',
                    recommendation: 'Remove http: from CSP directives. Use https: to ensure scripts are loaded securely.',
                    value: cspHeader.substring(0, 200),
                });
            }

            // Strong CSP detection
            if (isStrongCsp && cspLower.includes('default-src')) {
                findings.push({
                    id: 'csp-strong',
                    severity: 'info',
                    title: 'Strong CSP detected',
                    description: 'Content-Security-Policy is well-configured with a default-src directive and no unsafe-inline, unsafe-eval, or wildcard sources.',
                    recommendation: 'Continue maintaining this strong CSP. Consider adding report-uri or report-to for violation monitoring.',
                    value: cspHeader.substring(0, 200),
                });
            }
        }

        // Rate Limiting checks have been moved to dedicated scanners (DDoS and Mobile API)
        // to consolidate duplicate findings and prevent scanner overlap.

        // =====================================================================
        // NEW CHECK 6: HTTPS Redirect Check
        // =====================================================================
        if (url.startsWith('https://')) {
            // Build the HTTP equivalent URL to test redirect behavior
            const httpUrl = url.replace(/^https:\/\//, 'http://');
            try {
                const httpAbort = new AbortController();
                const httpTimer = setTimeout(() => httpAbort.abort(), 10000);
                const httpResponse = await fetch(httpUrl, {
                    method: 'HEAD',
                    redirect: 'manual',
                    signal: httpAbort.signal,
                });
                clearTimeout(httpTimer);

                const location = httpResponse.headers.get('Location');
                const status = httpResponse.status;
                const isRedirectStatus = status === 301 || status === 302 || status === 307 || status === 308;

                if (isRedirectStatus && location && location.startsWith('https://')) {
                    // Good: HTTP redirects to HTTPS — no finding needed
                    findings.push({
                        id: 'http-redirects-to-https',
                        severity: 'info',
                        title: 'HTTP properly redirects to HTTPS',
                        description: `HTTP requests are redirected to HTTPS with a ${status} status code.`,
                        recommendation: 'No action needed. HTTP to HTTPS redirect is properly configured.',
                    });
                } else {
                    score -= 10;
                    findings.push({
                        id: 'http-no-https-redirect',
                        severity: 'high',
                        title: 'HTTP does not redirect to HTTPS',
                        description: 'The HTTP version of this site does not redirect to HTTPS. Users who visit via HTTP are not automatically upgraded to a secure connection.',
                        recommendation: 'Configure your server to redirect all HTTP requests to HTTPS with a 301 redirect.',
                    });
                }
            } catch {
                // HTTP fetch failed (port 80 may be closed) — not necessarily a problem
                findings.push({
                    id: 'http-redirect-check-failed',
                    severity: 'info',
                    title: 'HTTP redirect check inconclusive',
                    description: 'Could not connect to the HTTP (port 80) version of this site to verify redirect behavior. Port 80 may be closed.',
                    recommendation: 'Ensure HTTP requests on port 80 redirect to HTTPS, or that port 80 is intentionally closed.',
                });
            }
        }

        // Only return security-relevant headers, not all headers
        const securityHeaderNames = [
            'content-security-policy', 'x-frame-options', 'x-content-type-options',
            'strict-transport-security', 'x-xss-protection', 'referrer-policy', 'permissions-policy',
            'cross-origin-opener-policy', 'cross-origin-resource-policy', 'cross-origin-embedder-policy',
            'x-permitted-cross-domain-policies', 'cache-control', 'pragma', 'server', 'x-powered-by',
            // New headers for enhanced checks
            'access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods',
            'set-cookie',
            'x-aspnet-version', 'x-aspnetmvc-version', 'x-debug-token', 'x-debug-token-link', 'x-runtime',
            'x-ratelimit-limit', 'x-ratelimit-remaining', 'ratelimit-limit', 'ratelimit-remaining',
            'retry-after', 'x-rate-limit-limit',
        ];
        const filteredHeaders: Record<string, string> = {};
        for (const header of securityHeaderNames) {
            if (headersRecord[header]) filteredHeaders[header] = headersRecord[header];
        }

        const result: ScanResult = {
            scannerType: 'security',
            score: Math.max(0, Math.min(100, score)),
            findings,
            headers: filteredHeaders,
            scannedAt: new Date().toISOString(),
            url,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'security',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                metadata: {},
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            }
        );
    }
});
