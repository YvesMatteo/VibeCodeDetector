import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * CSRF Scanner
 * Detects Cross-Site Request Forgery vulnerabilities by analyzing:
 *
 *  1. Forms without CSRF tokens
 *  2. Cookie SameSite attributes
 *  3. Missing Origin/Referer validation indicators
 *  4. State-changing endpoints accessible via GET
 *  5. Custom header requirements for APIs (X-Requested-With, etc.)
 */

const USER_AGENT = "CheckVibe-CSRFScanner/1.0";
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

interface FormInfo {
    action: string;
    method: string;
    hasCSRFToken: boolean;
    csrfFieldName?: string;
    inputCount: number;
    isStateChanging: boolean; // POST/PUT/DELETE/PATCH
    id?: string;
    name?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = FETCH_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
            "User-Agent": USER_AGENT,
            ...(options.headers || {}),
        },
    }).finally(() => clearTimeout(timer));
}

// Common CSRF token field names / patterns
const CSRF_TOKEN_NAMES = [
    /csrf/i,
    /xsrf/i,
    /_token/i,
    /authenticity.?token/i,
    /request.?verification.?token/i,
    /__RequestVerificationToken/i,
    /antiforgery/i,
    /csrfmiddlewaretoken/i, // Django
    /_csrf_token/i,         // Phoenix
    /form_?key/i,
    /nonce/i,
];

/**
 * Check if a form input name looks like a CSRF token.
 */
function isCSRFTokenName(name: string): boolean {
    return CSRF_TOKEN_NAMES.some(pattern => pattern.test(name));
}

/**
 * Extract forms from HTML source using regex (no DOM parser in Edge Functions).
 */
function extractForms(html: string, baseUrl: string): FormInfo[] {
    const forms: FormInfo[] = [];
    // Match <form> ... </form> blocks (non-greedy, case-insensitive)
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch: RegExpExecArray | null;

    while ((formMatch = formRegex.exec(html)) !== null) {
        const attrs = formMatch[1];
        const body = formMatch[2];

        // Extract method
        const methodMatch = attrs.match(/method\s*=\s*["'](\w+)["']/i);
        const method = (methodMatch?.[1] || "GET").toUpperCase();

        // Extract action
        const actionMatch = attrs.match(/action\s*=\s*["']([^"']*)["']/i);
        let action = actionMatch?.[1] || "";
        if (action && !action.startsWith("http")) {
            try {
                action = new URL(action, baseUrl).href;
            } catch {
                // Leave as-is
            }
        }

        // Extract id and name
        const idMatch = attrs.match(/id\s*=\s*["']([^"']*)["']/i);
        const nameMatch = attrs.match(/name\s*=\s*["']([^"']*)["']/i);

        // Find all <input> fields
        const inputRegex = /<input\b([^>]*)>/gi;
        let inputMatch: RegExpExecArray | null;
        let inputCount = 0;
        let hasCSRFToken = false;
        let csrfFieldName: string | undefined;

        while ((inputMatch = inputRegex.exec(body)) !== null) {
            inputCount++;
            const inputAttrs = inputMatch[1];
            const nameVal = inputAttrs.match(/name\s*=\s*["']([^"']*)["']/i)?.[1] || "";
            const typeVal = (inputAttrs.match(/type\s*=\s*["']([^"']*)["']/i)?.[1] || "text").toLowerCase();

            // Check if this is a hidden input with a CSRF-looking name
            if (typeVal === "hidden" && isCSRFTokenName(nameVal)) {
                hasCSRFToken = true;
                csrfFieldName = nameVal;
            }
        }

        // Also check for <meta> tag CSRF tokens (Rails, Laravel patterns)
        // These are page-level, but affect all forms
        const metaCSRFRegex = /<meta\s+[^>]*name\s*=\s*["'](csrf[-_]?token|_csrf|csrfmiddlewaretoken)["'][^>]*>/gi;
        if (metaCSRFRegex.test(html)) {
            hasCSRFToken = true;
            csrfFieldName = csrfFieldName || "meta-csrf-token";
        }

        const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

        forms.push({
            action,
            method,
            hasCSRFToken,
            csrfFieldName,
            inputCount,
            isStateChanging,
            id: idMatch?.[1],
            name: nameMatch?.[1],
        });
    }

    return forms;
}

/**
 * Parse Set-Cookie headers and extract SameSite info.
 */
function analyzeCookies(headers: Headers): {
    cookies: Array<{ name: string; sameSite: string | null; secure: boolean; httpOnly: boolean }>;
} {
    const cookies: Array<{ name: string; sameSite: string | null; secure: boolean; httpOnly: boolean }> = [];

    // Collect set-cookie headers
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
        const name = nameValue.split("=")[0] || "";
        const lower = cookieStr.toLowerCase();

        let sameSite: string | null = null;
        const sameSiteMatch = lower.match(/samesite\s*=\s*(strict|lax|none)/i);
        if (sameSiteMatch) sameSite = sameSiteMatch[1];

        cookies.push({
            name,
            sameSite,
            secure: lower.includes("secure"),
            httpOnly: lower.includes("httponly"),
        });
    }

    return { cookies };
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
            status: 405,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }
        const targetUrl = validation.url!;

        const findings: Finding[] = [];
        let score = 100;

        // =================================================================
        // Step 1: Fetch the target page
        // =================================================================
        let html = "";
        let response: Response;
        try {
            response = await fetchWithTimeout(targetUrl, { method: "GET" });
            html = await response.text();
        } catch (e) {
            return new Response(
                JSON.stringify({
                    scannerType: "csrf",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                }),
                {
                    status: 200,
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // =================================================================
        // Step 2: Analyze forms for CSRF tokens
        // =================================================================
        const forms = extractForms(html, targetUrl);
        const stateChangingForms = forms.filter(f => f.isStateChanging);

        let formsWithoutCSRF = 0;
        let formsWithCSRF = 0;

        for (const form of stateChangingForms) {
            const formLabel = form.id || form.name || form.action || "(unnamed form)";

            if (!form.hasCSRFToken) {
                formsWithoutCSRF++;
                const deduction = Math.min(15, formsWithoutCSRF * 10);
                score -= deduction;
                findings.push({
                    id: `csrf-no-token-${formsWithoutCSRF}`,
                    severity: "high",
                    title: `${form.method} form missing CSRF token`,
                    description:
                        `A ${form.method} form (${formLabel}) does not contain a CSRF token. ` +
                        "An attacker can craft a page that submits this form on behalf of an authenticated user, " +
                        "potentially changing their password, email, or other account settings.",
                    recommendation:
                        "Add a CSRF token as a hidden input field. Use your framework's built-in CSRF protection: " +
                        "Django ({% csrf_token %}), Rails (form_authenticity_token), Next.js (csrf npm package), " +
                        "Laravel (@csrf).",
                    evidence: `Form: ${form.method} ${form.action || "(same page)"}, ${form.inputCount} inputs, no CSRF token found`,
                });
            } else {
                formsWithCSRF++;
            }
        }

        // Report forms with CSRF tokens as positive
        if (formsWithCSRF > 0) {
            findings.push({
                id: "csrf-tokens-present",
                severity: "info",
                title: `${formsWithCSRF} form(s) have CSRF protection`,
                description:
                    `Found ${formsWithCSRF} state-changing form(s) with CSRF tokens. ` +
                    "This is good practice for preventing cross-site request forgery.",
                recommendation: "Continue using CSRF tokens on all state-changing forms.",
            });
        }

        // GET forms that look state-changing (search is fine, but delete/update/action GET forms are bad)
        // Use word boundaries and require action verbs (not substrings like "reset-password-link")
        const suspiciousGetForms = forms.filter(f => {
            if (f.method !== "GET") return false;
            const actionLower = (f.action || "").toLowerCase();
            // Must match action verb at a path boundary (after / or at start), not as substring
            return /\/(delete|remove|destroy|drop)\b/i.test(actionLower) ||
                /[?&](action|do)=(delete|remove|update|destroy)/i.test(actionLower);
        });

        for (const form of suspiciousGetForms) {
            score -= 10;
            findings.push({
                id: `csrf-get-state-change-${form.action || 'unknown'}`,
                severity: "high",
                title: "State-changing action uses GET method",
                description:
                    `A form submitting to "${form.action}" uses GET method. ` +
                    "State-changing operations (delete, update, create) should use POST/PUT/DELETE, " +
                    "as GET requests can be triggered by simply loading a URL (img tags, links, iframes).",
                recommendation:
                    'Change this form to use method="POST" and add a CSRF token.',
                evidence: `GET form to: ${form.action}`,
            });
        }

        // =================================================================
        // Step 3: Analyze cookies for SameSite
        // =================================================================
        const { cookies } = analyzeCookies(response!.headers);
        // Match cookies that look like session identifiers using inclusive/partial matching.
        // This catches cookies like auth_session, sid_v2, session_management, auth_token, etc.
        const sessionCookies = cookies.filter(c => {
            const name = c.name.toLowerCase();
            return /session|sid|auth.*token|csrf/i.test(name) ||
                /^sb-[a-z]+-auth-token/i.test(name);  // Supabase auth cookies
        });

        for (const cookie of sessionCookies) {
            if (!cookie.sameSite) {
                score -= 8;
                findings.push({
                    id: `csrf-cookie-no-samesite-${cookie.name}`,
                    severity: "medium",
                    title: `Session cookie "${cookie.name}" missing SameSite`,
                    description:
                        `The cookie "${cookie.name}" does not set a SameSite attribute. ` +
                        "Without SameSite, this cookie will be sent on cross-site requests, " +
                        "making CSRF attacks possible even without other protections.",
                    recommendation:
                        "Set SameSite=Lax (recommended default) or SameSite=Strict on all session cookies. " +
                        "Use SameSite=None only if cross-site cookie access is explicitly needed (and add Secure flag).",
                    evidence: `Cookie: ${cookie.name}, SameSite: not set`,
                });
            } else if (cookie.sameSite.toLowerCase() === "none") {
                if (!cookie.secure) {
                    score -= 10;
                    findings.push({
                        id: `csrf-cookie-samesite-none-insecure-${cookie.name}`,
                        severity: "high",
                        title: `Cookie "${cookie.name}" has SameSite=None without Secure`,
                        description:
                            `The cookie "${cookie.name}" is set with SameSite=None but without the Secure flag. ` +
                            "Modern browsers reject this, but older browsers may still send it, enabling CSRF.",
                        recommendation:
                            "Always pair SameSite=None with the Secure flag. Better yet, use SameSite=Lax unless cross-site access is needed.",
                        evidence: `Cookie: ${cookie.name}, SameSite=None, Secure: no`,
                    });
                } else {
                    score -= 5;
                    findings.push({
                        id: `csrf-cookie-samesite-none-${cookie.name}`,
                        severity: "medium",
                        title: `Session cookie "${cookie.name}" uses SameSite=None`,
                        description:
                            `The cookie "${cookie.name}" is set with SameSite=None, allowing it to be sent on cross-site requests. ` +
                            "This disables CSRF protection from the SameSite attribute and requires other mitigations.",
                        recommendation:
                            "Use SameSite=Lax unless your application specifically needs cross-site cookie access. " +
                            "If SameSite=None is required, ensure CSRF tokens are used on all state-changing forms.",
                        evidence: `Cookie: ${cookie.name}, SameSite=None, Secure: yes`,
                    });
                }
            } else if (cookie.sameSite.toLowerCase() === "lax" || cookie.sameSite.toLowerCase() === "strict") {
                findings.push({
                    id: `csrf-cookie-samesite-good-${cookie.name}`,
                    severity: "info",
                    title: `Cookie "${cookie.name}" has SameSite=${cookie.sameSite}`,
                    description:
                        `The session cookie "${cookie.name}" has SameSite=${cookie.sameSite}, providing built-in CSRF protection.`,
                    recommendation: "Good. Continue using SameSite on all session cookies.",
                });
            }
        }

        // =================================================================
        // Step 4: Check for meta tags and headers indicating CSRF awareness
        // =================================================================

        // Check for X-Frame-Options or CSP frame-ancestors (prevents clickjacking, related to CSRF)
        const xfo = response!.headers.get("X-Frame-Options");
        const csp = response!.headers.get("Content-Security-Policy");
        const hasFrameProtection = xfo || csp?.toLowerCase().includes("frame-ancestors");

        if (!hasFrameProtection) {
            score -= 5;
            findings.push({
                id: "csrf-no-frame-protection",
                severity: "medium",
                title: "No clickjacking protection detected",
                description:
                    "Neither X-Frame-Options nor CSP frame-ancestors are set. " +
                    "This allows the site to be embedded in iframes on attacker pages, " +
                    "enabling clickjacking attacks (a form of CSRF).",
                recommendation:
                    "Add X-Frame-Options: DENY (or SAMEORIGIN) or use CSP's frame-ancestors directive.",
            });
        }

        // Check for Fetch metadata support hints (Sec-Fetch-* headers in responses)
        // We can't directly check server-side Sec-Fetch validation, but we can note the absence
        // of any indication of modern CSRF protections
        if (stateChangingForms.length > 0 && formsWithoutCSRF === stateChangingForms.length &&
            sessionCookies.every(c => !c.sameSite || c.sameSite.toLowerCase() === "none")) {
            score -= 10;
            findings.push({
                id: "csrf-no-protection-at-all",
                severity: "critical",
                title: "No CSRF protection detected",
                description:
                    "This site has state-changing forms without CSRF tokens AND session cookies without SameSite protection. " +
                    "This combination makes the site highly vulnerable to cross-site request forgery attacks, " +
                    "where an attacker can trick authenticated users into performing unwanted actions.",
                recommendation:
                    "Implement at minimum one of: (1) CSRF tokens on all POST forms, " +
                    "(2) SameSite=Lax/Strict on session cookies, (3) Double-submit cookie pattern, " +
                    "(4) Custom request header requirement (X-Requested-With).",
            });
        }

        // =================================================================
        // Step 5: Summary if no forms found
        // =================================================================
        if (forms.length === 0) {
            findings.push({
                id: "csrf-no-forms",
                severity: "info",
                title: "No HTML forms detected",
                description:
                    "No HTML forms were found on this page. CSRF via form submission is not applicable, " +
                    "but API endpoints may still be vulnerable if they rely on cookie-based authentication.",
                recommendation:
                    "If your application uses API endpoints with cookie auth, ensure they validate " +
                    "Origin/Referer headers or require custom headers (X-Requested-With) that trigger CORS preflight.",
            });
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const result = {
            scannerType: "csrf",
            score,
            findings,
            formsAnalyzed: forms.length,
            stateChangingForms: stateChangingForms.length,
            formsWithCSRFTokens: formsWithCSRF,
            cookiesAnalyzed: cookies.length,
            sessionCookiesAnalyzed: sessionCookies.length,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("CSRF Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "csrf",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
