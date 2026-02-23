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
    detectedWAFs: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CheckVibe-DDoSScanner/1.0";
const FETCH_TIMEOUT_MS = 10000;
const RAPID_REQUEST_COUNT = 5;
const RAPID_REQUEST_DELAY_MS = 100;

interface WAFSignature {
    name: string;
    detect: (headers: Headers) => boolean;
}

const WAF_SIGNATURES: WAFSignature[] = [
    {
        name: "Cloudflare",
        detect: (h) => !!h.get("cf-ray") || /cloudflare/i.test(h.get("server") || ""),
    },
    {
        name: "AWS CloudFront",
        detect: (h) => !!h.get("x-amz-cf-id") || !!h.get("x-amz-cf-pop"),
    },
    {
        name: "Akamai",
        detect: (h) => !!h.get("x-akamai-transformed") || /akamaiGHost/i.test(h.get("server") || ""),
    },
    {
        name: "Sucuri",
        detect: (h) => !!h.get("x-sucuri-id") || !!h.get("x-sucuri-cache"),
    },
    {
        name: "Imperva/Incapsula",
        detect: (h) => /incapsula/i.test(h.get("x-cdn") || "") || /incapsula/i.test(h.get("x-iinfo") || ""),
    },
    {
        name: "Fastly",
        detect: (h) => /varnish/i.test(h.get("via") || "") && !!h.get("x-served-by"),
    },
    {
        name: "Azure Front Door",
        detect: (h) => !!h.get("x-azure-ref"),
    },
    {
        name: "Google Cloud CDN",
        detect: (h) => /Google Frontend/i.test(h.get("via") || "") || !!h.get("x-cloud-trace-context"),
    },
    {
        name: "Vercel Edge Network",
        detect: (h) => !!h.get("x-vercel-id"),
    },
    {
        name: "Netlify",
        detect: (h) => !!h.get("x-nf-request-id"),
    },
    {
        name: "DDoS-Guard",
        detect: (h) => /ddos-guard/i.test(h.get("server") || ""),
    },
    {
        name: "StackPath",
        detect: (h) => !!h.get("x-sp-waf") || !!h.get("x-sp-url"),
    },
];

const RATE_LIMIT_HEADERS = [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "ratelimit-limit",
    "ratelimit-remaining",
    "ratelimit-reset",
    "retry-after",
    "x-rate-limit-limit",
    "x-rate-limit-remaining",
];

const BOT_PROTECTION_PATTERNS = [
    /challenges\.cloudflare\.com/i,
    /turnstile/i,
    /hcaptcha\.com/i,
    /recaptcha/i,
    /google\.com\/recaptcha/i,
    /cf-challenge/i,
    /js-challenge/i,
    /captcha/i,
    /bot-detection/i,
    /datadome/i,
    /perimeterx/i,
    /kasada/i,
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
        headers: {
            "User-Agent": USER_AGENT,
            ...(options.headers || {}),
        },
    }).finally(() => clearTimeout(timer));
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

        const findings: Finding[] = [];
        let score = 100;
        const detectedWAFs: string[] = [];

        // =================================================================
        // 1. Initial fetch + WAF detection
        // =================================================================
        let response: Response;
        let html = "";
        try {
            response = await fetchWithTimeout(targetUrl);
            html = await response.text();
            if (html.length > 1_000_000) html = html.substring(0, 1_000_000);
        } catch (e) {
            return new Response(
                JSON.stringify({
                    scannerType: "ddos_protection",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                    detectedWAFs: [],
                }),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Check WAF/CDN signatures
        for (const sig of WAF_SIGNATURES) {
            if (sig.detect(response.headers)) {
                detectedWAFs.push(sig.name);
            }
        }

        if (detectedWAFs.length > 0) {
            findings.push({
                id: "ddos-waf-detected",
                severity: "info",
                title: `WAF/CDN detected: ${detectedWAFs.join(", ")}`,
                description:
                    `The site is protected by ${detectedWAFs.join(" and ")}. ` +
                    "This provides DDoS mitigation, bot filtering, and edge caching to absorb traffic spikes.",
                recommendation: "Good practice. Ensure WAF rules are regularly updated and monitoring is enabled.",
                evidence: detectedWAFs.join(", "),
            });
        } else {
            score -= 15;
            findings.push({
                id: "ddos-no-waf",
                severity: "medium",
                title: "No WAF or CDN protection detected",
                description:
                    "No web application firewall or CDN was detected protecting this site. " +
                    "Without a WAF/CDN layer, the origin server is directly exposed to DDoS attacks, " +
                    "automated vulnerability scanning, and traffic spikes.",
                recommendation:
                    "Deploy a WAF/CDN service (Cloudflare, AWS CloudFront, Fastly, etc.) to protect " +
                    "your origin server and absorb malicious traffic before it reaches your infrastructure.",
            });
        }

        // =================================================================
        // 2. Active rate limiting probe
        // =================================================================
        let gotRateLimited = false;
        let foundRateLimitHeaders = false;
        const detectedRLHeaders: string[] = [];

        try {
            for (let i = 0; i < RAPID_REQUEST_COUNT; i++) {
                const res = await fetchWithTimeout(targetUrl, { method: "GET" }, 5000);

                if (res.status === 429) {
                    gotRateLimited = true;
                    // Consume body to free connection
                    await res.text().catch(() => { });
                    break;
                }

                for (const h of RATE_LIMIT_HEADERS) {
                    if (res.headers.get(h) && !detectedRLHeaders.includes(h)) {
                        detectedRLHeaders.push(h);
                        foundRateLimitHeaders = true;
                    }
                }

                // Consume body
                await res.text().catch(() => { });

                if (i < RAPID_REQUEST_COUNT - 1) {
                    await new Promise((r) => setTimeout(r, RAPID_REQUEST_DELAY_MS));
                }
            }
        } catch {
            // Rate limiting probe failed — not critical, skip
        }

        if (gotRateLimited) {
            findings.push({
                id: "ddos-rate-limit-active",
                severity: "info",
                title: "Rate limiting is active",
                description:
                    "The server returned HTTP 429 (Too Many Requests) after rapid requests, " +
                    "indicating rate limiting is enforced. This protects against brute-force attacks and DDoS.",
                recommendation: "Good practice. Ensure rate limits are applied consistently across all endpoints.",
                evidence: "HTTP 429 received after rapid requests",
            });
        } else if (foundRateLimitHeaders) {
            findings.push({
                id: "ddos-rate-limit-headers",
                severity: "info",
                title: "Rate limit headers present",
                description:
                    `Rate limiting headers detected: ${detectedRLHeaders.join(", ")}. ` +
                    "This indicates the server communicates rate limits to clients.",
                recommendation: "Good practice. Ensure rate limits are also enforced server-side, not just communicated via headers.",
                evidence: detectedRLHeaders.map((h) => `${h}: ${response.headers.get(h)}`).join(", "),
            });
        } else {
            const isStaticEdge = detectedWAFs.some(waf => ["Vercel Edge Network", "Netlify", "Cloudflare", "AWS CloudFront", "Fastly", "Akamai"].includes(waf));

            if (isStaticEdge) {
                findings.push({
                    id: "ddos-no-rate-limiting",
                    severity: "low",
                    title: "No application-level rate limiting detected",
                    description:
                        "After sending 5 rapid requests, no rate limiting was detected. " +
                        "However, since this site is protected by an Edge Network / CDN, " +
                        "infrastructure-level DDoS protection is handled natively by the provider.",
                    recommendation:
                        "Consider adding application-level rate limiting using Edge Middleware or built-in framework features if your application has sensitive backend operations.",
                });
            } else {
                score -= 15;
                findings.push({
                    id: "ddos-no-rate-limiting",
                    severity: "high",
                    title: "No rate limiting detected",
                    description:
                        "After sending 5 rapid requests, no rate limiting was detected — no HTTP 429 response " +
                        "and no rate limit headers. Without rate limiting, the server is vulnerable to " +
                        "brute-force attacks, credential stuffing, and resource exhaustion.",
                    recommendation:
                        "Implement rate limiting at the application or infrastructure level. " +
                        "Use standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) " +
                        "to communicate limits to clients. Consider using a reverse proxy (nginx, HAProxy) " +
                        "or WAF for automatic rate limiting.",
                });
            }
        }

        // =================================================================
        // 3. HSTS check
        // =================================================================
        const hsts = response.headers.get("strict-transport-security");
        if (hsts) {
            const hasSubDomains = hsts.toLowerCase().includes("includesubdomains");
            const hasPreload = hsts.toLowerCase().includes("preload");
            const maxAgeMatch = hsts.match(/max-age=(\d+)/);
            const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;

            if (hasSubDomains && hasPreload && maxAge >= 31536000) {
                findings.push({
                    id: "ddos-hsts-strong",
                    severity: "info",
                    title: "Strong HSTS policy configured",
                    description:
                        "Strict-Transport-Security is set with includeSubDomains, preload, and a max-age of at least 1 year. " +
                        "This prevents protocol downgrade attacks and ensures all connections use HTTPS.",
                    recommendation: "Continue maintaining this strong HSTS policy. Consider submitting to the HSTS preload list if not already done.",
                    evidence: hsts,
                });
            } else {
                findings.push({
                    id: "ddos-hsts-weak",
                    severity: "low",
                    title: "HSTS configured but could be stronger",
                    description:
                        `HSTS is set but missing: ${!hasSubDomains ? "includeSubDomains " : ""}${!hasPreload ? "preload " : ""}${maxAge < 31536000 ? `(max-age=${maxAge}, recommend ≥31536000) ` : ""}`.trim() +
                        ". A weak HSTS policy leaves room for protocol downgrade attacks.",
                    recommendation:
                        "Set Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
                    evidence: hsts,
                });
            }
        } else {
            score -= 5;
            findings.push({
                id: "ddos-no-hsts",
                severity: "medium",
                title: "No HSTS header detected",
                description:
                    "Strict-Transport-Security header is missing. Without HSTS, browsers may allow " +
                    "HTTP connections, making users vulnerable to SSL stripping and man-in-the-middle attacks.",
                recommendation:
                    "Add the Strict-Transport-Security header: max-age=31536000; includeSubDomains; preload",
            });
        }

        // =================================================================
        // 4. Bot protection detection
        // =================================================================
        const pageContent = body.renderedHtml || html;
        const detectedBotProtection: string[] = [];
        for (const pattern of BOT_PROTECTION_PATTERNS) {
            if (pattern.test(pageContent)) {
                const name = pattern.source
                    .replace(/\\./g, ".")
                    .replace(/[\\^$.*+?()[\]{}|]/g, "")
                    .split(/[/|]/)[0];
                if (!detectedBotProtection.includes(name)) {
                    detectedBotProtection.push(name);
                }
            }
        }

        const hasForms = /<form/i.test(pageContent) || /<input[^>]+type=["']?(password|email)["']?/i.test(pageContent);

        if (detectedBotProtection.length > 0) {
            findings.push({
                id: "ddos-bot-protection",
                severity: "info",
                title: `Bot protection detected: ${detectedBotProtection.slice(0, 3).join(", ")}`,
                description:
                    "The site uses bot protection mechanisms to distinguish legitimate users from automated traffic. " +
                    "This helps prevent automated attacks, scraping, and credential stuffing.",
                recommendation: "Good practice. Ensure bot protection does not interfere with legitimate API integrations or accessibility.",
                evidence: detectedBotProtection.join(", "),
            });
        } else if (hasForms) {
            score -= 3;
            findings.push({
                id: "ddos-no-bot-protection",
                severity: "low",
                title: "No bot protection detected",
                description:
                    "No CAPTCHA, challenge page, or bot detection service was found on this page, which contains HTML forms. " +
                    "Without bot protection, automated attacks and scrapers can freely interact with the inputs.",
                recommendation:
                    "Consider adding bot protection (Cloudflare Turnstile, hCaptcha, reCAPTCHA) " +
                    "on sensitive forms (login, registration, contact). Use invisible challenges for minimal UX impact.",
            });
        } else {
            findings.push({
                id: "ddos-no-bot-protection-needed",
                severity: "info",
                title: "No bot protection detected (None needed)",
                description:
                    "No CAPTCHA or bot detection was found, but no sensitive HTML forms (login, contact, etc.) were detected on the page either.",
                recommendation:
                    "If you add authentication or data-submission forms later, ensure bot protection is implemented.",
            });
        }

        // =================================================================
        // 5. Caching layer / architecture indicators
        // =================================================================
        const cacheHeader = response.headers.get("x-cache");
        const ageHeader = response.headers.get("age");
        const varyHeader = response.headers.get("vary");

        if (cacheHeader || ageHeader) {
            findings.push({
                id: "ddos-caching-layer",
                severity: "info",
                title: "Caching layer detected",
                description:
                    "Response includes caching indicators (X-Cache or Age headers), suggesting a caching layer " +
                    "sits in front of the origin server. This helps absorb traffic spikes and reduces origin load during DDoS attacks.",
                recommendation: "Good practice. Ensure cache invalidation is properly configured and sensitive responses are not cached.",
                evidence: [
                    cacheHeader ? `X-Cache: ${cacheHeader}` : "",
                    ageHeader ? `Age: ${ageHeader}` : "",
                ]
                    .filter(Boolean)
                    .join(", "),
            });
        }

        // Request tracking
        const requestId =
            response.headers.get("x-request-id") ||
            response.headers.get("x-trace-id") ||
            response.headers.get("x-correlation-id");
        if (requestId) {
            findings.push({
                id: "ddos-request-tracking",
                severity: "info",
                title: "Request tracking enabled",
                description:
                    "The server assigns unique request IDs, indicating mature infrastructure with " +
                    "request tracing and logging capabilities. This aids in DDoS forensics and incident response.",
                recommendation: "Good practice. Ensure request IDs are logged server-side for correlation during incidents.",
                evidence: `Request tracking header detected`,
            });
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: "ddos_protection",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
            detectedWAFs,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("DDoS Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "ddos_protection",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                detectedWAFs: [],
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
