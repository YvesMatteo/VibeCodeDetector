import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * XSS (Cross-Site Scripting) Scanner
 *
 * Detects XSS vulnerabilities through four methods:
 * 1. DOM XSS Sink Detection — passive source code analysis
 * 2. Reflected XSS Probing — safe canary strings and harmless HTML tags only
 * 3. Template Injection Probing — safe arithmetic expressions only
 * 4. CSP Analysis for XSS Risk Amplification
 *
 * SAFETY:
 * - NEVER injects executable JavaScript payloads (<script>, onerror=, onload=, javascript:)
 * - NEVER injects any payload that could actually execute code on the target
 * - Only uses safe canary strings and harmless non-standard HTML tags for reflection testing
 * - This is a DETECTION tool, not an exploitation tool
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 5000;
const USER_AGENT = "CheckVibe-Scanner/2.0";

const CDN_SKIP = [
    "cdn.",
    "unpkg.com",
    "cdnjs.",
    "jsdelivr.net",
    "jquery.com",
    "googleapis.com",
    "cloudflare.com",
    "bootstrapcdn.com",
];

// Common parameter names to probe for reflected XSS
const COMMON_PARAMS = [
    "q",
    "search",
    "query",
    "s",
    "id",
    "name",
    "page",
    "redirect",
    "url",
    "input",
];

// DOM XSS dangerous sinks (where attacker data gets written to DOM)
const SINKS = [
    { pattern: /\.innerHTML\s*=/, name: "innerHTML assignment", severity: "medium" as const },
    { pattern: /\.outerHTML\s*=/, name: "outerHTML assignment", severity: "medium" as const },
    { pattern: /document\.write\s*\(/, name: "document.write()", severity: "high" as const },
    { pattern: /document\.writeln\s*\(/, name: "document.writeln()", severity: "high" as const },
    { pattern: /\.insertAdjacentHTML\s*\(/, name: "insertAdjacentHTML()", severity: "medium" as const },
    { pattern: /\$\(\s*['"][^'"]*['"]\s*\)\.html\s*\(/, name: "jQuery .html()", severity: "medium" as const },
    { pattern: /eval\s*\(/, name: "eval()", severity: "high" as const },
    { pattern: /new\s+Function\s*\(/, name: "new Function()", severity: "high" as const },
    { pattern: /setTimeout\s*\(\s*['"]/, name: "setTimeout with string", severity: "medium" as const },
    { pattern: /setInterval\s*\(\s*['"]/, name: "setInterval with string", severity: "medium" as const },
];

// DOM XSS dangerous sources (where attacker-controlled data comes from)
const SOURCES = [
    /location\.hash/,
    /location\.search/,
    /location\.href/,
    /document\.URL/,
    /document\.referrer/,
    /window\.name/,
    /document\.cookie/,
    /window\.location/,
    /postMessage/,
    /URLSearchParams/,
];

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
    checksRun: number;
    scannedAt: string;
    url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = PROBE_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const headers = new Headers(options.headers || {});
        if (!headers.has("User-Agent")) {
            headers.set("User-Agent", USER_AGENT);
        }
        return await fetch(url, {
            ...options,
            signal: controller.signal,
            headers,
            redirect: "follow",
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function resolveUrl(scriptUrl: string, baseUrl: string): string {
    if (scriptUrl.startsWith("//")) {
        return "https:" + scriptUrl;
    } else if (scriptUrl.startsWith("/")) {
        const base = new URL(baseUrl);
        return base.origin + scriptUrl;
    } else if (!scriptUrl.startsWith("http")) {
        return new URL(scriptUrl, baseUrl).href;
    }
    return scriptUrl;
}

function isCdnUrl(url: string): boolean {
    return CDN_SKIP.some((cdn) => url.includes(cdn));
}

/** Generate a random alphanumeric canary string */
function generateCanary(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let suffix = "";
    for (let i = 0; i < 5; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return "cvbxss" + suffix;
}

// ---------------------------------------------------------------------------
// Method 1: DOM XSS Sink Detection (Passive)
// ---------------------------------------------------------------------------

interface SourceFile {
    content: string;
    location: string;
}

async function fetchSourceFiles(
    url: string,
): Promise<{ sources: SourceFile[]; html: string; htmlResponse: Response | null }> {
    const sources: SourceFile[] = [];
    let html = "";
    let htmlResponse: Response | null = null;

    try {
        const response = await fetchWithTimeout(url, {}, 10000);
        htmlResponse = response;
        html = await response.text();
        sources.push({ content: html, location: "HTML source" });

        // Extract <script src="..."> tags
        const scriptMatches = html.matchAll(
            /<script[^>]+src=["']([^"']+)["'][^>]*>/gi,
        );
        const scriptUrls: string[] = [];

        for (const match of scriptMatches) {
            if (scriptUrls.length >= 10) break;
            const scriptUrl = resolveUrl(match[1], url);
            if (!isCdnUrl(scriptUrl)) {
                scriptUrls.push(scriptUrl);
            }
        }

        // Fetch JS files in parallel
        await Promise.all(
            scriptUrls.map(async (jsUrl) => {
                try {
                    const jsResponse = await fetchWithTimeout(jsUrl, {}, PROBE_TIMEOUT_MS);
                    const jsContent = await jsResponse.text();
                    if (jsContent.length > 500000) return; // Skip very large files
                    sources.push({ content: jsContent, location: jsUrl });
                } catch {
                    /* skip failed JS fetches */
                }
            }),
        );

        // Extract inline scripts
        const inlineScripts =
            html.match(/<script[^>]*>([^<]+)<\/script>/gi) || [];
        inlineScripts.forEach((script, index) => {
            const content = script.replace(/<\/?script[^>]*>/gi, "");
            if (content.length > 50) {
                sources.push({
                    content,
                    location: `Inline script #${index + 1}`,
                });
            }
        });
    } catch {
        // Return whatever we have
    }

    return { sources, html, htmlResponse };
}

function scanForDomXss(sources: SourceFile[]): Finding[] {
    const findings: Finding[] = [];
    let sinkSourcePairCount = 0;
    let sinksOnlyFound = false;
    const maxSinkSourcePenalty = 3; // -10 each, capped at -30

    for (const { content, location } of sources) {
        for (const sink of SINKS) {
            // Reset regex state
            sink.pattern.lastIndex = 0;

            let sinkMatch;
            // Search for all occurrences of this sink in the content
            const sinkRegex = new RegExp(sink.pattern.source, sink.pattern.flags + (sink.pattern.flags.includes("g") ? "" : "g"));
            while ((sinkMatch = sinkRegex.exec(content)) !== null) {
                // Extract a 500-character window around the sink
                const windowStart = Math.max(0, sinkMatch.index - 250);
                const windowEnd = Math.min(
                    content.length,
                    sinkMatch.index + sinkMatch[0].length + 250,
                );
                const window = content.substring(windowStart, windowEnd);

                // Check if any source is present in this window
                let sourceFound = false;
                for (const sourcePattern of SOURCES) {
                    if (sourcePattern.test(window)) {
                        sourceFound = true;
                        break;
                    }
                }

                if (sourceFound && sinkSourcePairCount < maxSinkSourcePenalty) {
                    sinkSourcePairCount++;
                    findings.push({
                        id: `xss-dom-sink-source-${sinkSourcePairCount}`,
                        severity: "medium",
                        title: `DOM XSS: ${sink.name} with attacker-controllable source`,
                        description: `Found a dangerous DOM sink (${sink.name}) near an attacker-controllable source (e.g., location.hash, location.search, document.referrer) in ${location}. If user input flows from the source to the sink without sanitization, this creates a DOM-based XSS vulnerability.`,
                        recommendation:
                            "Sanitize or encode all user-controllable data before passing it to DOM sinks. Use textContent instead of innerHTML, or use a trusted HTML sanitizer library like DOMPurify.",
                        evidence: `Sink: ${sink.name} in ${location}`,
                    });
                    break; // One finding per sink match, move to next sink occurrence
                } else if (!sourceFound) {
                    sinksOnlyFound = true;
                }
            }
        }
    }

    // If sinks were found but no sources nearby, add a single low finding
    if (sinksOnlyFound && sinkSourcePairCount === 0) {
        findings.push({
            id: "xss-dom-sinks-only",
            severity: "low",
            title: "Potential DOM XSS sinks found",
            description:
                "Dangerous DOM manipulation methods (innerHTML, document.write, eval, etc.) were detected in client-side code. While no attacker-controllable data sources were found nearby, these sinks could still be exploitable if data flows from user input through other code paths.",
            recommendation:
                "Verify that all data passed to DOM sinks is properly sanitized. Prefer textContent over innerHTML, and avoid eval/new Function entirely.",
        });
    }

    return findings;
}

// ---------------------------------------------------------------------------
// Method 2: Reflected XSS Probing (Active — safe canary only)
// ---------------------------------------------------------------------------

async function probeReflectedXss(targetUrl: string): Promise<{ findings: Finding[]; checksRun: number }> {
    const findings: Finding[] = [];
    let checksRun = 0;
    let reflectedUnescapedCount = 0;
    const maxReflectedPenalty = 2; // -20 each, capped at -40

    // Collect parameters to test: existing URL params + common ones
    const parsedUrl = new URL(targetUrl);
    const paramsToTest = new Set<string>();

    // Add existing URL params
    for (const [key] of parsedUrl.searchParams) {
        paramsToTest.add(key);
    }

    // Add common test params
    for (const param of COMMON_PARAMS) {
        paramsToTest.add(param);
    }

    // Limit to 10 parameters
    const paramList = Array.from(paramsToTest).slice(0, 10);

    for (const param of paramList) {
        const canary = generateCanary();

        // Step 1: Inject the canary and check if it's reflected
        checksRun++;
        const probeUrl = new URL(targetUrl);
        probeUrl.searchParams.set(param, canary);

        let canaryReflected = false;
        let probeBody = "";
        try {
            const probeResponse = await fetchWithTimeout(probeUrl.toString());
            probeBody = await probeResponse.text();
            canaryReflected = probeBody.includes(canary);
        } catch {
            continue; // Skip this parameter on network error
        }

        if (!canaryReflected) {
            continue; // Canary not reflected, skip to next parameter
        }

        // Step 2: Try a harmless non-standard HTML tag probe
        // <cvb data-test="1"> is NOT a real HTML element and has no event handlers
        checksRun++;
        const htmlProbe = '<cvb data-test="1">';
        const htmlProbeUrl = new URL(targetUrl);
        htmlProbeUrl.searchParams.set(param, htmlProbe);

        try {
            const htmlResponse = await fetchWithTimeout(htmlProbeUrl.toString());
            const htmlBody = await htmlResponse.text();

            // Check if the probe appears unescaped in the response
            if (htmlBody.includes('<cvb data-test="1">')) {
                // Unescaped HTML reflection — high severity
                if (reflectedUnescapedCount < maxReflectedPenalty) {
                    reflectedUnescapedCount++;
                    findings.push({
                        id: `xss-reflected-unescaped-${param}`,
                        severity: "high",
                        title: `Reflected input not HTML-encoded in parameter "${param}"`,
                        description: `The parameter "${param}" reflects user input into the HTML response without proper HTML entity encoding. An attacker could inject arbitrary HTML and JavaScript to steal session cookies, redirect users, or deface the page. This is a classic Reflected XSS vulnerability.`,
                        recommendation:
                            "HTML-encode all user input before reflecting it in HTML responses. Use framework-provided auto-escaping (e.g., React JSX, Go html/template, Django templates). Apply output encoding appropriate to the context (HTML body, attribute, JavaScript, URL).",
                        evidence: `Parameter "${param}" reflects HTML tags unescaped`,
                    });
                }
            } else if (
                htmlBody.includes("&lt;cvb") ||
                htmlBody.includes("&#60;cvb")
            ) {
                // Properly escaped — info level
                findings.push({
                    id: `xss-reflected-escaped-${param}`,
                    severity: "info",
                    title: `Input reflected but properly HTML-encoded in parameter "${param}"`,
                    description: `The parameter "${param}" reflects user input but properly encodes HTML entities. The application appears to sanitize output correctly for this parameter.`,
                    recommendation:
                        "Continue using output encoding. Verify that encoding is applied consistently across all parameters and contexts.",
                });
            } else {
                // Canary reflected but HTML probe wasn't — low
                findings.push({
                    id: `xss-reflected-canary-${param}`,
                    severity: "low",
                    title: `Input reflected in parameter "${param}"`,
                    description: `The parameter "${param}" reflects plain text input back in the response. While HTML tags were not reflected, the input handling should be verified manually to ensure proper encoding in all contexts (attributes, JavaScript strings, URLs).`,
                    recommendation:
                        "Ensure all reflected input is properly encoded for the output context. Test additional injection contexts such as HTML attributes and JavaScript strings.",
                });
            }
        } catch {
            // If the HTML probe request fails, still note the canary reflection
            findings.push({
                id: `xss-reflected-canary-${param}`,
                severity: "low",
                title: `Input reflected in parameter "${param}"`,
                description: `The parameter "${param}" reflects plain text input back in the response. Further manual testing is recommended to determine if HTML encoding is applied.`,
                recommendation:
                    "Verify that all reflected input is properly HTML-encoded. Test with manual browser-based tools.",
            });
        }
    }

    return { findings, checksRun };
}

// ---------------------------------------------------------------------------
// Method 3: Template Injection Probing (Active — safe arithmetic only)
// ---------------------------------------------------------------------------

async function probeTemplateInjection(targetUrl: string): Promise<{ findings: Finding[]; checksRun: number }> {
    const findings: Finding[] = [];
    let checksRun = 0;

    // First, fetch the original page to check if "1337" already exists
    let originalBody = "";
    try {
        const originalResponse = await fetchWithTimeout(targetUrl);
        originalBody = await originalResponse.text();
    } catch {
        return { findings, checksRun };
    }

    const originalHas1337 = originalBody.includes("1337");

    // Collect parameters
    const parsedUrl = new URL(targetUrl);
    const paramsToTest = new Set<string>();
    for (const [key] of parsedUrl.searchParams) {
        paramsToTest.add(key);
    }
    for (const param of COMMON_PARAMS) {
        paramsToTest.add(param);
    }

    const paramList = Array.from(paramsToTest).slice(0, 5);

    // Template expression payloads — purely arithmetic, no code execution
    const templatePayloads = [
        { payload: "{{7*191}}", syntax: "Angular/Jinja2/Twig" },
        { payload: "${7*191}", syntax: "JavaScript template literal" },
        { payload: "<%= 7*191 %>", syntax: "ERB/EJS" },
    ];

    for (const param of paramList) {
        for (const { payload, syntax } of templatePayloads) {
            checksRun++;

            const probeUrl = new URL(targetUrl);
            probeUrl.searchParams.set(param, payload);

            try {
                const probeResponse = await fetchWithTimeout(probeUrl.toString());
                const probeBody = await probeResponse.text();

                // Only flag if 1337 appears in the probe response but NOT in the original
                if (probeBody.includes("1337") && !originalHas1337) {
                    findings.push({
                        id: `xss-ssti-${param}-${syntax.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
                        severity: "critical",
                        title: `Server-Side Template Injection detected in parameter "${param}"`,
                        description: `Injecting the arithmetic expression "${payload}" (${syntax} syntax) into parameter "${param}" caused the server to evaluate the expression and return the computed result "1337". This confirms Server-Side Template Injection (SSTI), which can lead to arbitrary code execution on the server, full server compromise, and data exfiltration.`,
                        recommendation:
                            "Never pass user input directly into template rendering engines. Use template engines in sandboxed mode where available. Treat user input as data only, never as template code. Validate and sanitize all input before processing.",
                        evidence: `Payload: ${payload} -> Response contains computed value "1337"`,
                    });
                    // One SSTI finding per parameter is enough
                    break;
                }
            } catch {
                // Skip on timeout/network error
            }
        }
    }

    return { findings, checksRun };
}

// ---------------------------------------------------------------------------
// Method 4: CSP Analysis for XSS Risk Amplification
// ---------------------------------------------------------------------------

function analyzeCSP(response: Response | null): Finding[] {
    const findings: Finding[] = [];

    if (!response) {
        return findings;
    }

    const cspHeader =
        response.headers.get("Content-Security-Policy") ||
        response.headers.get("content-security-policy");

    if (!cspHeader) {
        findings.push({
            id: "xss-csp-missing",
            severity: "medium",
            title: "No Content-Security-Policy header",
            description:
                "The server does not set a Content-Security-Policy (CSP) header. Without CSP, the browser has no instructions to restrict which scripts can execute, making any XSS vulnerability immediately exploitable. CSP is the single most effective HTTP header for mitigating XSS attacks.",
            recommendation:
                "Implement a strict Content-Security-Policy header. Start with: script-src 'self'; object-src 'none'; base-uri 'self'; and avoid 'unsafe-inline' and 'unsafe-eval'. Use nonces or hashes for inline scripts.",
        });
        return findings;
    }

    // Parse the CSP to check for unsafe directives
    const directives = cspHeader.split(";").map((d) => d.trim().toLowerCase());

    let scriptSrc = "";
    for (const directive of directives) {
        if (directive.startsWith("script-src")) {
            scriptSrc = directive;
            break;
        }
        // Fall back to default-src if no script-src
        if (directive.startsWith("default-src") && !scriptSrc) {
            scriptSrc = directive;
        }
    }

    let cspIssueCount = 0;
    const maxCspPenalty = 2; // -5 each, capped at -10

    if (scriptSrc.includes("'unsafe-inline'")) {
        if (cspIssueCount < maxCspPenalty) {
            cspIssueCount++;
            findings.push({
                id: "xss-csp-unsafe-inline",
                severity: "medium",
                title: "CSP allows unsafe-inline scripts",
                description:
                    "The Content-Security-Policy includes 'unsafe-inline' in the script-src directive. This effectively disables CSP's XSS protection because any injected inline script will be allowed to execute. This amplifies the impact of any XSS vulnerability.",
                recommendation:
                    "Remove 'unsafe-inline' from script-src. Use nonce-based or hash-based CSP instead (e.g., script-src 'nonce-{random}') and add the nonce attribute to all legitimate inline scripts.",
                evidence: `CSP directive: ${scriptSrc}`,
            });
        }
    }

    if (scriptSrc.includes("'unsafe-eval'")) {
        if (cspIssueCount < maxCspPenalty) {
            cspIssueCount++;
            findings.push({
                id: "xss-csp-unsafe-eval",
                severity: "medium",
                title: "CSP allows unsafe-eval",
                description:
                    "The Content-Security-Policy includes 'unsafe-eval' in the script-src directive. This allows the use of eval(), new Function(), setTimeout with strings, and similar dynamic code execution methods, which amplifies the impact of XSS attacks.",
                recommendation:
                    "Remove 'unsafe-eval' from script-src. Refactor code to avoid eval() and dynamic code generation. Use JSON.parse() instead of eval() for JSON data, and pre-compiled templates instead of runtime template compilation.",
                evidence: `CSP directive: ${scriptSrc}`,
            });
        }
    }

    // If CSP exists and has no unsafe directives, that's good
    if (cspIssueCount === 0) {
        findings.push({
            id: "xss-csp-good",
            severity: "info",
            title: "Good: CSP provides XSS mitigation",
            description:
                "The server sets a Content-Security-Policy header without unsafe-inline or unsafe-eval in the script directives. This provides meaningful protection against exploitation of XSS vulnerabilities by restricting which scripts the browser will execute.",
            recommendation:
                "Maintain the current CSP policy. Periodically audit it to ensure no unsafe directives are added. Consider using CSP reporting (report-uri or report-to) to detect policy violations.",
        });
    }

    return findings;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function calculateScore(findings: Finding[]): number {
    let score = 100;

    for (const finding of findings) {
        switch (finding.severity) {
            case "critical":
                score -= 30;
                break;
            case "high":
                score -= 20;
                break;
            case "medium":
                // Differentiate CSP findings (-5) from DOM XSS sink+source (-10)
                if (finding.id.startsWith("xss-csp-")) {
                    score -= 5;
                } else if (finding.id.startsWith("xss-dom-sink-source-")) {
                    score -= 10;
                } else {
                    score -= 10;
                }
                break;
            case "low":
                score -= 3;
                break;
            // "info" findings do not affect score
        }
    }

    return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
            },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
            },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "application/json",
                },
            });
        }
        const targetUrl = validation.url!;

        const allFindings: Finding[] = [];
        let totalChecksRun = 0;

        // -----------------------------------------------------------------
        // Step 1: Fetch page source and JS files for passive DOM XSS scan
        // -----------------------------------------------------------------
        const { sources, html, htmlResponse } = await fetchSourceFiles(targetUrl);

        if (sources.length === 0) {
            // Cannot fetch the page at all
            return new Response(
                JSON.stringify({
                    scannerType: "xss",
                    score: 0,
                    checksRun: 1,
                    findings: [
                        {
                            id: "xss-fetch-failed",
                            severity: "info",
                            title: "Unable to Fetch Target Page",
                            description: `Could not retrieve the page at ${targetUrl}. The site may be unreachable, blocking automated requests, or experiencing downtime.`,
                            recommendation:
                                "Verify the URL is correct and the site is accessible.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        totalChecksRun++; // Counting the initial page fetch

        // -----------------------------------------------------------------
        // Step 2: Run all four detection methods in parallel
        // -----------------------------------------------------------------
        const [domXssFindings, reflectedResult, templateResult, cspFindings] =
            await Promise.all([
                // Method 1: DOM XSS sink detection (synchronous analysis)
                Promise.resolve(scanForDomXss(sources)),
                // Method 2: Reflected XSS probing
                probeReflectedXss(targetUrl),
                // Method 3: Template injection probing
                probeTemplateInjection(targetUrl),
                // Method 4: CSP analysis (synchronous, uses the initial response)
                Promise.resolve(analyzeCSP(htmlResponse)),
            ]);

        // Collect all findings
        allFindings.push(...domXssFindings);
        allFindings.push(...reflectedResult.findings);
        totalChecksRun += reflectedResult.checksRun;
        allFindings.push(...templateResult.findings);
        totalChecksRun += templateResult.checksRun;
        allFindings.push(...cspFindings);
        totalChecksRun++; // CSP check

        // Count sources scanned for DOM XSS
        totalChecksRun += sources.length;

        // -----------------------------------------------------------------
        // Step 3: Calculate score and return
        // -----------------------------------------------------------------
        const score = calculateScore(allFindings);

        const result: ScanResult = {
            scannerType: "xss",
            score,
            findings: allFindings,
            checksRun: totalChecksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("XSS Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "xss",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                checksRun: 0,
            }),
            {
                status: 500,
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "application/json",
                },
            },
        );
    }
});
