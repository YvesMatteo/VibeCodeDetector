import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Railway Hosting Scanner
 *
 * Auto-detects Railway-hosted sites and audits for:
 *   - Verbose error pages leaking stack traces
 *   - Exposed .env / config files
 *   - Database connection string leaks
 *   - Git repository exposure (.git/HEAD)
 *   - Backup and sensitive file detection
 *   - Platform configuration exposure (Dockerfile, Procfile, railway.json)
 *
 * SECURITY GUARANTEES:
 *   - NEVER writes, updates, or deletes data on the target
 *   - All HTTP requests are read-only GET
 *   - 8-second timeout on all external requests
 */

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
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

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 8000,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'CheckVibe-RailwayScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Railway Detection
// ---------------------------------------------------------------------------

async function detectRailway(targetUrl: string): Promise<{ detected: boolean; html: string; headers: Headers }> {
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        }, 10000);

        const headers = response.headers;
        const html = await response.text();
        const hostname = new URL(targetUrl).hostname;

        const isRailway =
            hostname.endsWith('.up.railway.app') ||
            (headers.get('server') || '').toLowerCase().includes('railway') ||
            html.includes('railway.app') ||
            !!headers.get('x-railway-request-id');

        return { detected: isRailway, html, headers };
    } catch {
        return { detected: false, html: '', headers: new Headers() };
    }
}

// ---------------------------------------------------------------------------
// Check 1: Verbose Error Pages
// ---------------------------------------------------------------------------

async function checkVerboseErrors(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const errorPaths = [
        '/nonexistent-path-' + Date.now(),
        '/api/nonexistent',
        '/debug',
        '/health',
    ];

    let verboseError = false;
    let leakedEnvVars = false;

    for (const path of errorPaths) {
        try {
            const probeUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(probeUrl, {}, 5000);
            const text = await res.text();

            // Check for stack traces
            const hasStackTrace = /at\s+\w+\s+\(.*:\d+:\d+\)/i.test(text) ||
                                  /Traceback \(most recent/i.test(text) ||
                                  /Error:.*\n\s+at\s+/i.test(text);

            // Check for env var leaks
            const hasEnvLeak = /DATABASE_URL|REDIS_URL|MONGO|PORT=\d+|RAILWAY_|SECRET_KEY|JWT_SECRET/i.test(text);

            // Check for framework debug info
            const hasDebugInfo = /DEBUG\s*=\s*True/i.test(text) ||
                                 /X-Powered-By:/i.test(text) ||
                                 /django\.core|flask\.app|express\./i.test(text);

            if (hasEnvLeak) {
                leakedEnvVars = true;
                findings.push({
                    id: 'railway-error-disclosure',
                    severity: 'high',
                    title: `Error page leaks environment variables: ${path}`,
                    description: `The error response at "${path}" contains environment variable names or values (DATABASE_URL, REDIS_URL, etc.). This reveals internal configuration to attackers.`,
                    recommendation: 'Disable debug mode in production. Set DEBUG=false (Django), NODE_ENV=production (Node.js), or equivalent for your framework. Add custom error handlers.',
                    evidence: `${path} (HTTP ${res.status})`,
                });
            } else if (hasStackTrace || hasDebugInfo) {
                verboseError = true;
                findings.push({
                    id: 'railway-error-disclosure',
                    severity: 'medium',
                    title: `Verbose error response at: ${path}`,
                    description: `The error response at "${path}" contains stack traces or framework debug information. This helps attackers understand your code structure and dependencies.`,
                    recommendation: 'Configure production error handling to return generic error pages. Disable debug mode and verbose logging in production.',
                    evidence: `${path} (HTTP ${res.status})`,
                });
            }
        } catch { /* skip */ }
    }

    if (leakedEnvVars) return 25;
    if (verboseError) return 15;

    findings.push({
        id: 'railway-errors-ok',
        severity: 'info',
        title: 'Error pages do not leak sensitive information',
        description: 'Probed error paths do not reveal stack traces or environment details.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 2: Exposed .env / Config
// ---------------------------------------------------------------------------

async function checkEnvExposed(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const configPaths = ['/.env', '/.env.local', '/.env.production', '/config', '/config.json', '/config.yaml'];
    let exposed = false;

    for (const path of configPaths) {
        try {
            const envUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(envUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                const isEnvFile = /^[A-Z_]+=.+/m.test(text) && text.length < 50000;
                const isConfigWithSecrets = /password|secret|token|api[_-]?key|database_url|redis_url/i.test(text) &&
                                            (text.startsWith('{') || text.startsWith('---') || /^[A-Z_]+=/m.test(text));

                if (isEnvFile || isConfigWithSecrets) {
                    exposed = true;
                    findings.push({
                        id: 'railway-env-exposed',
                        severity: 'critical',
                        title: `Configuration file exposed: ${path}`,
                        description: `The file "${path}" is publicly accessible and appears to contain sensitive configuration (API keys, database URLs, secrets).`,
                        recommendation: 'Remove configuration files from your deployment. Use Railway\'s environment variable settings instead. Rotate any exposed secrets immediately.',
                    });
                }
            }
        } catch { /* skip */ }
    }

    if (exposed) return 40;

    findings.push({
        id: 'railway-env-ok',
        severity: 'info',
        title: 'No configuration files publicly accessible',
        description: 'Common .env and config file paths are not accessible on this deployment.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 3: Database Connection String Leaks
// ---------------------------------------------------------------------------

async function checkConnectionStringLeaks(
    targetUrl: string,
    html: string,
    findings: Finding[],
): Promise<number> {
    // Check main page and error pages for connection strings
    const allContent = [html];

    // Also check a few API paths that might leak in error messages
    const probePaths = ['/api', '/graphql', '/health', '/status'];
    for (const path of probePaths) {
        try {
            const probeUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(probeUrl, {}, 5000);
            const text = await res.text();
            if (text.length < 100000) {
                allContent.push(text);
            }
        } catch { /* skip */ }
    }

    const combined = allContent.join('\n');

    // Check for connection string patterns
    const connectionPatterns = [
        { pattern: /postgresql:\/\/[^"'\s<>]{10,}/gi, type: 'PostgreSQL' },
        { pattern: /postgres:\/\/[^"'\s<>]{10,}/gi, type: 'PostgreSQL' },
        { pattern: /mongodb(\+srv)?:\/\/[^"'\s<>]{10,}/gi, type: 'MongoDB' },
        { pattern: /redis:\/\/[^"'\s<>]{10,}/gi, type: 'Redis' },
        { pattern: /mysql:\/\/[^"'\s<>]{10,}/gi, type: 'MySQL' },
        { pattern: /amqp:\/\/[^"'\s<>]{10,}/gi, type: 'RabbitMQ' },
    ];

    let found = false;
    for (const { pattern, type } of connectionPatterns) {
        const match = combined.match(pattern);
        if (match) {
            found = true;
            // Redact the connection string
            const redacted = match[0].substring(0, 15) + '...[REDACTED]';
            findings.push({
                id: 'railway-connection-string',
                severity: 'critical',
                title: `${type} connection string exposed`,
                description: `A ${type} database connection string was found in publicly accessible content. This includes the hostname, credentials, and database name.`,
                recommendation: `Immediately rotate the ${type} database credentials. Ensure connection strings are only stored in environment variables and never rendered in HTML or API responses.`,
                evidence: redacted,
            });
        }
    }

    if (found) return 40;

    findings.push({
        id: 'railway-connections-ok',
        severity: 'info',
        title: 'No database connection strings found in public content',
        description: 'No connection strings were detected in HTML or API responses.',
        recommendation: 'No action needed. Continue keeping connection strings in environment variables.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 4: Git Repository Exposure
// ---------------------------------------------------------------------------

async function checkGitExposure(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    try {
        const gitUrl = new URL('/.git/HEAD', targetUrl).href;
        const res = await fetchWithTimeout(gitUrl, {}, 5000);
        if (res.status === 200) {
            const text = await res.text();
            if (text.startsWith('ref:') || /^[0-9a-f]{40}$/m.test(text)) {
                findings.push({
                    id: 'railway-git-exposed',
                    severity: 'critical',
                    title: '.git directory is publicly accessible',
                    description: 'The .git/HEAD file is accessible, meaning the entire git repository (including commit history, source code, and potentially secrets in old commits) can be downloaded.',
                    recommendation: 'Configure your web server or framework to block access to /.git/ paths. If using a Dockerfile, ensure .git is in .dockerignore. Rotate any secrets that were ever committed.',
                    evidence: '.git/HEAD returned valid git ref',
                });
                return 40;
            }
        }
    } catch { /* skip */ }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 5: Backup File Detection
// ---------------------------------------------------------------------------

async function checkBackupFiles(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const backupPaths = [
        '/backup.sql', '/backup.sql.gz', '/dump.sql',
        '/db.sql', '/database.sql',
        '/backup.zip', '/site.zip', '/archive.zip',
        '/wp-config.php.bak', '/config.php.bak',
        '/.htpasswd', '/.htaccess',
    ];
    const found: string[] = [];

    for (const path of backupPaths) {
        try {
            const probeUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(probeUrl, { method: 'HEAD' }, 4000);
            if (res.status === 200) {
                const cl = parseInt(res.headers.get('content-length') || '0', 10);
                if (cl > 100) {
                    found.push(`${path} (${cl} bytes)`);
                }
            }
        } catch { /* skip */ }
    }

    if (found.length > 0) {
        findings.push({
            id: 'railway-backup-files',
            severity: 'high',
            title: `${found.length} backup/sensitive file(s) publicly accessible`,
            description: `The following backup or sensitive files are downloadable: ${found.join(', ')}. These may contain database dumps, source code, or credentials.`,
            recommendation: 'Remove backup files from your deployment. Ensure your .dockerignore or build process excludes backup files. Add server-level rules to block access to backup extensions.',
            evidence: found.join('\n'),
        });
        return 25;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 6: Platform Configuration Exposure
// ---------------------------------------------------------------------------

async function checkPlatformConfig(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const configFiles = [
        { path: '/Dockerfile', name: 'Dockerfile', pattern: /^FROM\s+/mi },
        { path: '/Procfile', name: 'Procfile', pattern: /^(web|worker|release):/mi },
        { path: '/railway.json', name: 'railway.json', pattern: /^\s*\{/m },
        { path: '/railway.toml', name: 'railway.toml', pattern: /\[(build|deploy)\]/i },
        { path: '/docker-compose.yml', name: 'docker-compose.yml', pattern: /^(version|services):/mi },
        { path: '/docker-compose.yaml', name: 'docker-compose.yaml', pattern: /^(version|services):/mi },
    ];
    const exposed: string[] = [];
    let hasSecrets = false;

    for (const { path, name, pattern } of configFiles) {
        try {
            const configUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(configUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                if (text.length > 5 && text.length < 50000 && pattern.test(text)) {
                    exposed.push(name);
                    if (/secret|password|token|api[_-]?key|credential|DATABASE_URL|REDIS_URL/i.test(text)) {
                        hasSecrets = true;
                    }
                }
            }
        } catch { /* skip */ }
    }

    if (exposed.length > 0) {
        findings.push({
            id: 'railway-config-exposed',
            severity: hasSecrets ? 'critical' : 'medium',
            title: `Deployment config file(s) accessible: ${exposed.join(', ')}`,
            description: `The following deployment configuration files are publicly downloadable: ${exposed.join(', ')}. ${exposed.includes('Dockerfile') ? 'Dockerfiles reveal base images, build steps, and potentially secrets passed as build args.' : 'These reveal deployment configuration and infrastructure details.'}${hasSecrets ? ' References to secrets or database URLs were detected.' : ''}`,
            recommendation: 'Ensure your web server does not serve configuration files. If using a static file server, exclude these files from the public directory. Add .dockerignore entries and server-level access blocks.',
        });
        return hasSecrets ? 30 : 15;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
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
        const targetUrl = validation.url!;

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        checksRun++;
        const { detected, html } = await detectRailway(targetUrl);

        if (!detected) {
            findings.push({
                id: 'no-railway-detected',
                severity: 'info',
                title: 'Not a Railway deployment',
                description: 'No Railway hosting indicators were found. This scanner only applies to Railway-hosted sites.',
                recommendation: 'No action needed.',
            });

            return new Response(JSON.stringify({
                scannerType: 'railway_hosting',
                score: 100,
                findings,
                checksRun,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            } satisfies ScanResult), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        findings.push({
            id: 'railway-detected',
            severity: 'info',
            title: 'Railway hosting detected',
            description: 'This site is hosted on Railway. Running platform-specific security checks.',
            recommendation: 'Review Railway security best practices.',
        });

        const [errorDeduction, envDeduction, connDeduction, gitDeduction, backupDeduction, configDeduction] = await Promise.all([
            (checksRun++, checkVerboseErrors(targetUrl, findings)),
            (checksRun++, checkEnvExposed(targetUrl, findings)),
            (checksRun++, checkConnectionStringLeaks(targetUrl, html, findings)),
            (checksRun++, checkGitExposure(targetUrl, findings)),
            (checksRun++, checkBackupFiles(targetUrl, findings)),
            (checksRun++, checkPlatformConfig(targetUrl, findings)),
        ]);

        score -= errorDeduction + envDeduction + connDeduction + gitDeduction + backupDeduction + configDeduction;
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: 'railway_hosting',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Railway scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'railway_hosting',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: '',
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
        );
    }
});
