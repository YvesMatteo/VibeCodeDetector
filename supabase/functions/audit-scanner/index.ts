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
    monitoringTools: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENT = "CheckVibe-AuditScanner/1.0";
const FETCH_TIMEOUT_MS = 10000;

interface MonitoringSignature {
    pattern: RegExp;
    name: string;
    category: "error_monitoring" | "observability" | "session_replay" | "analytics" | "product_analytics";
}

const MONITORING_SIGNATURES: MonitoringSignature[] = [
    // Error monitoring
    { pattern: /sentry[._\-]?io|@sentry\/|dsn.*sentry|Sentry\.init/i, name: "Sentry", category: "error_monitoring" },
    { pattern: /bugsnag/i, name: "Bugsnag", category: "error_monitoring" },
    { pattern: /rollbar/i, name: "Rollbar", category: "error_monitoring" },
    { pattern: /airbrake/i, name: "Airbrake", category: "error_monitoring" },
    { pattern: /raygun/i, name: "Raygun", category: "error_monitoring" },
    // Session replay
    { pattern: /logrocket/i, name: "LogRocket", category: "session_replay" },
    { pattern: /fullstory/i, name: "FullStory", category: "session_replay" },
    { pattern: /hotjar/i, name: "Hotjar", category: "session_replay" },
    { pattern: /smartlook/i, name: "Smartlook", category: "session_replay" },
    // Observability
    { pattern: /datadoghq|dd-rum|datadog/i, name: "Datadog", category: "observability" },
    { pattern: /newrelic|nr-rum|new-relic/i, name: "New Relic", category: "observability" },
    { pattern: /opentelemetry|otel/i, name: "OpenTelemetry", category: "observability" },
    { pattern: /elastic\.co.*apm|elastic-apm/i, name: "Elastic APM", category: "observability" },
    { pattern: /grafana/i, name: "Grafana", category: "observability" },
    { pattern: /dynatrace/i, name: "Dynatrace", category: "observability" },
    // Product analytics
    { pattern: /posthog/i, name: "PostHog", category: "product_analytics" },
    { pattern: /mixpanel/i, name: "Mixpanel", category: "analytics" },
    { pattern: /amplitude/i, name: "Amplitude", category: "analytics" },
    { pattern: /segment\.com|analytics\.js|segment\.min/i, name: "Segment", category: "analytics" },
    { pattern: /heap\.io|heapanalytics/i, name: "Heap", category: "analytics" },
];

const REPORTING_HEADERS = [
    { header: "nel", name: "Network Error Logging (NEL)" },
    { header: "report-to", name: "Report-To" },
    { header: "reporting-endpoints", name: "Reporting-Endpoints" },
];

const HEALTH_PATHS = ["/health", "/api/health", "/healthz", "/status", "/_health", "/api/status", "/ready", "/api/ready"];

// Stack trace patterns for error disclosure
const STACK_TRACE_PATTERNS = [
    /at\s+\S+\s+\([^)]*:\d+:\d+\)/,          // Node.js: at fn (file:line:col)
    /Traceback \(most recent call last\)/i,     // Python
    /(?:Fatal|Parse|Syntax)Error:.*on line \d+/i, // PHP
    /Exception in thread\s+/,                   // Java
    /goroutine\s+\d+\s+\[/,                    // Go
    /node_modules\//,                           // Node.js module paths
    /vendor\//,                                 // Composer / vendor paths
    /\.rb:\d+:in\s+/,                          // Ruby
    /File ".*\.py", line \d+/,                  // Python file traces
    /at\s+.*\(.*\.ts:\d+/,                     // TypeScript
    /SQLSTATE\[\d+\]/,                          // Database errors
    /pg_query|mysql_query|sqlite3/i,            // DB driver errors
];

const FRAMEWORK_PATTERNS = [
    { pattern: /Django(?:\s+|\/)[\d.]+/i, name: "Django" },
    { pattern: /Rails(?:\s+|\/)[\d.]+/i, name: "Ruby on Rails" },
    { pattern: /Express(?:\s+|\/)[\d.]+/i, name: "Express.js" },
    { pattern: /Laravel(?:\s+|\/)[\d.]+/i, name: "Laravel" },
    { pattern: /Flask(?:\s+|\/)[\d.]+/i, name: "Flask" },
    { pattern: /Spring(?:\s+Boot)?(?:\s+|\/)[\d.]+/i, name: "Spring" },
    { pattern: /ASP\.NET(?:\s+|\/)[\d.]+/i, name: "ASP.NET" },
    { pattern: /Next\.js\s+error|__NEXT_DATA__.*err/i, name: "Next.js" },
    { pattern: /Nuxt\.js\s+error/i, name: "Nuxt.js" },
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
        const monitoringTools: string[] = [];

        // =================================================================
        // 1. Fetch page
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
                    scannerType: "audit_logging",
                    score: 0,
                    error: `Could not reach target: ${e instanceof Error ? e.message : String(e)}`,
                    findings: [],
                    monitoringTools: [],
                }),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // =================================================================
        // 2. Security reporting headers
        // =================================================================
        const foundReportingHeaders: string[] = [];

        for (const rh of REPORTING_HEADERS) {
            if (response.headers.get(rh.header)) {
                foundReportingHeaders.push(rh.name);
            }
        }

        // Check CSP for report-uri / report-to
        const csp = response.headers.get("content-security-policy") || "";
        if (/report-(?:uri|to)/i.test(csp)) {
            foundReportingHeaders.push("CSP Reporting");
        }

        // Check Expect-CT with report-uri
        const expectCT = response.headers.get("expect-ct") || "";
        if (/report-uri/i.test(expectCT)) {
            foundReportingHeaders.push("Expect-CT Reporting");
        }

        if (foundReportingHeaders.length > 0) {
            findings.push({
                id: "audit-reporting-headers",
                severity: "info",
                title: `Security event reporting configured: ${foundReportingHeaders.join(", ")}`,
                description:
                    `The following security reporting mechanisms are active: ${foundReportingHeaders.join(", ")}. ` +
                    "These allow the browser to report security policy violations and network errors back to the server.",
                recommendation: "Good practice. Ensure these reports are monitored and acted upon.",
                evidence: foundReportingHeaders.join(", "),
            });
        } else {
            score -= 10;
            findings.push({
                id: "audit-no-reporting-headers",
                severity: "medium",
                title: "No security event reporting headers detected",
                description:
                    "No NEL (Network Error Logging), Report-To, Reporting-Endpoints, or CSP report-uri headers were found. " +
                    "Without security event reporting, you won't know when your security policies are violated or when " +
                    "network errors affect your users.",
                recommendation:
                    "Add security reporting headers: NEL for network error logging, Report-To for collecting reports, " +
                    "and report-uri in your CSP to receive Content-Security-Policy violation reports.",
            });
        }

        // =================================================================
        // 3. security.txt check
        // =================================================================
        try {
            const secTxtRes = await fetchWithTimeout(`${baseUrl}/.well-known/security.txt`, {}, 5000);
            const secTxtBody = await secTxtRes.text();

            if (secTxtRes.status === 200 && secTxtBody.length > 10) {
                const hasContact = /^Contact:/im.test(secTxtBody);
                const hasPolicy = /^Policy:/im.test(secTxtBody);
                const hasExpires = /^Expires:/im.test(secTxtBody);

                if (hasContact) {
                    findings.push({
                        id: "audit-security-txt",
                        severity: "info",
                        title: "security.txt properly configured",
                        description:
                            "A security.txt file exists at /.well-known/security.txt with a Contact field. " +
                            "This indicates security maturity and provides researchers a way to report vulnerabilities responsibly." +
                            (!hasExpires ? " Consider adding an Expires field." : "") +
                            (!hasPolicy ? " Consider adding a Policy field linking to your vulnerability disclosure policy." : ""),
                        recommendation: "Good practice. Keep the security.txt file up to date and monitor the contact address for reports.",
                        evidence: `Contact: ${hasContact ? "yes" : "no"}, Policy: ${hasPolicy ? "yes" : "no"}, Expires: ${hasExpires ? "yes" : "no"}`,
                    });
                } else {
                    findings.push({
                        id: "audit-security-txt-incomplete",
                        severity: "low",
                        title: "security.txt exists but is incomplete",
                        description:
                            "A security.txt file was found but it's missing the required Contact field. " +
                            "Without a Contact field, security researchers cannot report vulnerabilities to you.",
                        recommendation: "Add a Contact field (email or URL) to your security.txt file. See https://securitytxt.org/ for the specification.",
                    });
                }
            } else {
                score -= 5;
                findings.push({
                    id: "audit-no-security-txt",
                    severity: "medium",
                    title: "No security.txt file",
                    description:
                        "No security.txt file was found at /.well-known/security.txt. This file tells security researchers " +
                        "how to report vulnerabilities responsibly. Without it, researchers may not know how to contact you, " +
                        "or may resort to public disclosure.",
                    recommendation:
                        "Create a /.well-known/security.txt file with at least a Contact field. " +
                        "See https://securitytxt.org/ for the standard format.",
                });
            }
        } catch {
            score -= 5;
            findings.push({
                id: "audit-no-security-txt",
                severity: "medium",
                title: "No security.txt file",
                description:
                    "Could not access /.well-known/security.txt. This file tells security researchers " +
                    "how to report vulnerabilities. Without it, responsible disclosure is harder.",
                recommendation:
                    "Create a /.well-known/security.txt file with at least a Contact field.",
            });
        }

        // =================================================================
        // 4. Monitoring infrastructure detection
        // =================================================================
        let hasErrorMonitoring = false;
        let hasObservability = false;
        const detectedByCategory: Record<string, string[]> = {};

        for (const sig of MONITORING_SIGNATURES) {
            if (sig.pattern.test(html)) {
                monitoringTools.push(sig.name);
                if (!detectedByCategory[sig.category]) detectedByCategory[sig.category] = [];
                detectedByCategory[sig.category].push(sig.name);

                if (sig.category === "error_monitoring") hasErrorMonitoring = true;
                if (sig.category === "observability") hasObservability = true;
            }
        }

        if (hasErrorMonitoring) {
            const tools = detectedByCategory["error_monitoring"]?.join(", ") || "";
            findings.push({
                id: "audit-error-monitoring",
                severity: "info",
                title: `Error monitoring detected: ${tools}`,
                description:
                    `Error monitoring via ${tools} is active. This captures runtime errors, exceptions, and crashes ` +
                    "in production, enabling rapid incident response and providing an audit trail of application failures.",
                recommendation: "Good practice. Ensure sensitive data is scrubbed from error reports and alerts are configured for critical errors.",
                evidence: tools,
            });
        }

        if (hasObservability) {
            const tools = detectedByCategory["observability"]?.join(", ") || "";
            findings.push({
                id: "audit-observability",
                severity: "info",
                title: `Observability platform detected: ${tools}`,
                description:
                    `The application uses ${tools} for observability. This provides distributed tracing, ` +
                    "performance monitoring, and infrastructure visibility — critical for security incident investigation.",
                recommendation: "Good practice. Configure alerting rules for security-relevant patterns (auth failures, unusual traffic).",
                evidence: tools,
            });
        }

        // Analytics tools
        const analyticsTools = [
            ...(detectedByCategory["analytics"] || []),
            ...(detectedByCategory["product_analytics"] || []),
            ...(detectedByCategory["session_replay"] || []),
        ];
        if (analyticsTools.length > 0) {
            findings.push({
                id: "audit-analytics",
                severity: "info",
                title: `Analytics/tracking detected: ${analyticsTools.join(", ")}`,
                description:
                    `The application uses ${analyticsTools.join(", ")} for user analytics. While not security logging per se, ` +
                    "these tools capture user actions that can serve as supplementary audit evidence.",
                recommendation: "Ensure analytics data complies with privacy regulations (GDPR, CCPA). Do not log sensitive user data.",
            });
        }

        if (!hasErrorMonitoring && !hasObservability) {
            score -= 15;
            findings.push({
                id: "audit-no-monitoring",
                severity: "high",
                title: "No error monitoring or observability detected",
                description:
                    "No indicators of error monitoring (Sentry, Bugsnag, Rollbar) or observability platforms " +
                    "(Datadog, New Relic, OpenTelemetry) were found in the page source. Without monitoring, " +
                    "the application cannot: detect security incidents in real-time, provide audit trails for " +
                    "legal compliance, debug production issues, or prove what happened during a breach.",
                recommendation:
                    "Implement error monitoring (Sentry, Bugsnag) and observability (Datadog, New Relic). " +
                    "For legal audit compliance, ensure critical actions (login, password change, data deletion, " +
                    "admin operations, payment events) are logged to a tamper-evident store with timestamps and user IDs.",
            });
        }

        // =================================================================
        // 5. Error disclosure check
        // =================================================================
        try {
            const probeUrl = `${baseUrl}/__checkvibe_probe_${Date.now().toString(36)}__`;
            const errorRes = await fetchWithTimeout(probeUrl, {}, 5000);
            const errorBody = await errorRes.text();

            let hasStackTrace = false;
            let hasFramework = false;
            let frameworkName = "";

            for (const pattern of STACK_TRACE_PATTERNS) {
                if (pattern.test(errorBody)) {
                    hasStackTrace = true;
                    break;
                }
            }

            for (const fw of FRAMEWORK_PATTERNS) {
                if (fw.pattern.test(errorBody)) {
                    hasFramework = true;
                    frameworkName = fw.name;
                    break;
                }
            }

            if (hasStackTrace) {
                score -= 15;
                findings.push({
                    id: "audit-stack-trace-leak",
                    severity: "high",
                    title: "Error pages leak stack traces",
                    description:
                        "A request to a non-existent page returned a response containing stack trace information. " +
                        "Stack traces reveal internal file paths, library versions, database queries, and code structure — " +
                        "giving attackers a detailed map of the application internals.",
                    recommendation:
                        "Configure custom error pages for production. Disable debug/development mode. " +
                        "Log detailed errors server-side only; return generic error messages to clients.",
                });
            } else if (hasFramework) {
                score -= 5;
                findings.push({
                    id: "audit-framework-disclosure",
                    severity: "medium",
                    title: `Error page reveals framework: ${frameworkName}`,
                    description:
                        `The error page identifies ${frameworkName} as the underlying framework. ` +
                        "This information helps attackers target known vulnerabilities specific to this framework version.",
                    recommendation:
                        `Configure custom error pages that don't identify ${frameworkName}. ` +
                        "Remove default framework error templates from production.",
                    evidence: frameworkName,
                });
            } else if (errorRes.status === 404 || errorRes.status >= 400) {
                findings.push({
                    id: "audit-custom-errors",
                    severity: "info",
                    title: "Custom error pages configured",
                    description:
                        "The server returns clean error responses without leaking stack traces or framework details. " +
                        "This indicates good production error handling practices.",
                    recommendation: "Good practice. Continue ensuring error messages are generic in production.",
                });
            }
        } catch {
            // Error probe failed — skip, not critical
        }

        // =================================================================
        // 6. Health/status endpoint check
        // =================================================================
        const healthProbes = HEALTH_PATHS.map(async (path) => {
            try {
                const res = await fetchWithTimeout(`${baseUrl}${path}`, {}, 3000);
                const contentType = res.headers.get("content-type") || "";
                if (res.status === 200 && contentType.includes("json")) {
                    return path;
                }
                return null;
            } catch {
                return null;
            }
        });

        const healthResults = (await Promise.all(healthProbes)).filter(Boolean);

        if (healthResults.length > 0) {
            findings.push({
                id: "audit-health-endpoint",
                severity: "info",
                title: `Health check endpoint available: ${healthResults[0]}`,
                description:
                    `A health check endpoint was found at ${healthResults[0]}. This indicates operational monitoring ` +
                    "maturity — the application can be probed by uptime monitors, load balancers, and orchestration systems.",
                recommendation: "Good practice. Ensure the health endpoint does not expose sensitive internal state.",
                evidence: healthResults.join(", "),
            });
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: "audit_logging",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
            monitoringTools,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Audit Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "audit_logging",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                monitoringTools: [],
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
