import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Vercel Hosting Scanner
 *
 * Auto-detects Vercel-hosted sites and audits for:
 *   - Exposed source maps (.js.map files)
 *   - _next/data environment/data leaks
 *   - Exposed .env files
 *   - Serverless function enumeration / verbose errors
 *   - Security headers audit
 *   - Git repository exposure (.git/HEAD)
 *   - Backup and sensitive file detection
 *   - Platform configuration exposure (vercel.json)
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
                'User-Agent': 'CheckVibe-VercelScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Vercel Detection
// ---------------------------------------------------------------------------

async function detectVercel(targetUrl: string): Promise<{ detected: boolean; html: string; headers: Headers }> {
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        }, 10000);

        const headers = response.headers;
        const html = await response.text();

        const isVercel =
            !!headers.get('x-vercel-id') ||
            !!headers.get('x-vercel-cache') ||
            (headers.get('server') || '').toLowerCase().includes('vercel') ||
            new URL(targetUrl).hostname.endsWith('.vercel.app');

        return { detected: isVercel, html, headers };
    } catch {
        return { detected: false, html: '', headers: new Headers() };
    }
}

// ---------------------------------------------------------------------------
// Check 1: Source Maps Exposed
// ---------------------------------------------------------------------------

async function checkSourceMaps(
    targetUrl: string,
    html: string,
    findings: Finding[],
): Promise<number> {
    // Extract JS bundle paths from HTML
    const scriptPattern = /src=["']([^"']*\/_next\/static\/chunks\/[^"']+\.js)["']/gi;
    const jsUrls: string[] = [];
    let match;
    while ((match = scriptPattern.exec(html)) !== null && jsUrls.length < 5) {
        try {
            jsUrls.push(new URL(match[1], targetUrl).href);
        } catch { /* skip */ }
    }

    let exposed = 0;
    for (const jsUrl of jsUrls) {
        try {
            const mapUrl = jsUrl + '.map';
            const res = await fetchWithTimeout(mapUrl, { method: 'HEAD' }, 5000);
            if (res.status === 200) {
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('json') || ct.includes('octet-stream') || ct.includes('sourcemap')) {
                    exposed++;
                }
            }
        } catch { /* skip */ }
    }

    if (exposed > 0) {
        findings.push({
            id: 'vercel-source-maps',
            severity: 'high',
            title: `${exposed} source map file(s) publicly accessible`,
            description: `Source map files (.js.map) are accessible on this Vercel deployment. These files contain your original, unminified source code including comments, variable names, and internal logic.`,
            recommendation: 'Disable source maps in production. In Next.js, set `productionBrowserSourceMaps: false` in next.config.js (this is the default). If using a custom build, ensure .map files are excluded from the deployment.',
            evidence: `${exposed} of ${jsUrls.length} checked bundles have exposed source maps`,
        });
        return 25;
    }

    if (jsUrls.length > 0) {
        findings.push({
            id: 'vercel-source-maps-ok',
            severity: 'info',
            title: 'Source maps are not publicly accessible',
            description: 'No .js.map files were found accessible on this deployment.',
            recommendation: 'No action needed.',
        });
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 2: _next/data Leaks
// ---------------------------------------------------------------------------

async function checkNextDataLeaks(
    targetUrl: string,
    html: string,
    findings: Finding[],
): Promise<number> {
    // Extract buildId from _next/static/{buildId}
    const buildIdMatch = html.match(/\/_next\/static\/([a-zA-Z0-9_-]{10,})\//) ||
                         html.match(/"buildId"\s*:\s*"([^"]+)"/);
    if (!buildIdMatch) return 0;

    const buildId = buildIdMatch[1];
    const probePaths = ['index.json', 'api.json', 'dashboard.json', 'admin.json'];
    let leakedData = false;

    for (const path of probePaths) {
        try {
            const dataUrl = new URL(`/_next/data/${buildId}/${path}`, targetUrl).href;
            const res = await fetchWithTimeout(dataUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                // Check if the response contains potentially sensitive data
                const sensitivePatterns = /password|secret|token|api[_-]?key|private|credential/i;
                if (sensitivePatterns.test(text)) {
                    leakedData = true;
                    findings.push({
                        id: 'vercel-next-data-leak',
                        severity: 'critical',
                        title: 'Sensitive data found in _next/data endpoint',
                        description: `The _next/data endpoint for "${path}" contains potentially sensitive server-side data (keywords: password, secret, token, api_key). This data was meant for server-side rendering but is publicly accessible.`,
                        recommendation: 'Review getServerSideProps/getStaticProps to ensure no sensitive data is passed to the page. Use API routes for sensitive data instead.',
                        evidence: `/_next/data/${buildId}/${path} — contains sensitive keywords`,
                    });
                }
            }
        } catch { /* skip */ }
    }

    if (leakedData) return 30;

    findings.push({
        id: 'vercel-next-data-ok',
        severity: 'info',
        title: 'No sensitive data found in _next/data endpoints',
        description: 'Probed _next/data endpoints did not contain obviously sensitive information.',
        recommendation: 'No action needed. Continue ensuring server-side props don\'t leak secrets.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 3: Exposed .env Files
// ---------------------------------------------------------------------------

async function checkEnvExposed(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const envPaths = ['/.env', '/.env.local', '/.env.production', '/.env.development'];
    let exposed = false;

    for (const path of envPaths) {
        try {
            const envUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(envUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                // Check if it looks like an env file (KEY=VALUE pairs)
                if (/^[A-Z_]+=.+/m.test(text) && text.length < 50000) {
                    exposed = true;
                    findings.push({
                        id: 'vercel-env-exposed',
                        severity: 'critical',
                        title: `Environment file exposed: ${path}`,
                        description: `The file "${path}" is publicly accessible and appears to contain environment variables. This may include API keys, database passwords, and other secrets.`,
                        recommendation: 'Remove the .env file from your deployment immediately. Vercel handles environment variables through its dashboard — they should never be in the deployed files. Check if secrets have been compromised and rotate them.',
                    });
                }
            }
        } catch { /* skip */ }
    }

    if (exposed) return 40;

    findings.push({
        id: 'vercel-env-ok',
        severity: 'info',
        title: 'No .env files publicly accessible',
        description: 'Common .env file paths are not accessible on this deployment.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 4: Serverless Function Enumeration / Stack Traces
// ---------------------------------------------------------------------------

async function checkApiStackTraces(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const apiPaths = ['/api', '/api/auth', '/api/webhook', '/api/health', '/api/graphql', '/api/test'];
    let stackTraceFound = false;

    for (const path of apiPaths) {
        try {
            const apiUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(apiUrl, {}, 5000);
            const text = await res.text();

            // Check for verbose error responses / stack traces
            const hasStackTrace = /at\s+\w+\s+\(.*:\d+:\d+\)/i.test(text) ||
                                  /Error:.*\n\s+at\s+/i.test(text) ||
                                  /NEXT_PUBLIC_|VERCEL_|process\.env/i.test(text);

            if (hasStackTrace && res.status >= 400) {
                stackTraceFound = true;
                findings.push({
                    id: 'vercel-api-stack-trace',
                    severity: 'medium',
                    title: `API endpoint leaks error details: ${path}`,
                    description: `The API route "${path}" returns verbose error information including stack traces or environment variable names. This helps attackers understand your code structure.`,
                    recommendation: 'Add error handling to API routes that returns generic error messages in production. Never expose stack traces or environment variable names.',
                    evidence: `${path} (HTTP ${res.status})`,
                });
            }
        } catch { /* skip */ }
    }

    if (stackTraceFound) return 15;
    return 0;
}

// ---------------------------------------------------------------------------
// Check 5: Security Headers
// ---------------------------------------------------------------------------

function checkSecurityHeaders(
    headers: Headers,
    findings: Finding[],
): number {
    const issues: string[] = [];

    if (!headers.get('x-frame-options') && !headers.get('content-security-policy')?.includes('frame-ancestors')) {
        issues.push('Missing X-Frame-Options or CSP frame-ancestors (clickjacking risk)');
    }
    if (!headers.get('x-content-type-options')) {
        issues.push('Missing X-Content-Type-Options (MIME sniffing risk)');
    }
    if (!headers.get('strict-transport-security')) {
        issues.push('Missing Strict-Transport-Security (HSTS)');
    }

    if (issues.length > 0) {
        findings.push({
            id: 'vercel-headers-missing',
            severity: 'low',
            title: `${issues.length} security header(s) missing on Vercel deployment`,
            description: `The following security headers are missing: ${issues.join('; ')}.`,
            recommendation: 'Add security headers via vercel.json headers config or Next.js middleware. Vercel does not set these by default.',
            evidence: issues.join('\n'),
        });
        return 5;
    }

    findings.push({
        id: 'vercel-headers-ok',
        severity: 'info',
        title: 'Security headers properly configured',
        description: 'Key security headers are present on this Vercel deployment.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 6: Git Repository Exposure
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
                    id: 'vercel-git-exposed',
                    severity: 'critical',
                    title: '.git directory is publicly accessible',
                    description: 'The .git/HEAD file is accessible, meaning the entire git repository (including commit history, source code, and potentially secrets in old commits) can be downloaded.',
                    recommendation: 'Block access to .git/ directory immediately via vercel.json headers or rewrites. Rotate any secrets that were ever committed to this repository.',
                    evidence: '.git/HEAD returned valid git ref',
                });
                return 40;
            }
        }
    } catch { /* skip */ }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 7: Backup File Detection
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
            id: 'vercel-backup-files',
            severity: 'high',
            title: `${found.length} backup/sensitive file(s) publicly accessible`,
            description: `The following backup or sensitive files are downloadable: ${found.join(', ')}. These may contain database dumps, source code, or credentials.`,
            recommendation: 'Remove backup files from your deployment immediately. Add blocking rules in vercel.json to prevent access to common backup extensions.',
            evidence: found.join('\n'),
        });
        return 25;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 8: Platform Configuration Exposure
// ---------------------------------------------------------------------------

async function checkPlatformConfig(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    try {
        const configUrl = new URL('/vercel.json', targetUrl).href;
        const res = await fetchWithTimeout(configUrl, {}, 5000);
        if (res.status === 200) {
            const text = await res.text();
            if (text.startsWith('{') && text.length < 50000) {
                const hasSecrets = /secret|password|token|api[_-]?key|credential/i.test(text);
                findings.push({
                    id: 'vercel-config-exposed',
                    severity: hasSecrets ? 'high' : 'medium',
                    title: 'vercel.json configuration file is publicly accessible',
                    description: `The vercel.json file is downloadable and reveals deployment configuration including routes, rewrites, and headers.${hasSecrets ? ' It appears to contain references to secrets or API keys.' : ''}`,
                    recommendation: 'While vercel.json is often committed to git, it should not be served publicly. Add a rewrite rule to block access, and ensure no secrets are referenced in it.',
                });
                return hasSecrets ? 20 : 10;
            }
        }
    } catch { /* skip */ }

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
        const { detected, html, headers } = await detectVercel(targetUrl);

        if (!detected) {
            findings.push({
                id: 'no-vercel-detected',
                severity: 'info',
                title: 'Not a Vercel deployment',
                description: 'No Vercel hosting indicators were found. This scanner only applies to Vercel-hosted sites.',
                recommendation: 'No action needed.',
            });

            return new Response(JSON.stringify({
                scannerType: 'vercel_hosting',
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
            id: 'vercel-detected',
            severity: 'info',
            title: 'Vercel hosting detected',
            description: 'This site is hosted on Vercel. Running platform-specific security checks.',
            recommendation: 'Review Vercel security best practices.',
        });

        const [smDeduction, dataDeduction, envDeduction, apiDeduction, gitDeduction, backupDeduction, configDeduction] = await Promise.all([
            (checksRun++, checkSourceMaps(targetUrl, html, findings)),
            (checksRun++, checkNextDataLeaks(targetUrl, html, findings)),
            (checksRun++, checkEnvExposed(targetUrl, findings)),
            (checksRun++, checkApiStackTraces(targetUrl, findings)),
            (checksRun++, checkGitExposure(targetUrl, findings)),
            (checksRun++, checkBackupFiles(targetUrl, findings)),
            (checksRun++, checkPlatformConfig(targetUrl, findings)),
        ]);

        checksRun++;
        const headerDeduction = checkSecurityHeaders(headers, findings);

        score -= smDeduction + dataDeduction + envDeduction + apiDeduction + headerDeduction + gitDeduction + backupDeduction + configDeduction;
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: 'vercel_hosting',
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
        console.error('Vercel scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'vercel_hosting',
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
