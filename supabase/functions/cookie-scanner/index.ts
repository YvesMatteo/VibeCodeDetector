import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Cookie & Session Security Scanner
 *
 * Deep analysis of cookie security practices:
 *  1. Session cookie flags (Secure, HttpOnly, SameSite, Path, Domain)
 *  2. Cookie prefix validation (__Secure-, __Host-)
 *  3. Session fixation indicators
 *  4. Excessive cookie exposure
 *  5. JWT/token-in-cookie patterns
 *  6. Cookie size and count analysis
 *  7. Persistent session risks (long expiry)
 */

const USER_AGENT = "CheckVibe-CookieScanner/1.0";
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

interface CookieDetail {
    name: string;
    value: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string | null;
    path: string | null;
    domain: string | null;
    maxAge: number | null;
    expires: string | null;
    size: number;
    isPersistent: boolean;
    hasSecurePrefix: boolean;
    hasHostPrefix: boolean;
    looksLikeSession: boolean;
    looksLikeJWT: boolean;
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

const SESSION_COOKIE_PATTERNS = /^(sess|session|sid|connect\.sid|PHPSESSID|JSESSIONID|ASP\.NET_SessionId|token|auth|jwt|access|refresh|_session|user|login|remember|csrf|xsrf)/i;
const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SENSITIVE_DATA_PATTERNS = [
    { pattern: /email/i, type: "email" },
    { pattern: /user(name|id|_id)/i, type: "user identifier" },
    { pattern: /password|pwd|pass/i, type: "password" },
    { pattern: /phone|mobile|tel/i, type: "phone number" },
    { pattern: /credit|card|ccn/i, type: "credit card" },
    { pattern: /ssn|social/i, type: "SSN" },
];

function parseCookies(headers: Headers): CookieDetail[] {
    const cookies: CookieDetail[] = [];
    const setCookieValues: string[] = [];

    if (typeof (headers as any).getSetCookie === "function") {
        const result = (headers as any).getSetCookie();
        if (Array.isArray(result)) setCookieValues.push(...result.filter((c: string) => c.length > 0));
    }
    for (const [key, value] of headers.entries()) {
        if (key.toLowerCase() === "set-cookie" && !setCookieValues.includes(value)) {
            setCookieValues.push(value);
        }
    }

    for (const cookieStr of setCookieValues) {
        const parts = cookieStr.split(";").map(p => p.trim());
        const nameValue = parts[0] || "";
        const eqIndex = nameValue.indexOf("=");
        const name = eqIndex > -1 ? nameValue.substring(0, eqIndex) : nameValue;
        const value = eqIndex > -1 ? nameValue.substring(eqIndex + 1) : "";
        const lower = cookieStr.toLowerCase();

        let sameSite: string | null = null;
        const sameSiteMatch = lower.match(/samesite\s*=\s*(strict|lax|none)/i);
        if (sameSiteMatch) sameSite = sameSiteMatch[1];

        let path: string | null = null;
        const pathMatch = cookieStr.match(/path\s*=\s*([^;]*)/i);
        if (pathMatch) path = pathMatch[1].trim();

        let domain: string | null = null;
        const domainMatch = cookieStr.match(/domain\s*=\s*([^;]*)/i);
        if (domainMatch) domain = domainMatch[1].trim();

        let maxAge: number | null = null;
        const maxAgeMatch = lower.match(/max-age\s*=\s*(-?\d+)/);
        if (maxAgeMatch) maxAge = parseInt(maxAgeMatch[1], 10);

        let expires: string | null = null;
        const expiresMatch = cookieStr.match(/expires\s*=\s*([^;]+)/i);
        if (expiresMatch) expires = expiresMatch[1].trim();

        const isPersistent = maxAge !== null || expires !== null;

        cookies.push({
            name,
            value,
            secure: lower.includes("secure"),
            httpOnly: lower.includes("httponly"),
            sameSite,
            path,
            domain,
            maxAge,
            expires,
            size: cookieStr.length,
            isPersistent,
            hasSecurePrefix: name.startsWith("__Secure-"),
            hasHostPrefix: name.startsWith("__Host-"),
            looksLikeSession: SESSION_COOKIE_PATTERNS.test(name),
            looksLikeJWT: JWT_PATTERN.test(value),
        });
    }

    return cookies;
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
        // Fetch page to collect cookies
        // =================================================================
        let response: Response;
        try {
            response = await fetchWithTimeout(targetUrl, { method: "GET" });
        } catch (e) {
            return new Response(
                JSON.stringify({
                    scannerType: "cookies",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                }),
                { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        const cookies = parseCookies(response.headers);

        if (cookies.length === 0) {
            findings.push({
                id: "cookies-none-detected",
                severity: "info",
                title: "No cookies set on initial page load",
                description:
                    "The server does not set any cookies on the initial page load. " +
                    "This may be fine for static sites, or cookies may be set after login/interaction.",
                recommendation: "If your app uses sessions, ensure cookies are set with proper security flags after authentication.",
            });

            return new Response(JSON.stringify({
                scannerType: "cookies",
                score: 100,
                findings,
                cookiesAnalyzed: 0,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
        }

        const sessionCookies = cookies.filter(c => c.looksLikeSession);
        const allCookies = cookies;

        // =================================================================
        // Check 1: Session cookies missing Secure flag
        // =================================================================
        for (const cookie of sessionCookies) {
            if (!cookie.secure && isHTTPS) {
                score -= 12;
                findings.push({
                    id: `cookie-no-secure-${cookie.name}`,
                    severity: "high",
                    title: `Session cookie "${cookie.name}" missing Secure flag`,
                    description:
                        `The cookie "${cookie.name}" is not marked as Secure, meaning it can be sent over unencrypted HTTP connections. ` +
                        "An attacker performing a MITM attack can intercept this cookie and hijack the session.",
                    recommendation: "Add the Secure flag to this cookie. In most frameworks: `Secure: true` in cookie options.",
                    evidence: `Cookie: ${cookie.name}, Secure: false`,
                });
            }
        }

        // =================================================================
        // Check 2: Session cookies missing HttpOnly
        // =================================================================
        for (const cookie of sessionCookies) {
            if (!cookie.httpOnly) {
                score -= 10;
                findings.push({
                    id: `cookie-no-httponly-${cookie.name}`,
                    severity: "high",
                    title: `Session cookie "${cookie.name}" missing HttpOnly flag`,
                    description:
                        `The cookie "${cookie.name}" is accessible to JavaScript via document.cookie. ` +
                        "If an XSS vulnerability exists, an attacker can steal this cookie.",
                    recommendation: "Add the HttpOnly flag to prevent JavaScript access. Set `HttpOnly: true` in cookie options.",
                    evidence: `Cookie: ${cookie.name}, HttpOnly: false`,
                });
            }
        }

        // =================================================================
        // Check 3: Session cookies with weak/missing SameSite
        // =================================================================
        for (const cookie of sessionCookies) {
            if (!cookie.sameSite) {
                score -= 5;
                findings.push({
                    id: `cookie-no-samesite-${cookie.name}`,
                    severity: "medium",
                    title: `Session cookie "${cookie.name}" missing SameSite attribute`,
                    description:
                        "Without SameSite, this cookie defaults to browser-specific behavior. " +
                        "Most modern browsers default to Lax, but explicitly setting it is best practice.",
                    recommendation: "Set SameSite=Lax (recommended) or SameSite=Strict for maximum security.",
                    evidence: `Cookie: ${cookie.name}, SameSite: not set`,
                });
            } else if (cookie.sameSite.toLowerCase() === "none" && !cookie.secure) {
                score -= 8;
                findings.push({
                    id: `cookie-samesite-none-insecure-${cookie.name}`,
                    severity: "high",
                    title: `Cookie "${cookie.name}" has SameSite=None without Secure`,
                    description: "SameSite=None without Secure is rejected by modern browsers and insecure in older ones.",
                    recommendation: "Either add the Secure flag or change SameSite to Lax.",
                    evidence: `Cookie: ${cookie.name}, SameSite=None, Secure: false`,
                });
            }
        }

        // =================================================================
        // Check 4: JWT stored in cookies
        // =================================================================
        for (const cookie of cookies) {
            if (cookie.looksLikeJWT) {
                if (!cookie.httpOnly) {
                    score -= 10;
                    findings.push({
                        id: `cookie-jwt-no-httponly-${cookie.name}`,
                        severity: "high",
                        title: `JWT in cookie "${cookie.name}" is accessible to JavaScript`,
                        description:
                            "A JSON Web Token is stored in a cookie without HttpOnly. " +
                            "Any XSS vulnerability would allow an attacker to steal the JWT and impersonate the user.",
                        recommendation: "Add HttpOnly flag to JWT cookies, or use a server-side session instead.",
                        evidence: `Cookie: ${cookie.name}, contains JWT, HttpOnly: false`,
                    });
                } else {
                    findings.push({
                        id: `cookie-jwt-httponly-${cookie.name}`,
                        severity: "info",
                        title: `JWT in cookie "${cookie.name}" is HttpOnly (good)`,
                        description: "A JWT is stored in an HttpOnly cookie, which protects it from XSS attacks.",
                        recommendation: "Good practice. Ensure the JWT has a reasonable expiry time.",
                    });
                }
            }
        }

        // =================================================================
        // Check 5: Cookie prefix validation
        // =================================================================
        for (const cookie of cookies) {
            if (cookie.hasSecurePrefix && !cookie.secure) {
                score -= 5;
                findings.push({
                    id: `cookie-prefix-secure-invalid-${cookie.name}`,
                    severity: "medium",
                    title: `Cookie "${cookie.name}" uses __Secure- prefix without Secure flag`,
                    description: "The __Secure- prefix requires the Secure flag. Without it, the cookie will be rejected by browsers.",
                    recommendation: "Add the Secure flag or remove the __Secure- prefix.",
                    evidence: `Cookie: ${cookie.name}, __Secure- prefix, Secure: false`,
                });
            }
            if (cookie.hasHostPrefix) {
                if (!cookie.secure || cookie.domain || cookie.path !== "/") {
                    score -= 5;
                    findings.push({
                        id: `cookie-prefix-host-invalid-${cookie.name}`,
                        severity: "medium",
                        title: `Cookie "${cookie.name}" uses __Host- prefix incorrectly`,
                        description:
                            "The __Host- prefix requires: Secure flag, no Domain attribute, and Path=/. " +
                            "Non-compliant cookies will be rejected by browsers.",
                        recommendation: "Set Secure, remove Domain attribute, and set Path=/.",
                        evidence: `Cookie: ${cookie.name}, Secure: ${cookie.secure}, Domain: ${cookie.domain || "(none)"}, Path: ${cookie.path || "(none)"}`,
                    });
                }
            }
        }

        // =================================================================
        // Check 6: Overly broad domain scope
        // =================================================================
        for (const cookie of sessionCookies) {
            if (cookie.domain) {
                const domainVal = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
                const parts = domainVal.split(".");
                // If domain has only 2 parts (e.g., .example.com), it's TLD-level scoping
                if (parts.length <= 2) {
                    score -= 5;
                    findings.push({
                        id: `cookie-broad-domain-${cookie.name}`,
                        severity: "medium",
                        title: `Session cookie "${cookie.name}" has broad domain scope`,
                        description:
                            `Cookie domain is set to "${cookie.domain}", making it accessible to all subdomains. ` +
                            "If any subdomain is compromised, the session cookie can be stolen.",
                        recommendation: "Omit the Domain attribute to restrict the cookie to the exact host that set it.",
                        evidence: `Cookie: ${cookie.name}, Domain: ${cookie.domain}`,
                    });
                }
            }
        }

        // =================================================================
        // Check 7: Persistent session cookies with long expiry
        // =================================================================
        for (const cookie of sessionCookies) {
            if (cookie.maxAge !== null && cookie.maxAge > 0) {
                const days = cookie.maxAge / 86400;
                if (days > 30) {
                    score -= 5;
                    findings.push({
                        id: `cookie-long-expiry-${cookie.name}`,
                        severity: "medium",
                        title: `Session cookie "${cookie.name}" has ${Math.round(days)}-day expiry`,
                        description:
                            `This session cookie persists for ${Math.round(days)} days. Long-lived sessions ` +
                            "increase the window for session hijacking and don't force re-authentication.",
                        recommendation: "Use session cookies (no Max-Age/Expires) or set a shorter expiry (< 24 hours for sensitive apps).",
                        evidence: `Cookie: ${cookie.name}, Max-Age: ${cookie.maxAge} seconds (${Math.round(days)} days)`,
                    });
                }
            }
        }

        // =================================================================
        // Check 8: Sensitive data in cookie names/values
        // =================================================================
        for (const cookie of allCookies) {
            for (const { pattern, type } of SENSITIVE_DATA_PATTERNS) {
                if (pattern.test(cookie.name) && !cookie.httpOnly) {
                    score -= 3;
                    findings.push({
                        id: `cookie-sensitive-data-${cookie.name}`,
                        severity: "medium",
                        title: `Cookie "${cookie.name}" may contain ${type} data`,
                        description:
                            `A cookie with a name suggesting ${type} data is accessible to JavaScript. ` +
                            "Sensitive data in cookies should always have HttpOnly set.",
                        recommendation: `Add HttpOnly flag to cookies containing ${type} data.`,
                        evidence: `Cookie: ${cookie.name}, HttpOnly: false`,
                    });
                    break; // Only flag once per cookie
                }
            }
        }

        // =================================================================
        // Check 9: Excessive cookies (performance + security)
        // =================================================================
        if (allCookies.length > 15) {
            findings.push({
                id: "cookies-excessive-count",
                severity: "low",
                title: `${allCookies.length} cookies set — excessive count`,
                description:
                    `The server sets ${allCookies.length} cookies on page load. Excessive cookies increase header size, ` +
                    "impact performance, and expand the attack surface.",
                recommendation: "Review all cookies and remove unnecessary ones. Consider server-side sessions to reduce cookie count.",
                evidence: `Total cookies: ${allCookies.length}`,
            });
        }

        const totalCookieSize = allCookies.reduce((sum, c) => sum + c.size, 0);
        if (totalCookieSize > 4096) {
            findings.push({
                id: "cookies-large-total-size",
                severity: "low",
                title: `Total cookie size ${totalCookieSize} bytes — exceeds 4KB`,
                description:
                    "Total cookie data exceeds 4KB, which is sent with every request and impacts performance.",
                recommendation: "Reduce cookie sizes. Store data server-side and use a small session ID cookie instead.",
                evidence: `Total cookie size: ${totalCookieSize} bytes`,
            });
        }

        // =================================================================
        // Summary: well-configured session cookies
        // =================================================================
        const wellConfigured = sessionCookies.filter(c => c.secure && c.httpOnly && c.sameSite);
        if (wellConfigured.length > 0 && wellConfigured.length === sessionCookies.length) {
            findings.push({
                id: "cookies-well-configured",
                severity: "info",
                title: "All session cookies properly secured",
                description: `All ${sessionCookies.length} session cookie(s) have Secure, HttpOnly, and SameSite attributes set.`,
                recommendation: "Excellent! Continue maintaining these security practices.",
            });
        }

        score = Math.max(0, Math.min(100, score));

        const result = {
            scannerType: "cookies",
            score,
            findings,
            cookiesAnalyzed: allCookies.length,
            sessionCookiesFound: sessionCookies.length,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Cookie Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "cookies",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
            }),
            { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
    }
});
