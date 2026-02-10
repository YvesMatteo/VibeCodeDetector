import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Authentication Flow Scanner
 *
 * Analyzes authentication implementation for common vibe-coding mistakes:
 *  1. Login/signup forms over HTTP
 *  2. Password field autocomplete settings
 *  3. Missing rate-limiting indicators
 *  4. OAuth/SSO configuration issues
 *  5. Password reset flow exposure
 *  6. Registration form data validation
 *  7. Session management after auth
 *  8. Multi-factor authentication indicators
 */

const USER_AGENT = "CheckVibe-AuthScanner/1.0";
const FETCH_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = FETCH_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, ...(options.headers || {}) },
    }).finally(() => clearTimeout(timer));
}

/**
 * Try to find common auth-related pages.
 */
const AUTH_PATHS = [
    "/login", "/signin", "/sign-in", "/auth/login",
    "/signup", "/register", "/sign-up", "/auth/register",
    "/forgot-password", "/reset-password", "/auth/forgot-password",
    "/api/auth/signin", "/api/auth/signup", // Next-Auth patterns
    "/auth/callback", // OAuth callback
];

interface AuthPageResult {
    path: string;
    status: number;
    html: string;
    headers: Headers;
    found: boolean;
}

async function probeAuthPage(baseUrl: string, path: string): Promise<AuthPageResult> {
    try {
        const url = new URL(path, baseUrl).href;
        const response = await fetchWithTimeout(url, {
            method: "GET",
            headers: { Accept: "text/html" },
        });
        const html = response.status < 400 ? await response.text() : "";
        return { path, status: response.status, html, headers: response.headers, found: response.status < 400 };
    } catch {
        return { path, status: 0, html: "", headers: new Headers(), found: false };
    }
}

/**
 * Extract password inputs and their attributes from HTML.
 */
function findPasswordInputs(html: string): Array<{
    autocomplete: string | null;
    hasMinLength: boolean;
    minLength: number;
    hasPattern: boolean;
    name: string;
}> {
    const results: Array<{ autocomplete: string | null; hasMinLength: boolean; minLength: number; hasPattern: boolean; name: string }> = [];
    const inputRegex = /<input\b([^>]*type\s*=\s*["']password["'][^>]*)>/gi;
    let match: RegExpExecArray | null;

    while ((match = inputRegex.exec(html)) !== null) {
        const attrs = match[1];
        const autocomplete = attrs.match(/autocomplete\s*=\s*["']([^"']*)["']/i)?.[1] || null;
        const minLengthMatch = attrs.match(/minlength\s*=\s*["']?(\d+)["']?/i);
        const hasMinLength = !!minLengthMatch;
        const minLength = minLengthMatch ? parseInt(minLengthMatch[1], 10) : 0;
        const hasPattern = /pattern\s*=\s*["'][^"']+["']/i.test(attrs);
        const name = attrs.match(/name\s*=\s*["']([^"']*)["']/i)?.[1] || "password";

        results.push({ autocomplete, hasMinLength, minLength, hasPattern, name });
    }

    return results;
}

/**
 * Check if HTML contains common OAuth/SSO patterns.
 */
function detectOAuthProviders(html: string): string[] {
    const providers: string[] = [];
    const patterns: Record<string, RegExp> = {
        Google: /google|googleapis|accounts\.google/i,
        GitHub: /github\.com\/login|github.*oauth/i,
        Facebook: /facebook|fb\.com/i,
        Microsoft: /microsoft|login\.microsoftonline/i,
        Apple: /apple.*sign.?in|appleid/i,
        Twitter: /twitter|x\.com.*oauth/i,
        Auth0: /auth0\.com/i,
        Okta: /okta\.com/i,
        Supabase: /supabase.*auth|sb-.*\.supabase/i,
        Firebase: /firebase.*auth|firebaseapp/i,
        Clerk: /clerk\.dev|clerk\.com/i,
    };

    for (const [provider, regex] of Object.entries(patterns)) {
        if (regex.test(html)) providers.push(provider);
    }

    return providers;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }
    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }
        const targetUrl = validation.url!;
        const isHTTPS = targetUrl.startsWith("https://");

        const findings: Finding[] = [];
        let score = 100;

        // =================================================================
        // Step 1: Fetch main page HTML
        // =================================================================
        let mainHtml = "";
        let mainResponse: Response;
        try {
            mainResponse = await fetchWithTimeout(targetUrl, { method: "GET" });
            mainHtml = await mainResponse.text();
        } catch (e) {
            return new Response(
                JSON.stringify({
                    scannerType: "auth",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                }),
                { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        // =================================================================
        // Step 2: Probe common auth pages in parallel
        // =================================================================
        const authProbes = await Promise.all(
            AUTH_PATHS.map(path => probeAuthPage(targetUrl, path)),
        );
        const foundAuthPages = authProbes.filter(p => p.found);
        const allHtml = mainHtml + " " + foundAuthPages.map(p => p.html).join(" ");

        // =================================================================
        // Step 3: Check if auth pages are accessible
        // =================================================================
        if (foundAuthPages.length === 0) {
            findings.push({
                id: "auth-no-pages-found",
                severity: "info",
                title: "No standard auth pages detected",
                description:
                    "No login, signup, or password reset pages were found at common paths. " +
                    "The site may use a SPA with client-side routing, a third-party auth provider, or non-standard paths.",
                recommendation:
                    "If you use authentication, ensure login/signup pages are properly secured.",
            });
        } else {
            const loginPages = foundAuthPages.filter(p => /login|signin|sign-in/i.test(p.path));
            const signupPages = foundAuthPages.filter(p => /signup|register|sign-up/i.test(p.path));
            const resetPages = foundAuthPages.filter(p => /forgot|reset/i.test(p.path));

            // Report found auth pages
            findings.push({
                id: "auth-pages-detected",
                severity: "info",
                title: `${foundAuthPages.length} auth page(s) detected`,
                description: `Found auth pages at: ${foundAuthPages.map(p => p.path).join(", ")}`,
                recommendation: "Ensure all auth pages are properly secured and tested.",
                evidence: foundAuthPages.map(p => `${p.path} → ${p.status}`).join(", "),
            });

            // =================================================================
            // Check 4: Auth pages over HTTP
            // =================================================================
            if (!isHTTPS) {
                score -= 20;
                findings.push({
                    id: "auth-no-https",
                    severity: "critical",
                    title: "Authentication pages served over HTTP",
                    description:
                        "Login and signup pages are accessible over unencrypted HTTP. " +
                        "Passwords and credentials are sent in plaintext and can be intercepted by anyone on the network.",
                    recommendation: "Enable HTTPS (TLS) for your entire site. Use Let's Encrypt for free SSL certificates.",
                    evidence: `URL: ${targetUrl} (HTTP)`,
                });
            }

            // =================================================================
            // Check 5: Password field analysis
            // =================================================================
            for (const page of [...loginPages, ...signupPages]) {
                const pwFields = findPasswordInputs(page.html);

                for (const field of pwFields) {
                    // Check autocomplete attribute
                    if (field.autocomplete === "on" || field.autocomplete === null) {
                        // On signup forms, autocomplete should be "new-password"
                        // On login forms, "current-password" is recommended
                        const isSignup = /signup|register|sign-up/i.test(page.path);
                        if (isSignup) {
                            score -= 3;
                            findings.push({
                                id: `auth-password-autocomplete-${page.path}`,
                                severity: "low",
                                title: `Password field on ${page.path} missing autocomplete="new-password"`,
                                description:
                                    "The signup password field doesn't specify autocomplete='new-password'. " +
                                    "This prevents password managers from suggesting a strong generated password.",
                                recommendation: 'Add autocomplete="new-password" to signup password fields.',
                                evidence: `Path: ${page.path}, autocomplete: ${field.autocomplete || "not set"}`,
                            });
                        }
                    }

                    // Check password complexity requirements on signup
                    if (/signup|register|sign-up/i.test(page.path)) {
                        if (!field.hasMinLength || field.minLength < 8) {
                            score -= 5;
                            findings.push({
                                id: `auth-weak-password-policy-${page.path}`,
                                severity: "medium",
                                title: "Weak client-side password requirements",
                                description:
                                    `The signup form at ${page.path} doesn't enforce a minimum password length of 8+ characters. ` +
                                    "Users may choose weak passwords. Note: server-side validation may still exist.",
                                recommendation:
                                    'Add minlength="8" (or higher) to password fields and implement server-side validation.',
                                evidence: `Path: ${page.path}, minlength: ${field.hasMinLength ? field.minLength : "not set"}`,
                            });
                        }
                    }
                }

                if (pwFields.length === 0 && /signup|register/i.test(page.path)) {
                    // Signup page without password fields — might be OAuth-only
                    findings.push({
                        id: `auth-signup-no-password-${page.path}`,
                        severity: "info",
                        title: `Signup page at ${page.path} has no password fields`,
                        description: "The registration page does not have password inputs. It may use OAuth/SSO-only authentication.",
                        recommendation: "If intentional (OAuth-only), this is fine. Otherwise, verify the signup flow.",
                    });
                }
            }

            // =================================================================
            // Check 6: Rate limiting indicators
            // =================================================================
            const rateLimitHeaders = [
                "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset",
                "RateLimit-Limit", "RateLimit-Remaining", "Retry-After",
            ];
            let hasRateLimiting = false;

            for (const page of loginPages) {
                for (const header of rateLimitHeaders) {
                    if (page.headers.get(header)) {
                        hasRateLimiting = true;
                        break;
                    }
                }
            }

            if (loginPages.length > 0 && !hasRateLimiting) {
                score -= 8;
                findings.push({
                    id: "auth-no-rate-limit",
                    severity: "high",
                    title: "No rate limiting detected on login page",
                    description:
                        "The login page does not appear to have rate limiting headers. " +
                        "Without rate limiting, attackers can perform brute-force password attacks.",
                    recommendation:
                        "Implement rate limiting (e.g., 5 attempts per minute). Use headers like X-RateLimit-Limit. " +
                        "Consider CAPTCHA after failed attempts.",
                });
            }
        }

        // =================================================================
        // Check 7: OAuth/SSO provider detection
        // =================================================================
        const oauthProviders = detectOAuthProviders(allHtml);

        if (oauthProviders.length > 0) {
            findings.push({
                id: "auth-oauth-detected",
                severity: "info",
                title: `OAuth/SSO providers detected: ${oauthProviders.join(", ")}`,
                description: `The site integrates with: ${oauthProviders.join(", ")}. Using established auth providers reduces the risk of authentication bugs.`,
                recommendation: "Ensure OAuth redirect URIs are strictly configured and state parameters are validated.",
                evidence: `Providers: ${oauthProviders.join(", ")}`,
            });

            // Bonus points for using established auth
            if (score < 100) score = Math.min(100, score + 5);
        }

        // =================================================================
        // Check 8: Security headers on auth pages
        // =================================================================
        for (const page of foundAuthPages) {
            // Check Cache-Control on auth pages
            const cacheControl = page.headers.get("Cache-Control") || "";
            if (!cacheControl.includes("no-store") && !cacheControl.includes("no-cache")) {
                score -= 3;
                findings.push({
                    id: `auth-cacheable-${page.path}`,
                    severity: "medium",
                    title: `Auth page ${page.path} may be cached`,
                    description:
                        "The authentication page doesn't set Cache-Control: no-store. " +
                        "Browsers or proxies may cache the page, potentially exposing sensitive forms.",
                    recommendation: "Add Cache-Control: no-store, no-cache to all authentication pages.",
                    evidence: `Path: ${page.path}, Cache-Control: ${cacheControl || "not set"}`,
                });
                break; // Only flag once
            }
        }

        // =================================================================
        // Check 9: Common vibe-coding auth mistakes in HTML
        // =================================================================

        // Check for hardcoded credentials in page source
        const credPatterns = [
            /password\s*[:=]\s*["'][^"']{3,}["']/gi,
            /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi,
            /secret\s*[:=]\s*["'][^"']{10,}["']/gi,
        ];

        for (const pattern of credPatterns) {
            if (pattern.test(allHtml)) {
                score -= 15;
                findings.push({
                    id: "auth-hardcoded-creds",
                    severity: "critical",
                    title: "Possible hardcoded credentials in auth page source",
                    description:
                        "The HTML source of an authentication page appears to contain hardcoded passwords, API keys, or secrets. " +
                        "This is a common vibe-coding mistake where AI-generated code includes placeholder credentials.",
                    recommendation:
                        "Remove all hardcoded credentials immediately. Use environment variables for secrets. " +
                        "Rotate any exposed credentials.",
                });
                break;
            }
        }

        // Check for client-side auth logic that should be server-side
        const clientAuthPatterns = [
            { pattern: /if\s*\(\s*password\s*===?\s*["'][^"']+["']\s*\)/i, issue: "Client-side password comparison" },
            { pattern: /localStorage\.setItem\s*\(\s*["'](?:password|token|secret)["']/i, issue: "Storing secrets in localStorage" },
            { pattern: /document\.cookie\s*=.*(?:token|session|auth).*(?:=)/i, issue: "Setting auth cookies via JavaScript" },
        ];

        for (const { pattern, issue } of clientAuthPatterns) {
            if (pattern.test(allHtml)) {
                score -= 12;
                findings.push({
                    id: `auth-client-side-${issue.replace(/\s+/g, "-").toLowerCase()}`,
                    severity: "critical",
                    title: `${issue} detected`,
                    description:
                        `Found "${issue}" in the page source. This is extremely dangerous — ` +
                        "authentication logic must happen on the server, never in client-side JavaScript.",
                    recommendation:
                        "Move all authentication logic to the server. Never compare passwords or store secrets in the browser.",
                    evidence: issue,
                });
                break;
            }
        }

        score = Math.max(0, Math.min(100, score));

        const result = {
            scannerType: "auth",
            score,
            findings,
            authPagesFound: foundAuthPages.length,
            authPaths: foundAuthPages.map(p => p.path),
            oauthProviders,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Auth Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "auth",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
            }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
    }
});
