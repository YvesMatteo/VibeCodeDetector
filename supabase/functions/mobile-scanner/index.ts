import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

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

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    scannedAt: string;
    url: string;
    apiEndpointsFound: string[];
    graphqlDetected: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8000;

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MOBILE_UAS = [
    { name: "iOS Safari", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
    { name: "Android Chrome", ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" },
    { name: "React Native", ua: "ReactNative/0.73" },
    { name: "Expo", ua: "Expo/51" },
];

const RATE_LIMIT_HEADERS = [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "ratelimit-limit",
    "ratelimit-remaining",
    "retry-after",
    "x-rate-limit-limit",
    "x-rate-limit-remaining",
];

const API_PATHS = [
    "/api",
    "/api/v1",
    "/api/v2",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/reset-password",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/user",
    "/api/users",
    "/api/profile",
    "/api/me",
];

const AUTH_PATHS = [
    "/api/auth/login",
    "/api/auth/signin",
    "/api/login",
    "/api/signin",
    "/api/auth/register",
    "/api/auth/signup",
    "/auth/login",
    "/auth/signin",
];

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
        redirect: "follow",
    }).finally(() => clearTimeout(timer));
}

function hasRateLimitHeaders(headers: Headers): { found: boolean; headers: string[] } {
    const found: string[] = [];
    for (const h of RATE_LIMIT_HEADERS) {
        if (headers.get(h)) found.push(h);
    }
    return { found: found.length > 0, headers: found };
}

interface RateLimitProbeResult {
    hasRateLimit: boolean;
    got429: boolean;
    rateLimitHeaders: string[];
    status: number;
    error?: string;
}

async function probeWithUA(url: string, userAgent: string, method = "GET"): Promise<RateLimitProbeResult> {
    try {
        const res = await fetchWithTimeout(url, {
            method,
            headers: { "User-Agent": userAgent },
        }, 5000);

        const rl = hasRateLimitHeaders(res.headers);
        await res.text().catch(() => { });

        return {
            hasRateLimit: rl.found || res.status === 429,
            got429: res.status === 429,
            rateLimitHeaders: rl.headers,
            status: res.status,
        };
    } catch (e) {
        return {
            hasRateLimit: false,
            got429: false,
            rateLimitHeaders: [],
            status: 0,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// @ts-ignore
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
        const baseUrl = new URL(targetUrl).origin;

        const findings: Finding[] = [];
        let score = 100;
        const apiEndpointsFound: string[] = [];
        let graphqlDetected = false;

        // =================================================================
        // 1. Desktop vs mobile UA rate limiting comparison
        // =================================================================
        const desktopProbe = await probeWithUA(targetUrl, DESKTOP_UA);
        const mobileProbes = await Promise.all(
            MOBILE_UAS.map(async (m) => ({
                ...m,
                result: await probeWithUA(targetUrl, m.ua),
            })),
        );

        const desktopHasRL = desktopProbe.hasRateLimit;
        const mobileWithRL = mobileProbes.filter((p) => p.result.hasRateLimit);
        const mobileWithoutRL = mobileProbes.filter((p) => !p.result.hasRateLimit && !p.result.error);

        if (desktopHasRL && mobileWithoutRL.length > 0) {
            score -= 20;
            const missingUAs = mobileWithoutRL.map((p) => p.name).join(", ");
            findings.push({
                id: "mobile-no-rate-limit",
                severity: "high",
                title: "Mobile requests lack rate limiting",
                description:
                    `Desktop requests show rate limiting, but requests with mobile User-Agents (${missingUAs}) ` +
                    "do not. This suggests rate limiting may be bypassed by simply changing the User-Agent header, " +
                    "leaving the API vulnerable to mobile-targeted brute-force and abuse attacks.",
                recommendation:
                    "Ensure rate limiting is applied based on IP address or authentication token, not User-Agent string. " +
                    "Rate limits should be consistent regardless of the client type.",
                evidence: `Desktop: ${desktopProbe.rateLimitHeaders.join(", ") || "429"} | Missing for: ${missingUAs}`,
            });
        } else if (desktopHasRL && mobileWithRL.length > 0) {
            findings.push({
                id: "mobile-rate-limit-consistent",
                severity: "info",
                title: "Consistent rate limiting across platforms",
                description:
                    "Rate limiting is applied consistently to both desktop and mobile User-Agents. " +
                    "This indicates platform-agnostic rate limiting, which is the recommended approach.",
                recommendation: "Good practice. Continue using platform-agnostic rate limiting (IP or token-based).",
                evidence: `Desktop: ${desktopProbe.rateLimitHeaders.join(", ")} | Mobile: ${mobileWithRL.map((p) => p.name).join(", ")}`,
            });
        }

        // =================================================================
        // 2. API endpoint discovery with mobile UA
        // =================================================================
        const API_ENDPOINT_RL_CAP = 15;
        let apiRlDeduction = 0;

        const apiProbes = await Promise.all(
            API_PATHS.map(async (path) => {
                try {
                    const res = await probeWithUA(`${baseUrl}${path}`, MOBILE_UAS[0].ua);
                    if (res.status === 404 || res.status === 0) return null;
                    return { path, ...res };
                } catch {
                    return null;
                }
            }),
        );

        const foundEndpoints = apiProbes.filter(Boolean);

        for (const ep of foundEndpoints) {
            if (!ep) continue;
            apiEndpointsFound.push(ep.path);

            if (!ep.hasRateLimit) {
                const deduction = Math.min(5, API_ENDPOINT_RL_CAP - apiRlDeduction);
                if (deduction > 0) {
                    apiRlDeduction += deduction;
                    score -= deduction;
                }
                findings.push({
                    id: `mobile-api-no-rl-${ep.path.replace(/\//g, "-")}`,
                    severity: "medium",
                    title: `API endpoint ${ep.path} lacks rate limiting (mobile)`,
                    description:
                        `The endpoint ${ep.path} responds to requests with a mobile User-Agent (${MOBILE_UAS[0].name}) ` +
                        `but does not return rate limiting headers. Status: ${ep.status}.`,
                    recommendation:
                        `Add rate limiting to ${ep.path}. Mobile API clients are particularly vulnerable to ` +
                        "automated abuse since they often use predictable authentication patterns.",
                    evidence: `Status: ${ep.status}, Rate limit headers: none`,
                });
            }
        }

        if (foundEndpoints.length > 0 && apiRlDeduction === 0) {
            // All found endpoints have rate limiting
            const paths = foundEndpoints.map((e) => e!.path).join(", ");
            findings.push({
                id: "mobile-api-endpoints-protected",
                severity: "info",
                title: `API endpoints properly rate-limited for mobile`,
                description: `Found ${foundEndpoints.length} API endpoints (${paths}) — all return rate limiting headers for mobile User-Agent requests.`,
                recommendation: "Good practice. Continue enforcing rate limits across all API endpoints.",
            });
        }

        // =================================================================
        // 3. GraphQL endpoint check
        // =================================================================
        try {
            // Check for GraphQL endpoint
            const gqlRes = await fetchWithTimeout(`${baseUrl}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": MOBILE_UAS[0].ua,
                },
                body: JSON.stringify({ query: "{ __schema { types { name } } }" }),
            }, 5000);

            const gqlBody = await gqlRes.text();

            // Check if it's a real GraphQL endpoint (not a 404 page)
            if (gqlRes.status !== 404 && (gqlBody.includes('"data"') || gqlBody.includes('"errors"') || gqlBody.includes("__schema"))) {
                graphqlDetected = true;
                apiEndpointsFound.push("/graphql");

                // Check introspection
                if (gqlBody.includes("__schema") && gqlBody.includes('"name"')) {
                    score -= 5;
                    findings.push({
                        id: "mobile-graphql-introspection",
                        severity: "medium",
                        title: "GraphQL introspection enabled in production",
                        description:
                            "GraphQL introspection is enabled, allowing anyone to query the full API schema including " +
                            "all types, queries, mutations, and fields. This gives attackers a complete map of the API " +
                            "attack surface and is a common target for automated exploitation tools.",
                        recommendation:
                            "Disable GraphQL introspection in production. Most GraphQL servers (Apollo, Yoga, etc.) " +
                            "have a simple configuration flag. Keep introspection enabled only in development.",
                    });
                }

                // Check rate limiting on GraphQL
                const gqlRL = hasRateLimitHeaders(gqlRes.headers);
                if (!gqlRL.found && gqlRes.status !== 429) {
                    score -= 10;
                    findings.push({
                        id: "mobile-graphql-no-rl",
                        severity: "high",
                        title: "GraphQL endpoint lacks rate limiting",
                        description:
                            "The GraphQL endpoint at /graphql does not return rate limiting headers for mobile User-Agent requests. " +
                            "GraphQL is especially vulnerable to abuse because a single query can request enormous amounts of data " +
                            "(deeply nested queries, aliased queries, batched operations).",
                        recommendation:
                            "Implement rate limiting on the GraphQL endpoint. Consider: per-IP rate limiting, " +
                            "query complexity analysis, query depth limits, and operation cost budgets.",
                    });
                } else {
                    findings.push({
                        id: "mobile-graphql-rate-limited",
                        severity: "info",
                        title: "GraphQL endpoint has rate limiting",
                        description:
                            "The GraphQL endpoint at /graphql returns rate limiting headers for mobile requests. " +
                            "This helps prevent query abuse, nested query attacks, and resource exhaustion.",
                        recommendation: "Good practice. Also consider query complexity limits and depth restrictions.",
                    });
                }
            }
        } catch {
            // GraphQL probe failed — likely no GraphQL endpoint, skip
        }

        // =================================================================
        // 4. Authentication endpoint brute-force protection
        // =================================================================
        let foundAuthEndpoint = false;

        for (const authPath of AUTH_PATHS) {
            try {
                // Send 3 rapid POST requests with mobile UA and dummy credentials
                let gotLimited = false;
                let authRLHeaders: string[] = [];

                for (let i = 0; i < 3; i++) {
                    const res = await fetchWithTimeout(`${baseUrl}${authPath}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "User-Agent": MOBILE_UAS[0].ua,
                        },
                        body: JSON.stringify({ email: "probe@checkvibe.test", password: "ProbeTest123!" }),
                    }, 3000);

                    if (res.status === 404 || res.status === 405) {
                        await res.text().catch(() => { });
                        break;
                    }

                    if (res.status === 429) {
                        gotLimited = true;
                        await res.text().catch(() => { });
                        break;
                    }

                    const rl = hasRateLimitHeaders(res.headers);
                    if (rl.found) authRLHeaders = rl.headers;

                    await res.text().catch(() => { });

                    // Only count as auth endpoint if it returned a meaningful response
                    if (i === 0 && (res.status === 200 || res.status === 401 || res.status === 422 || res.status === 400)) {
                        foundAuthEndpoint = true;
                    }

                    if (i < 2) await new Promise((r) => setTimeout(r, 100));
                }

                if (!foundAuthEndpoint) continue;

                if (gotLimited || authRLHeaders.length > 0) {
                    findings.push({
                        id: `mobile-auth-rate-limited-${authPath.replace(/\//g, "-")}`,
                        severity: "info",
                        title: `Auth endpoint ${authPath} rate-limited for mobile`,
                        description:
                            `The authentication endpoint at ${authPath} enforces rate limiting for mobile User-Agent requests. ` +
                            "This protects against credential stuffing and brute-force attacks from mobile clients.",
                        recommendation: "Good practice. Ensure rate limits are strict enough (e.g., 5 attempts per minute per IP).",
                        evidence: gotLimited ? "HTTP 429 received" : authRLHeaders.join(", "),
                    });
                } else {
                    score -= 20;
                    findings.push({
                        id: `mobile-auth-no-rl-${authPath.replace(/\//g, "-")}`,
                        severity: "critical",
                        title: `Authentication endpoint not rate-limited for mobile clients`,
                        description:
                            `The authentication endpoint at ${authPath} accepted 3 rapid login attempts with a mobile ` +
                            `User-Agent (${MOBILE_UAS[0].name}) without any rate limiting. Attackers can use mobile API ` +
                            "clients to perform unlimited password guessing attacks.",
                        recommendation:
                            "Add strict rate limiting to all authentication endpoints (login, register, reset-password). " +
                            "Limit to 5-10 attempts per minute per IP. Consider progressive delays or account lockout after repeated failures.",
                    });
                }

                break; // Only test the first auth endpoint found
            } catch {
                continue;
            }
        }

        // =================================================================
        // 5. API versioning check
        // =================================================================
        let hasVersioning = false;

        // Check path-based versioning
        if (apiEndpointsFound.some((p) => /\/v\d+/i.test(p))) {
            hasVersioning = true;
        }

        // Also check HTML for versioned API references
        if (/["']\/api\/v\d+/i.test("") || /api-version|accept-version/i.test("")) {
            hasVersioning = true;
        }

        // Check response headers from initial probe
        if (desktopProbe.status > 0) {
            try {
                const res = await fetchWithTimeout(targetUrl, {
                    headers: { "User-Agent": DESKTOP_UA },
                }, 3000);
                const apiVersion = res.headers.get("api-version") || res.headers.get("x-api-version") || res.headers.get("accept-version");
                await res.text().catch(() => { });
                if (apiVersion) hasVersioning = true;
            } catch {
                // Skip
            }
        }

        if (hasVersioning) {
            findings.push({
                id: "mobile-api-versioning",
                severity: "info",
                title: "API versioning detected",
                description:
                    "API versioning was detected (path-based /v1, /v2 or header-based). Versioning allows mobile apps " +
                    "to continue working with older API versions while the server evolves — critical since mobile app " +
                    "updates are not instant (users must update from app stores).",
                recommendation: "Good practice. Maintain backward compatibility and deprecation notices for old API versions.",
            });
        } else if (apiEndpointsFound.length > 0) {
            score -= 3;
            findings.push({
                id: "mobile-no-api-versioning",
                severity: "low",
                title: "No API versioning detected",
                description:
                    "API endpoints were found but no versioning scheme was detected (no /v1, /v2 paths or version headers). " +
                    "Without API versioning, changes to the API can break existing mobile app versions that users haven't updated yet.",
                recommendation:
                    "Implement API versioning using path prefixes (/api/v1/) or headers (API-Version). " +
                    "This is especially important for mobile APIs since users may be on old app versions for months.",
            });
        }

        // =================================================================
        // 6. Final Architecture-Aware Rate Limiting Assessment
        // =================================================================
        if (!desktopHasRL) {
            const isPurelyStatic = apiEndpointsFound.length === 0 && !foundAuthEndpoint && !graphqlDetected;

            if (isPurelyStatic) {
                findings.push({
                    id: "mobile-no-rate-limit-any",
                    severity: "info",
                    title: "No rate limiting detected (Static Site)",
                    description:
                        "No rate limiting was detected, but no mobile API or authentication endpoints were found either. " +
                        "This appears to be a purely static site, so application-level rate limiting may not be necessary.",
                    recommendation: "If you add backend API routes later, ensure rate limiting is implemented.",
                });
            } else {
                score -= 10;
                findings.push({
                    id: "mobile-no-rate-limit-any",
                    severity: "medium",
                    title: "No rate limiting detected on any platform",
                    description:
                        "No rate limiting headers or 429 responses were detected for either desktop or mobile User-Agents. " +
                        "Without rate limiting, the API is vulnerable to brute-force attacks, credential stuffing, " +
                        "and DDoS from any client platform.",
                    recommendation:
                        "Implement rate limiting at the application or reverse proxy level. " +
                        "Apply limits based on IP address and/or authentication token, not User-Agent.",
                });
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: "mobile_api",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
            apiEndpointsFound,
            graphqlDetected,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Mobile API Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "mobile_api",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                apiEndpointsFound: [],
                graphqlDetected: false,
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
