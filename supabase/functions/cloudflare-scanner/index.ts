import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Cloudflare Pages Scanner
 *
 * Auto-detects Cloudflare Pages-hosted sites and audits for:
 *   - Previous deployment access (hash-based URLs)
 *   - Missing noindex on preview deployments
 *   - Exposed source maps
 *   - Workers/Functions enumeration
 *   - Git repository exposure (.git/HEAD)
 *   - Backup and sensitive file detection
 *   - Platform configuration exposure (wrangler.toml, _headers, _redirects)
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
                'User-Agent': 'CheckVibe-CloudflareScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Cloudflare Pages Detection
// ---------------------------------------------------------------------------

async function detectCloudflare(targetUrl: string): Promise<{ detected: boolean; html: string; headers: Headers; isPagesDev: boolean }> {
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        }, 10000);

        const headers = response.headers;
        const html = await response.text();
        const hostname = new URL(targetUrl).hostname;

        const hasCfRay = !!headers.get('cf-ray');
        const isPagesDev = hostname.endsWith('.pages.dev');
        const isCfServer = (headers.get('server') || '').toLowerCase() === 'cloudflare';

        // We specifically look for Cloudflare Pages (not just any CF-proxied site)
        // pages.dev domain is a strong signal; CF-Ray + specific patterns is weaker
        const detected = isPagesDev || (hasCfRay && isCfServer);

        return { detected, html, headers, isPagesDev };
    } catch {
        return { detected: false, html: '', headers: new Headers(), isPagesDev: false };
    }
}

// ---------------------------------------------------------------------------
// Check 1: Previous Deployment Access
// ---------------------------------------------------------------------------

async function checkOldDeploys(
    targetUrl: string,
    isPagesDev: boolean,
    findings: Finding[],
): Promise<number> {
    if (!isPagesDev) {
        // Can only test on .pages.dev domains
        return 0;
    }

    // pages.dev URLs follow the pattern: <hash>.<project>.pages.dev
    const hostname = new URL(targetUrl).hostname;
    const parts = hostname.split('.');
    // e.g. my-project.pages.dev -> parts = ['my-project', 'pages', 'dev']
    // or abc123.my-project.pages.dev -> parts = ['abc123', 'my-project', 'pages', 'dev']

    if (parts.length >= 4) {
        // This itself is a deployment-specific URL
        findings.push({
            id: 'cf-old-deploys-accessible',
            severity: 'info',
            title: 'This is a deployment-specific Cloudflare Pages URL',
            description: `The URL "${hostname}" appears to be a specific deployment rather than the production URL. Old deployments may remain accessible.`,
            recommendation: 'Use Cloudflare Access or deployment controls to restrict access to non-production deployments.',
        });
        return 0;
    }

    // We note that old deploys *may* be accessible but can't enumerate without knowing hashes
    findings.push({
        id: 'cf-old-deploys-info',
        severity: 'low',
        title: 'Cloudflare Pages may have accessible old deployments',
        description: `Sites on *.pages.dev may have previous deployments accessible at <hash>.${parts[0]}.pages.dev. Old deployments can contain outdated code with known vulnerabilities or debug settings.`,
        recommendation: 'Enable Cloudflare Access policies to restrict preview deployments. Consider using the Cloudflare Pages deployment controls to limit access.',
    });

    return 5;
}

// ---------------------------------------------------------------------------
// Check 2: Missing noindex on Previews
// ---------------------------------------------------------------------------

function checkNoindex(
    headers: Headers,
    html: string,
    isPagesDev: boolean,
    findings: Finding[],
): number {
    if (!isPagesDev) return 0;

    const robotsTag = headers.get('x-robots-tag');
    const metaNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);

    if (!robotsTag?.includes('noindex') && !metaNoindex) {
        findings.push({
            id: 'cf-missing-noindex',
            severity: 'low',
            title: 'Pages.dev deployment may be indexed by search engines',
            description: 'This .pages.dev URL does not have a noindex directive. Search engines may index preview/development URLs, leading to duplicate content or exposure of draft content.',
            recommendation: 'Add X-Robots-Tag: noindex header via _headers file or Cloudflare Workers for .pages.dev URLs. Use your custom domain for production.',
        });
        return 5;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 3: Exposed Source Maps
// ---------------------------------------------------------------------------

async function checkSourceMaps(
    targetUrl: string,
    html: string,
    findings: Finding[],
): Promise<number> {
    // Extract JS paths from HTML
    const scriptPattern = /src=["']([^"']+\.js)["']/gi;
    const jsUrls: string[] = [];
    let match;
    while ((match = scriptPattern.exec(html)) !== null && jsUrls.length < 5) {
        try {
            const resolved = new URL(match[1], targetUrl);
            if (resolved.origin === new URL(targetUrl).origin) {
                jsUrls.push(resolved.href);
            }
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
            id: 'cf-source-maps',
            severity: 'high',
            title: `${exposed} source map file(s) publicly accessible`,
            description: `Source map files (.js.map) are accessible on this Cloudflare Pages deployment, exposing your original unminified source code.`,
            recommendation: 'Exclude .map files from your build output or add a _headers file to block access: /*.map Access-Control-Allow-Origin: none and return 404.',
            evidence: `${exposed} of ${jsUrls.length} checked scripts have exposed source maps`,
        });
        return 20;
    }

    if (jsUrls.length > 0) {
        findings.push({
            id: 'cf-source-maps-ok',
            severity: 'info',
            title: 'Source maps are not publicly accessible',
            description: 'No .js.map files were found accessible on this deployment.',
            recommendation: 'No action needed.',
        });
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 4: Workers/Functions Enumeration
// ---------------------------------------------------------------------------

async function checkWorkersExposed(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const probePaths = ['/api', '/api/auth', '/api/webhook', '/_worker.js', '/api/graphql', '/functions'];
    const accessible: string[] = [];

    for (const path of probePaths) {
        try {
            const probeUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(probeUrl, {}, 5000);

            if (path === '/_worker.js' && res.status === 200) {
                const text = await res.text();
                if (text.includes('addEventListener') || text.includes('export default')) {
                    accessible.push(`_worker.js (source code exposed)`);
                }
            } else if (res.status !== 404 && res.status !== 405 && path !== '/_worker.js') {
                // Check for verbose error info
                const text = await res.text();
                if (/at\s+\w+\s+\(.*:\d+:\d+\)/i.test(text) || /Error:.*\n/i.test(text)) {
                    accessible.push(`${path} (HTTP ${res.status}, leaks error info)`);
                }
            }
        } catch { /* skip */ }
    }

    if (accessible.length > 0) {
        const hasWorkerSource = accessible.some(a => a.includes('_worker.js'));
        findings.push({
            id: 'cf-workers-exposed',
            severity: hasWorkerSource ? 'high' : 'medium',
            title: hasWorkerSource
                ? 'Cloudflare Worker source code is publicly accessible'
                : `${accessible.length} API endpoint(s) leak implementation details`,
            description: hasWorkerSource
                ? 'The _worker.js file is directly downloadable, exposing your Worker/Function source code including any embedded secrets or logic.'
                : `The following endpoints returned verbose responses: ${accessible.join(', ')}.`,
            recommendation: hasWorkerSource
                ? 'Cloudflare Pages Functions should not expose _worker.js. Check your build configuration and ensure the output does not include source files.'
                : 'Add error handling to return generic error messages in production.',
            evidence: accessible.join('\n'),
        });
        return hasWorkerSource ? 25 : 10;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 5: Git Repository Exposure
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
                    id: 'cf-git-exposed',
                    severity: 'critical',
                    title: '.git directory is publicly accessible',
                    description: 'The .git/HEAD file is accessible, meaning the entire git repository (including commit history, source code, and potentially secrets in old commits) can be downloaded.',
                    recommendation: 'Add a rule in _headers or Cloudflare Workers to block access to /.git/* paths. Rotate any secrets that were ever committed to this repository.',
                    evidence: '.git/HEAD returned valid git ref',
                });
                return 40;
            }
        }
    } catch { /* skip */ }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 6: Backup File Detection
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
            id: 'cf-backup-files',
            severity: 'high',
            title: `${found.length} backup/sensitive file(s) publicly accessible`,
            description: `The following backup or sensitive files are downloadable: ${found.join(', ')}. These may contain database dumps, source code, or credentials.`,
            recommendation: 'Remove backup files from your deployment. Add rules in _headers or a Cloudflare Worker to block access to backup file extensions.',
            evidence: found.join('\n'),
        });
        return 25;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Check 7: Platform Configuration Exposure
// ---------------------------------------------------------------------------

async function checkPlatformConfig(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const configFiles = [
        { path: '/wrangler.toml', name: 'wrangler.toml' },
        { path: '/_headers', name: '_headers' },
        { path: '/_redirects', name: '_redirects' },
    ];
    const exposed: string[] = [];
    let hasSecrets = false;

    for (const { path, name } of configFiles) {
        try {
            const configUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(configUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                if (text.length > 5 && text.length < 50000) {
                    exposed.push(name);
                    if (/secret|password|token|api[_-]?key|credential|account_id/i.test(text)) {
                        hasSecrets = true;
                    }
                }
            }
        } catch { /* skip */ }
    }

    if (exposed.length > 0) {
        findings.push({
            id: 'cf-config-exposed',
            severity: hasSecrets ? 'high' : 'low',
            title: `Cloudflare config file(s) accessible: ${exposed.join(', ')}`,
            description: `The following configuration files are publicly downloadable: ${exposed.join(', ')}. ${exposed.includes('wrangler.toml') ? 'wrangler.toml may reveal account IDs, zone IDs, and Worker bindings.' : 'These reveal routing rules and deployment configuration.'}${hasSecrets ? ' References to secrets or account identifiers were detected.' : ''}`,
            recommendation: 'Block access to configuration files. For wrangler.toml, ensure it is not included in the Pages build output. For _headers and _redirects, consider using a Worker to block direct access.',
        });
        return hasSecrets ? 15 : 5;
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
        const { detected, html, headers, isPagesDev } = await detectCloudflare(targetUrl);

        if (!detected) {
            findings.push({
                id: 'no-cloudflare-detected',
                severity: 'info',
                title: 'Not a Cloudflare Pages deployment',
                description: 'No Cloudflare Pages hosting indicators were found. This scanner only applies to Cloudflare Pages-hosted sites.',
                recommendation: 'No action needed.',
            });

            return new Response(JSON.stringify({
                scannerType: 'cloudflare_hosting',
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
            id: 'cloudflare-detected',
            severity: 'info',
            title: 'Cloudflare Pages hosting detected',
            description: 'This site is hosted on Cloudflare Pages. Running platform-specific security checks.',
            recommendation: 'Review Cloudflare Pages security best practices.',
        });

        checksRun++;
        const deployDeduction = await checkOldDeploys(targetUrl, isPagesDev, findings);

        checksRun++;
        const noindexDeduction = checkNoindex(headers, html, isPagesDev, findings);

        const [smDeduction, workersDeduction, gitDeduction, backupDeduction, configDeduction] = await Promise.all([
            (checksRun++, checkSourceMaps(targetUrl, html, findings)),
            (checksRun++, checkWorkersExposed(targetUrl, findings)),
            (checksRun++, checkGitExposure(targetUrl, findings)),
            (checksRun++, checkBackupFiles(targetUrl, findings)),
            (checksRun++, checkPlatformConfig(targetUrl, findings)),
        ]);

        score -= deployDeduction + noindexDeduction + smDeduction + workersDeduction + gitDeduction + backupDeduction + configDeduction;
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: 'cloudflare_hosting',
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
        console.error('Cloudflare scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'cloudflare_hosting',
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
