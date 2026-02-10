import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * CORS Scanner
 * Performs deep Cross-Origin Resource Sharing misconfiguration detection.
 *
 * Tests:
 *  1. Origin reflection (reflects arbitrary origins back)
 *  2. Wildcard origin with credentials
 *  3. Null origin acceptance
 *  4. Subdomain wildcard bypass (prefix/suffix matching)
 *  5. Credential leakage via CORS
 *  6. Exposed HTTP methods
 *  7. Preflight cache duration analysis
 *  8. Internal/private origin acceptance
 */

const USER_AGENT = "CheckVibe-CORSScanner/1.0";
const PROBE_TIMEOUT_MS = 8000;

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

interface CORSProbeResult {
    origin: string;
    acao: string | null;      // Access-Control-Allow-Origin
    acac: string | null;      // Access-Control-Allow-Credentials
    acam: string | null;      // Access-Control-Allow-Methods
    acah: string | null;      // Access-Control-Allow-Headers
    acma: string | null;      // Access-Control-Max-Age
    aceh: string | null;      // Access-Control-Expose-Headers
    status: number;
    error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = PROBE_TIMEOUT_MS,
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

/**
 * Send a CORS probe request with a specific Origin header.
 * Tests both simple and preflight (OPTIONS) requests.
 */
async function probeCORS(
    targetUrl: string,
    origin: string,
    method: "GET" | "OPTIONS" = "GET",
): Promise<CORSProbeResult> {
    try {
        const headers: Record<string, string> = {
            Origin: origin,
        };

        if (method === "OPTIONS") {
            headers["Access-Control-Request-Method"] = "POST";
            headers["Access-Control-Request-Headers"] = "Content-Type, Authorization";
        }

        const response = await fetchWithTimeout(targetUrl, {
            method,
            headers,
        });

        return {
            origin,
            acao: response.headers.get("Access-Control-Allow-Origin"),
            acac: response.headers.get("Access-Control-Allow-Credentials"),
            acam: response.headers.get("Access-Control-Allow-Methods"),
            acah: response.headers.get("Access-Control-Allow-Headers"),
            acma: response.headers.get("Access-Control-Max-Age"),
            aceh: response.headers.get("Access-Control-Expose-Headers"),
            status: response.status,
        };
    } catch (e) {
        return {
            origin,
            acao: null, acac: null, acam: null, acah: null, acma: null, aceh: null,
            status: 0,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

/**
 * Extract the base domain from a URL (e.g., "https://example.com" -> "example.com").
 */
function extractDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return "";
    }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight for our own endpoint
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
        const targetDomain = extractDomain(targetUrl);

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // =================================================================
        // Define test origins for probing
        // =================================================================
        const testOrigins = [
            // 1. Completely foreign origin
            { origin: "https://evil.com", label: "foreign origin" },
            // 2. Null origin (used in sandboxed iframes, data: URIs, file:// pages)
            { origin: "null", label: "null origin" },
            // 3. Subdomain prefix attack (attacker.target.com)
            { origin: `https://attacker.${targetDomain}`, label: "subdomain prefix" },
            // 4. Domain suffix attack (target.com.evil.com)
            { origin: `https://${targetDomain}.evil.com`, label: "domain suffix bypass" },
            // 5. HTTP downgrade (same domain, insecure protocol)
            { origin: `http://${targetDomain}`, label: "HTTP downgrade" },
            // 6. Internal/private origin
            { origin: "http://localhost", label: "localhost origin" },
            { origin: "http://127.0.0.1", label: "loopback IP origin" },
            { origin: "http://192.168.1.1", label: "private network origin" },
        ];

        // =================================================================
        // Run all probes in parallel (both GET and OPTIONS preflight)
        // =================================================================
        const probePromises: Promise<{ result: CORSProbeResult; label: string; method: string }>[] = [];

        for (const { origin, label } of testOrigins) {
            probePromises.push(
                probeCORS(targetUrl, origin, "GET").then(result => ({ result, label, method: "GET" })),
            );
        }

        // Also run a preflight OPTIONS probe with the evil origin
        probePromises.push(
            probeCORS(targetUrl, "https://evil.com", "OPTIONS").then(result => ({
                result,
                label: "preflight (OPTIONS)",
                method: "OPTIONS",
            })),
        );

        const probeResults = await Promise.all(probePromises);

        // =================================================================
        // Analyze results
        // =================================================================

        // Track what kind of CORS behavior we see
        let hasAnyCORS = false;
        let reflectsArbitraryOrigin = false;
        let reflectsWithCredentials = false;
        let acceptsNullOrigin = false;
        let acceptsSubdomainBypass = false;
        let acceptsDomainSuffix = false;
        let acceptsHTTPDowngrade = false;
        let acceptsPrivateOrigin = false;
        let wildcardDetected = false;
        let wildcardWithCredentials = false;
        const dangerousMethods: string[] = [];
        let preflightMaxAge: number | null = null;

        for (const { result, label, method } of probeResults) {
            if (result.error) continue;
            if (!result.acao) continue;

            hasAnyCORS = true;
            checksRun++;

            const hasCredentials = result.acac?.toLowerCase() === "true";

            // Check wildcard
            if (result.acao === "*") {
                wildcardDetected = true;
                if (hasCredentials) {
                    wildcardWithCredentials = true;
                }
            }

            // Check origin reflection
            if (result.acao === result.origin) {
                if (label === "foreign origin" || label === "preflight (OPTIONS)") {
                    reflectsArbitraryOrigin = true;
                    if (hasCredentials) reflectsWithCredentials = true;
                }
                if (label === "null origin") acceptsNullOrigin = true;
                if (label === "subdomain prefix") acceptsSubdomainBypass = true;
                if (label === "domain suffix bypass") acceptsDomainSuffix = true;
                if (label === "HTTP downgrade") acceptsHTTPDowngrade = true;
                if (label === "localhost origin" || label === "loopback IP origin" || label === "private network origin") {
                    acceptsPrivateOrigin = true;
                }
            }

            // Check dangerous methods in preflight response
            if (method === "OPTIONS" && result.acam) {
                const methods = result.acam.split(",").map(m => m.trim().toUpperCase());
                const dangerous = methods.filter(m => ["PUT", "DELETE", "PATCH"].includes(m));
                dangerousMethods.push(...dangerous);
            }

            // Check preflight cache
            if (method === "OPTIONS" && result.acma) {
                preflightMaxAge = parseInt(result.acma, 10) || null;
            }
        }

        // =================================================================
        // Generate findings
        // =================================================================

        // CRITICAL: Origin reflection with credentials
        if (reflectsWithCredentials) {
            score -= 30;
            findings.push({
                id: "cors-reflected-credentials",
                severity: "critical",
                title: "CORS reflects arbitrary origins with credentials",
                description:
                    "The server reflects any Origin header back in Access-Control-Allow-Origin AND sets Access-Control-Allow-Credentials: true. " +
                    "This allows any attacker website to steal authenticated data, hijack sessions, and perform actions as the user.",
                recommendation:
                    "Implement a strict origin allowlist. Only reflect origins that are explicitly trusted. " +
                    "Never combine origin reflection with Access-Control-Allow-Credentials: true.",
                evidence: "Tested with Origin: https://evil.com → server responded with ACAO: https://evil.com, ACAC: true",
            });
        } else if (reflectsArbitraryOrigin) {
            // HIGH: Origin reflection without credentials
            score -= 15;
            findings.push({
                id: "cors-reflected-origin",
                severity: "high",
                title: "CORS reflects arbitrary origins",
                description:
                    "The server reflects any Origin header back in Access-Control-Allow-Origin. " +
                    "Any website can read responses from this server, potentially exposing sensitive data.",
                recommendation:
                    "Implement a strict origin allowlist. Only reflect origins that are explicitly trusted.",
                evidence: "Tested with Origin: https://evil.com → server responded with ACAO: https://evil.com",
            });
        }

        // CRITICAL: Wildcard + credentials
        if (wildcardWithCredentials) {
            score -= 25;
            findings.push({
                id: "cors-wildcard-credentials",
                severity: "critical",
                title: "CORS wildcard with credentials",
                description:
                    "Access-Control-Allow-Origin: * combined with Access-Control-Allow-Credentials: true. " +
                    "While modern browsers block this, older browsers or misconfigured proxies may still be vulnerable. " +
                    "This is a configuration error that indicates a misunderstanding of CORS.",
                recommendation:
                    "Remove either the wildcard origin or credentials header. Use a specific origin allowlist instead.",
                evidence: "ACAO: *, ACAC: true",
            });
        } else if (wildcardDetected) {
            // MEDIUM: Wildcard without credentials
            score -= 8;
            findings.push({
                id: "cors-wildcard",
                severity: "medium",
                title: "CORS allows any origin (wildcard)",
                description:
                    "Access-Control-Allow-Origin is set to *, allowing any website to read responses. " +
                    "While credentials cannot be sent with wildcard CORS, this may still expose sensitive non-authenticated data.",
                recommendation:
                    "If this is a public API, wildcard may be acceptable. Otherwise, restrict to specific trusted origins.",
                evidence: "ACAO: *",
            });
        }

        // HIGH: Null origin acceptance
        if (acceptsNullOrigin) {
            score -= 15;
            findings.push({
                id: "cors-null-origin",
                severity: "high",
                title: "CORS accepts null origin",
                description:
                    "The server accepts 'null' as a valid Origin. Attackers can send requests with Origin: null using " +
                    "sandboxed iframes (sandbox attribute), data: URIs, or file:// pages, bypassing origin restrictions.",
                recommendation:
                    "Never whitelist 'null' as a valid origin. Remove null from your origin allowlist.",
                evidence: "Tested with Origin: null → server responded with ACAO: null",
            });
        }

        // HIGH: Subdomain bypass
        if (acceptsSubdomainBypass) {
            score -= 10;
            findings.push({
                id: "cors-subdomain-bypass",
                severity: "high",
                title: "CORS vulnerable to subdomain takeover",
                description:
                    `The server accepts attacker-controlled subdomains (attacker.${targetDomain}) as valid origins. ` +
                    "If any subdomain is vulnerable to takeover (dangling DNS, unclaimed cloud resources), " +
                    "an attacker could use it to bypass CORS restrictions.",
                recommendation:
                    "Validate exact origins rather than matching on domain suffix. Audit all subdomains for takeover risk.",
                evidence: `Tested with Origin: https://attacker.${targetDomain} → accepted`,
            });
        }

        // HIGH: Domain suffix bypass
        if (acceptsDomainSuffix) {
            score -= 15;
            findings.push({
                id: "cors-suffix-bypass",
                severity: "high",
                title: "CORS origin validation uses insecure suffix matching",
                description:
                    `The server accepts origins that end with the target domain (${targetDomain}.evil.com). ` +
                    "This indicates the origin validation uses insecure string matching (endsWith/contains) " +
                    "instead of exact comparison, allowing any attacker to bypass CORS.",
                recommendation:
                    "Use exact origin matching or proper URL parsing. Never use string suffix matching for origin validation.",
                evidence: `Tested with Origin: https://${targetDomain}.evil.com → accepted`,
            });
        }

        // MEDIUM: HTTP downgrade
        if (acceptsHTTPDowngrade) {
            score -= 8;
            findings.push({
                id: "cors-http-downgrade",
                severity: "medium",
                title: "CORS accepts HTTP (insecure) origin",
                description:
                    `The server accepts the HTTP version of its own origin (http://${targetDomain}). ` +
                    "An attacker performing a man-in-the-middle attack on the HTTP version could exploit this.",
                recommendation:
                    "Only accept HTTPS origins in your CORS allowlist. Reject HTTP origins even for same-domain.",
                evidence: `Tested with Origin: http://${targetDomain} → accepted`,
            });
        }

        // HIGH: Private/internal origin acceptance
        if (acceptsPrivateOrigin) {
            score -= 12;
            findings.push({
                id: "cors-private-origin",
                severity: "high",
                title: "CORS accepts private/internal origins",
                description:
                    "The server accepts localhost, 127.0.0.1, or private network IPs as valid origins. " +
                    "This may indicate the server blindly reflects origins or has debug/development CORS settings in production.",
                recommendation:
                    "Remove localhost and private IP addresses from CORS allowlists in production. " +
                    "Use environment-specific CORS configuration.",
                evidence: "Tested with Origin: http://localhost → accepted",
            });
        }

        // MEDIUM: Dangerous HTTP methods exposed
        const uniqueDangerousMethods = [...new Set(dangerousMethods)];
        if (uniqueDangerousMethods.length > 0) {
            score -= 5;
            findings.push({
                id: "cors-dangerous-methods",
                severity: "medium",
                title: "CORS exposes dangerous HTTP methods",
                description:
                    `The CORS preflight response allows potentially dangerous methods: ${uniqueDangerousMethods.join(", ")}. ` +
                    "These methods can modify or delete server-side resources if exploited with CORS bypass.",
                recommendation:
                    "Only expose the minimum necessary HTTP methods. Remove PUT, DELETE, PATCH unless required for cross-origin use.",
                evidence: `Access-Control-Allow-Methods includes: ${uniqueDangerousMethods.join(", ")}`,
            });
        }

        // LOW: Preflight cache too long or too short
        if (preflightMaxAge !== null) {
            if (preflightMaxAge > 86400) {
                findings.push({
                    id: "cors-preflight-cache-long",
                    severity: "low",
                    title: "CORS preflight cache duration is very long",
                    description:
                        `Access-Control-Max-Age is set to ${preflightMaxAge} seconds (${Math.round(preflightMaxAge / 3600)} hours). ` +
                        "Changes to CORS policy will take a long time to propagate to clients.",
                    recommendation:
                        "Consider a shorter preflight cache duration (e.g., 3600 seconds / 1 hour) to balance performance and flexibility.",
                    evidence: `Access-Control-Max-Age: ${preflightMaxAge}`,
                });
            } else if (preflightMaxAge < 60) {
                findings.push({
                    id: "cors-preflight-cache-short",
                    severity: "info",
                    title: "CORS preflight cache duration is very short",
                    description:
                        `Access-Control-Max-Age is set to ${preflightMaxAge} seconds. ` +
                        "This causes frequent preflight requests, affecting performance for cross-origin API calls.",
                    recommendation:
                        "Consider increasing Access-Control-Max-Age to at least 600 seconds (10 minutes) for better performance.",
                    evidence: `Access-Control-Max-Age: ${preflightMaxAge}`,
                });
            }
        }

        // INFO: No CORS headers detected at all
        if (!hasAnyCORS) {
            findings.push({
                id: "cors-no-headers",
                severity: "info",
                title: "No CORS headers detected",
                description:
                    "The server does not return any CORS headers, meaning cross-origin requests from browsers will be blocked by default. " +
                    "This is secure for same-origin applications, but may indicate missing CORS if cross-origin access is needed.",
                recommendation:
                    "If this is a same-origin application, no CORS headers are needed (this is the most secure default). " +
                    "If cross-origin access is required, configure specific allowed origins.",
            });
            // No CORS = secure by default, good score
            score = Math.min(score, 100);
        }

        // INFO: Properly configured CORS (only trusted origins)
        if (hasAnyCORS && !reflectsArbitraryOrigin && !wildcardDetected && !acceptsNullOrigin &&
            !acceptsSubdomainBypass && !acceptsDomainSuffix && !acceptsPrivateOrigin) {
            findings.push({
                id: "cors-properly-configured",
                severity: "info",
                title: "CORS properly configured",
                description:
                    "CORS headers are present and the server does not reflect arbitrary origins, accept null origin, " +
                    "or fall for subdomain/suffix bypass attacks. CORS appears to be properly restricted.",
                recommendation:
                    "Continue maintaining strict CORS configuration. Periodically review your origin allowlist.",
            });
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        // =================================================================
        // Return result
        // =================================================================
        const result = {
            scannerType: "cors",
            score,
            findings,
            checksRun,
            probeCount: probeResults.length,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("CORS Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "cors",
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
