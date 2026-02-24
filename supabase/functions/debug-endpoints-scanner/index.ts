import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders, detectSpaCatchAll, looksLikeCatchAllResponse } from "../_shared/security.ts";

/**
 * Debug Endpoints Scanner
 * Probes for common debugging, development, and administrative endpoints
 * that should never be exposed in production. Each discovered endpoint
 * is flagged as critical.
 */

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
    probed: number;
    exposed: number;
}

const USER_AGENT = "CheckVibe-DebugScanner/1.0";
const FETCH_TIMEOUT_MS = 8000;

/**
 * Each probe has a path, a human-readable label, and optional body
 * patterns that confirm it's a real debug page (not a catch-all 200).
 */
interface DebugProbe {
    path: string;
    label: string;
    /** If set, at least one pattern must match the response body for a positive hit */
    bodyPatterns?: RegExp[];
    /** HTTP methods to try (default: GET) */
    methods?: string[];
    /** Match on response headers instead of body */
    headerPatterns?: { header: string; pattern: RegExp }[];
}

const DEBUG_PROBES: DebugProbe[] = [
    // ── PHP / Server-side ──────────────────────────────────────────
    { path: "/phpinfo.php", label: "phpinfo()", bodyPatterns: [/phpinfo\(\)/i, /PHP Version/i, /php\.ini/i] },
    { path: "/info.php", label: "PHP info page", bodyPatterns: [/phpinfo\(\)/i, /PHP Version/i] },
    { path: "/server-info", label: "Apache server-info", bodyPatterns: [/Apache Server Information/i] },
    { path: "/server-status", label: "Apache server-status", bodyPatterns: [/Apache Server Status/i, /Server uptime/i] },

    // ── Debug / Dev panels ─────────────────────────────────────────
    { path: "/_debug", label: "Debug endpoint" },
    { path: "/debug", label: "Debug endpoint" },
    { path: "/api/debug", label: "API debug endpoint" },
    { path: "/api/debug-auth", label: "Auth debug endpoint" },
    { path: "/_profiler", label: "Symfony Profiler", bodyPatterns: [/Symfony Profiler/i, /sf-toolbar/i, /_profiler/i] },
    { path: "/_profiler/latest", label: "Symfony Profiler (latest)", bodyPatterns: [/Symfony Profiler/i, /sf-toolbar/i] },
    { path: "/debug/pprof/", label: "Go pprof profiler", bodyPatterns: [/pprof/i, /Types of profiles/i] },
    { path: "/debug/vars", label: "Go expvar debug", bodyPatterns: [/cmdline|memstats/i] },
    { path: "/__debug", label: "Debug panel" },

    // ── Admin / Management ─────────────────────────────────────────
    { path: "/adminer", label: "Adminer DB tool", bodyPatterns: [/Adminer/i, /adminer\.css/i] },
    { path: "/phpmyadmin", label: "phpMyAdmin", bodyPatterns: [/phpMyAdmin/i] },
    { path: "/phpmyadmin/", label: "phpMyAdmin", bodyPatterns: [/phpMyAdmin/i] },
    { path: "/pma", label: "phpMyAdmin (alias)", bodyPatterns: [/phpMyAdmin/i] },

    // ── Env / Config disclosure ────────────────────────────────────
    { path: "/.env", label: ".env file", bodyPatterns: [/DB_PASSWORD|DATABASE_URL|SECRET_KEY|API_KEY|SUPABASE|STRIPE/i] },
    { path: "/.env.local", label: ".env.local file", bodyPatterns: [/DB_PASSWORD|DATABASE_URL|SECRET_KEY|API_KEY|SUPABASE|STRIPE/i] },
    { path: "/.env.production", label: ".env.production file", bodyPatterns: [/DB_PASSWORD|DATABASE_URL|SECRET_KEY|API_KEY|SUPABASE|STRIPE/i] },
    { path: "/config.json", label: "Config JSON", bodyPatterns: [/password|secret|apiKey|token/i] },
    { path: "/config.yml", label: "Config YAML", bodyPatterns: [/password|secret|api_key|token/i] },
    { path: "/config.yaml", label: "Config YAML", bodyPatterns: [/password|secret|api_key|token/i] },

    // ── Source / Git exposure ──────────────────────────────────────
    { path: "/.git/config", label: "Git config", bodyPatterns: [/\[core\]|\[remote/i] },
    { path: "/.git/HEAD", label: "Git HEAD", bodyPatterns: [/^ref: refs\//m] },
    { path: "/.svn/entries", label: "SVN entries" },
    { path: "/.hg/store", label: "Mercurial store" },

    // ── GraphQL / API introspection ────────────────────────────────
    { path: "/graphql", label: "GraphQL endpoint (introspection)", methods: ["POST"], bodyPatterns: [/__schema|__type|queryType/i] },
    { path: "/graphiql", label: "GraphiQL IDE", bodyPatterns: [/GraphiQL|graphiql/i] },
    { path: "/playground", label: "GraphQL Playground", bodyPatterns: [/GraphQL Playground|playground/i] },
    { path: "/api/graphql", label: "API GraphQL endpoint" },

    // ── Swagger / OpenAPI ──────────────────────────────────────────
    { path: "/swagger-ui.html", label: "Swagger UI", bodyPatterns: [/swagger-ui|Swagger UI/i] },
    { path: "/swagger", label: "Swagger docs", bodyPatterns: [/swagger|openapi/i] },
    { path: "/api-docs", label: "API docs", bodyPatterns: [/swagger|openapi|api-docs/i] },
    { path: "/api/docs", label: "API docs" },
    { path: "/redoc", label: "ReDoc API docs", bodyPatterns: [/redoc/i] },

    // ── Framework debug ────────────────────────────────────────────
    { path: "/__nextjs_original-stack-frame", label: "Next.js debug stack frames" },
    { path: "/_next/webpack-hmr", label: "Next.js HMR (dev mode)", headerPatterns: [{ header: "content-type", pattern: /text\/event-stream/ }] },
    { path: "/rails/info", label: "Rails info page", bodyPatterns: [/Rails version|Ruby version/i] },
    { path: "/rails/info/routes", label: "Rails routes dump", bodyPatterns: [/Routes/i] },
    { path: "/django-admin", label: "Django admin" },
    { path: "/__laravel_error", label: "Laravel debug error" },
    { path: "/telescope", label: "Laravel Telescope", bodyPatterns: [/Telescope/i] },
    { path: "/horizon", label: "Laravel Horizon", bodyPatterns: [/Horizon/i] },
    { path: "/elmah.axd", label: "ELMAH error log (.NET)", bodyPatterns: [/ELMAH|Error Log/i] },
    { path: "/trace.axd", label: "ASP.NET trace", bodyPatterns: [/Application Trace|Trace/i] },

    // ── Database endpoints ─────────────────────────────────────────
    { path: "/api/db", label: "Database API" },
    { path: "/api/query", label: "Query API" },
    { path: "/_sql", label: "SQL endpoint" },

    // ── WordPress specific ──────────────────────────────────────────
    { path: "/wp-config.php.bak", label: "WordPress config backup", bodyPatterns: [/DB_NAME|DB_USER|DB_PASSWORD|AUTH_KEY/i] },
    { path: "/wp-config.php~", label: "WordPress config backup", bodyPatterns: [/DB_NAME|DB_USER|DB_PASSWORD|AUTH_KEY/i] },
    { path: "/wp-json/wp/v2/users", label: "WordPress user enumeration", bodyPatterns: [/"id":\d+.*"name"/i] },

    // ── Docker / Kubernetes ─────────────────────────────────────────
    { path: "/docker-compose.yml", label: "Docker Compose config", bodyPatterns: [/services:|volumes:|networks:|version:/i] },
    { path: "/Dockerfile", label: "Dockerfile", bodyPatterns: [/^FROM\s|^RUN\s|^COPY\s|^EXPOSE\s/mi] },
    { path: "/.docker/config.json", label: "Docker config", bodyPatterns: [/auths|credHelpers/i] },

    // ── Node.js specific ────────────────────────────────────────────
    { path: "/package.json", label: "package.json", bodyPatterns: [/"dependencies"|"devDependencies"|"scripts"/i] },
    { path: "/npm-debug.log", label: "npm debug log", bodyPatterns: [/npm ERR|npm WARN|npm info/i] },
    { path: "/yarn-error.log", label: "Yarn error log", bodyPatterns: [/yarn error|Arguments:|PATH:/i] },

    // ── CI/CD exposure ──────────────────────────────────────────────
    { path: "/.github/workflows", label: "GitHub Actions workflows" },
    { path: "/.gitlab-ci.yml", label: "GitLab CI config", bodyPatterns: [/stages:|script:|image:/i] },
    { path: "/Jenkinsfile", label: "Jenkins pipeline", bodyPatterns: [/pipeline|agent|stages|steps/i] },

    // ── IDE / Editor files ──────────────────────────────────────────
    { path: "/.vscode/settings.json", label: "VSCode settings", bodyPatterns: [/"editor\.|"files\.|"search\./i] },
    { path: "/.idea/workspace.xml", label: "JetBrains workspace", bodyPatterns: [/<project|<component/i] },

    // ── Error / Log files ───────────────────────────────────────────
    { path: "/error.log", label: "Error log file", bodyPatterns: [/\[error\]|\[warn\]|PHP Fatal|Exception|Traceback/i] },
    { path: "/debug.log", label: "Debug log file", bodyPatterns: [/\[debug\]|\[info\]|DEBUG|ERROR|WARN/i] },
    { path: "/access.log", label: "Access log file", bodyPatterns: [/GET\s\/|POST\s\/|HTTP\/\d/i] },

    // ── Health / Status (info only — not critical) ─────────────────
    { path: "/actuator", label: "Spring Boot Actuator", bodyPatterns: [/"_links"|actuator/i] },
    { path: "/actuator/env", label: "Spring Actuator env", bodyPatterns: [/propertySources|systemProperties/i] },
    { path: "/actuator/beans", label: "Spring Actuator beans", bodyPatterns: [/beans|contexts/i] },
    { path: "/actuator/configprops", label: "Spring Actuator config", bodyPatterns: [/configprops|contexts/i] },
    { path: "/actuator/heapdump", label: "Spring Actuator heap dump" },
    { path: "/actuator/threaddump", label: "Spring Actuator thread dump", bodyPatterns: [/threads|threadName/i] },
    { path: "/actuator/mappings", label: "Spring Actuator mappings", bodyPatterns: [/dispatcherServlets|mappings/i] },

    // ── Backup / Dump files ────────────────────────────────────────
    { path: "/backup.sql", label: "SQL backup file", bodyPatterns: [/CREATE TABLE|INSERT INTO|DROP TABLE/i] },
    { path: "/dump.sql", label: "SQL dump file", bodyPatterns: [/CREATE TABLE|INSERT INTO|DROP TABLE/i] },
    { path: "/database.sql", label: "Database SQL file", bodyPatterns: [/CREATE TABLE|INSERT INTO|DROP TABLE/i] },
    { path: "/db.sql", label: "Database SQL file", bodyPatterns: [/CREATE TABLE|INSERT INTO|DROP TABLE/i] },

    // ── Monitoring endpoints ───────────────────────────────────────
    { path: "/metrics", label: "Prometheus metrics", bodyPatterns: [/^# HELP|^# TYPE|process_cpu/m] },
    { path: "/api/metrics", label: "API metrics endpoint" },

];

/** Paths that are informational (useful to know about, not critical) */
const INFO_PATHS = new Set([
    "/swagger-ui.html", "/swagger", "/api-docs", "/api/docs", "/redoc",
    "/metrics", "/api/metrics",
    "/actuator",
]);

/** Paths that expose sensitive data or enable RCE — always critical */
const CRITICAL_PATHS = new Set([
    "/.env", "/.env.local", "/.env.production",
    "/.git/config", "/.git/HEAD",
    "/phpinfo.php", "/info.php",
    "/actuator/env", "/actuator/heapdump", "/actuator/configprops",
    "/backup.sql", "/dump.sql", "/database.sql", "/db.sql",
    "/debug/pprof/", "/debug/vars",
    "/server-status", "/server-info",
    "/adminer", "/phpmyadmin", "/phpmyadmin/", "/pma",
    "/elmah.axd", "/trace.axd",
    "/wp-config.php.bak", "/wp-config.php~",
    "/docker-compose.yml", "/.docker/config.json",
    "/error.log", "/debug.log", "/access.log",
    "/npm-debug.log", "/yarn-error.log",
]);

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
        let exposedCount = 0;

        // ─── SPA catch-all detection ──────────────────────────────
        // Fetch homepage to get baseline length for SPA detection
        let homepageLength = 0;
        let isCatchAll = false;
        try {
            const homeRes = await fetchWithTimeout(baseUrl, {}, 6000);
            const homeBody = await homeRes.text();
            homepageLength = homeBody.length;
            const spaResult = await detectSpaCatchAll(baseUrl, homepageLength, (u, o) => fetchWithTimeout(u, o || {}, 5000));
            isCatchAll = spaResult.isCatchAll;
        } catch {
            // Can't reach homepage — proceed without SPA detection
        }

        // ─── Probe all endpoints (concurrently, batched) ──────────
        const BATCH_SIZE = 10;
        const probeResults: { probe: DebugProbe; hit: boolean; severity: Finding["severity"]; evidence?: string }[] = [];

        for (let i = 0; i < DEBUG_PROBES.length; i += BATCH_SIZE) {
            const batch = DEBUG_PROBES.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (probe) => {
                try {
                    const probeUrl = `${baseUrl}${probe.path}`;
                    const method = probe.methods?.[0] || "GET";

                    const fetchOptions: RequestInit = { method };
                    // For GraphQL introspection, send the introspection query
                    if (method === "POST" && probe.path.includes("graphql")) {
                        fetchOptions.headers = { "Content-Type": "application/json" };
                        fetchOptions.body = JSON.stringify({
                            query: "{ __schema { types { name } } }",
                        });
                    }

                    const res = await fetchWithTimeout(probeUrl, fetchOptions, 6000);

                    // Non-2xx means endpoint doesn't exist (good)
                    if (res.status >= 300 || res.status < 200) {
                        return { probe, hit: false, severity: "info" as const };
                    }

                    // Check header patterns first
                    if (probe.headerPatterns) {
                        for (const hp of probe.headerPatterns) {
                            const val = res.headers.get(hp.header) || "";
                            if (hp.pattern.test(val)) {
                                return { probe, hit: true, severity: determineSeverity(probe), evidence: `${hp.header}: ${val}` };
                            }
                        }
                    }

                    const contentType = res.headers.get("content-type") || "";
                    const bodyText = await res.text();

                    // SPA catch-all check: if the body looks like the homepage, it's a false positive
                    if (isCatchAll && looksLikeCatchAllResponse(contentType, bodyText.length, homepageLength)) {
                        return { probe, hit: false, severity: "info" as const };
                    }

                    // If body patterns are defined, at least one must match
                    if (probe.bodyPatterns && probe.bodyPatterns.length > 0) {
                        const matched = probe.bodyPatterns.some(p => p.test(bodyText));
                        if (!matched) {
                            return { probe, hit: false, severity: "info" as const };
                        }
                        // Extract a short evidence snippet
                        const matchStr = bodyText.substring(0, 200).replace(/\n/g, " ").trim();
                        return { probe, hit: true, severity: determineSeverity(probe), evidence: matchStr };
                    }

                    // No body patterns = hit if 200 and not caught by SPA check
                    // But for generic paths like /test, /debug, we need to be more careful
                    // Only flag if the response has meaningful content (not a generic 200 page)
                    if (bodyText.length < 50) {
                        // Very short response — likely a real endpoint
                        return { probe, hit: true, severity: determineSeverity(probe) };
                    }

                    // For paths without body patterns, only flag if response is JSON or plain text
                    // (not a full HTML page which is likely a catch-all or custom 404)
                    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
                        return { probe, hit: true, severity: determineSeverity(probe), evidence: bodyText.substring(0, 200) };
                    }

                    return { probe, hit: false, severity: "info" as const };
                } catch {
                    return { probe, hit: false, severity: "info" as const };
                }
            }));
            probeResults.push(...results);
        }

        // ─── Process results ──────────────────────────────────────
        for (const result of probeResults) {
            if (!result.hit) continue;

            exposedCount++;
            const severity = result.severity;
            const deduction = severity === "critical" ? 15 : severity === "high" ? 10 : severity === "medium" ? 5 : 0;
            score -= deduction;

            findings.push({
                id: `debug-exposed-${result.probe.path.replace(/[^a-z0-9]/gi, "-")}`,
                severity,
                title: `Exposed: ${result.probe.label} (${result.probe.path})`,
                description: `The debug/development endpoint ${result.probe.path} is accessible in production. ` +
                    getSeverityDescription(result.probe),
                recommendation: getRecommendation(result.probe),
                ...(result.evidence ? { evidence: result.evidence } : {}),
            });
        }

        // ─── Info finding if nothing was found ────────────────────
        if (exposedCount === 0) {
            findings.push({
                id: "debug-none-found",
                severity: "info",
                title: "No debug endpoints detected",
                description: `Probed ${DEBUG_PROBES.length} common debug, development, and administrative paths. ` +
                    "None were found to be accessible, indicating good production hygiene.",
                recommendation: "Good practice. Continue keeping development endpoints disabled or restricted in production.",
            });
        }

        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: "debug_endpoints",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
            probed: DEBUG_PROBES.length,
            exposed: exposedCount,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Debug Endpoints Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "debug_endpoints",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                probed: 0,
                exposed: 0,
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});

// ─── Helpers ─────────────────────────────────────────────────────────

function determineSeverity(probe: DebugProbe): Finding["severity"] {
    if (CRITICAL_PATHS.has(probe.path)) return "critical";
    if (INFO_PATHS.has(probe.path)) return "medium";
    return "high";
}

function getSeverityDescription(probe: DebugProbe): string {
    if (CRITICAL_PATHS.has(probe.path)) {
        return "This exposes sensitive configuration, credentials, or internal data that can be directly exploited by attackers to compromise the application.";
    }
    if (INFO_PATHS.has(probe.path)) {
        return "While this endpoint may not directly expose credentials, it reveals internal API structure and can help attackers map your application for targeted attacks.";
    }
    return "Debug and development endpoints can expose internal state, stack traces, and application internals that assist attackers in exploitation.";
}

function getRecommendation(probe: DebugProbe): string {
    if (probe.path.startsWith("/.env")) {
        return "Block access to .env files in your web server configuration. Ensure environment files are not served as static assets. Use server-side environment variables instead.";
    }
    if (probe.path.startsWith("/.git")) {
        return "Add a rule to your web server to block access to the .git directory. Better yet, ensure .git is not deployed to production at all.";
    }
    if (probe.path.includes("actuator")) {
        return "Restrict Spring Boot Actuator endpoints to internal networks only or disable them in production. Use management.endpoints.web.exposure.exclude to control exposed endpoints.";
    }
    if (probe.path.includes("profiler") || probe.path.includes("debug")) {
        return "Disable debug/profiler mode in production. Set environment to 'production' and ensure debug toolbars are not loaded.";
    }
    if (probe.path.includes("phpinfo") || probe.path.includes("info.php")) {
        return "Remove phpinfo() files from production servers. They expose PHP version, extensions, configuration, and environment variables.";
    }
    if (probe.path.includes("graphql") || probe.path.includes("graphiql") || probe.path.includes("playground")) {
        return "Disable GraphQL introspection and IDE tools (GraphiQL, Playground) in production. Restrict the GraphQL endpoint with authentication.";
    }
    if (probe.path.includes("swagger") || probe.path.includes("api-docs") || probe.path.includes("redoc")) {
        return "Restrict API documentation endpoints to authorized users or internal networks only. Do not expose them publicly in production.";
    }
    if (probe.path.includes(".sql") || probe.path.includes("backup") || probe.path.includes("dump")) {
        return "Remove database backup files from web-accessible directories immediately. These files contain your entire database schema and data.";
    }
    if (probe.path.includes("wp-config")) {
        return "Remove WordPress configuration backup files immediately. They contain database credentials and secret keys in plain text.";
    }
    if (probe.path.includes("docker") || probe.path.includes("Dockerfile")) {
        return "Block access to Docker configuration files. They reveal service architecture, credentials, and deployment details.";
    }
    if (probe.path.includes("package.json")) {
        return "Block access to package.json in production. It reveals all dependencies and their versions, helping attackers find known vulnerabilities.";
    }
    if (probe.path.includes(".log")) {
        return "Remove log files from web-accessible directories. They can contain stack traces, IP addresses, credentials, and internal paths.";
    }
    if (probe.path.includes("wp-json/wp/v2/users")) {
        return "Disable the WordPress REST API users endpoint or restrict it to authenticated users to prevent user enumeration.";
    }
    if (probe.path.includes(".vscode") || probe.path.includes(".idea")) {
        return "Add IDE configuration directories to .gitignore and ensure they're not deployed to production.";
    }
    if (probe.path.includes("rails")) {
        return "Ensure Rails is running in production mode. Set RAILS_ENV=production and disable the info/routes pages.";
    }
    if (probe.path.includes("telescope") || probe.path.includes("horizon")) {
        return "Restrict Laravel Telescope/Horizon to authenticated admin users only, or disable them entirely in production.";
    }
    return "Remove or restrict access to this endpoint in production. Use environment-based configuration to disable development tools.";
}
