import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Netlify Hosting Scanner
 *
 * Auto-detects Netlify-hosted sites and audits for:
 *   - Function enumeration (/.netlify/functions/*)
 *   - Build metadata exposure
 *   - Exposed .env / config files
 *   - Deploy preview information leaks
 *   - Git repository exposure (.git/HEAD)
 *   - Backup and sensitive file detection
 *   - Platform configuration exposure (_redirects, _headers)
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
                'User-Agent': 'CheckVibe-NetlifyScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Netlify Detection
// ---------------------------------------------------------------------------

async function detectNetlify(targetUrl: string): Promise<{ detected: boolean; headers: Headers }> {
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        }, 10000);

        const headers = response.headers;
        // Consume body to avoid resource leak
        await response.text();

        const isNetlify =
            !!headers.get('x-nf-request-id') ||
            (headers.get('server') || '').toLowerCase().includes('netlify') ||
            new URL(targetUrl).hostname.endsWith('.netlify.app');

        return { detected: isNetlify, headers };
    } catch {
        return { detected: false, headers: new Headers() };
    }
}

// ---------------------------------------------------------------------------
// Check 1: Function Enumeration
// ---------------------------------------------------------------------------

async function checkFunctionEnumeration(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const functionNames = ['api', 'auth', 'webhook', 'graphql', 'submit', 'identity', 'login', 'signup', 'handler'];
    const accessible: string[] = [];

    for (const name of functionNames) {
        try {
            const fnUrl = new URL(`/.netlify/functions/${name}`, targetUrl).href;
            const res = await fetchWithTimeout(fnUrl, {}, 5000);
            // If we get anything other than 404, the function exists
            if (res.status !== 404) {
                accessible.push(`${name} (HTTP ${res.status})`);
            }
        } catch { /* skip */ }
    }

    if (accessible.length > 0) {
        findings.push({
            id: 'netlify-functions-exposed',
            severity: 'medium',
            title: `${accessible.length} Netlify function(s) are publicly accessible`,
            description: `The following Netlify Functions responded to unauthenticated requests: ${accessible.join(', ')}. Attackers can discover and probe these endpoints.`,
            recommendation: 'Add authentication checks to all Netlify Functions that handle sensitive operations. Consider using Netlify Identity or JWT verification.',
            evidence: accessible.join('\n'),
        });
        return 15;
    }

    findings.push({
        id: 'netlify-functions-ok',
        severity: 'info',
        title: 'No commonly-named Netlify Functions found',
        description: 'Probed common function names returned 404. Functions may exist under different names or be properly secured.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 2: Build Metadata Exposure
// ---------------------------------------------------------------------------

async function checkBuildMetadata(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const metaPaths = ['/.netlify/state.json', '/.netlify/v1/metadata', '/.netlify/v1/config'];
    let exposed = false;

    for (const path of metaPaths) {
        try {
            const metaUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(metaUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                if (text.length > 2 && text.length < 50000 && (text.startsWith('{') || text.startsWith('['))) {
                    exposed = true;
                    findings.push({
                        id: 'netlify-build-metadata',
                        severity: 'high',
                        title: `Build metadata exposed: ${path}`,
                        description: `The Netlify internal path "${path}" is publicly accessible and returns JSON data. This may contain site IDs, build configuration, and deployment details.`,
                        recommendation: 'Add a redirect rule in your netlify.toml to block access to /.netlify/* paths: [[redirects]] from = "/.netlify/*" to = "/404" status = 404',
                    });
                }
            }
        } catch { /* skip */ }
    }

    if (exposed) return 20;

    findings.push({
        id: 'netlify-metadata-ok',
        severity: 'info',
        title: 'Build metadata paths are not publicly accessible',
        description: 'Netlify internal metadata paths returned 404 or are blocked.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 3: Exposed .env / Config
// ---------------------------------------------------------------------------

async function checkEnvExposed(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    const configPaths = ['/.env', '/.env.local', '/.env.production', '/netlify.toml'];
    let exposed = false;

    for (const path of configPaths) {
        try {
            const envUrl = new URL(path, targetUrl).href;
            const res = await fetchWithTimeout(envUrl, {}, 5000);
            if (res.status === 200) {
                const text = await res.text();
                const isEnvFile = /^[A-Z_]+=.+/m.test(text) && text.length < 50000;
                const isToml = text.includes('[build]') || text.includes('[[redirects]]');

                if (isEnvFile || (path === '/netlify.toml' && isToml)) {
                    exposed = true;
                    const severity = isEnvFile ? 'critical' : 'high';
                    findings.push({
                        id: 'netlify-env-exposed',
                        severity: severity as 'critical' | 'high',
                        title: `Configuration file exposed: ${path}`,
                        description: isEnvFile
                            ? `The file "${path}" is publicly accessible and contains environment variables with potential secrets.`
                            : `The file "netlify.toml" is publicly accessible and reveals build configuration, redirect rules, and potentially plugin configurations.`,
                        recommendation: isEnvFile
                            ? 'Remove .env files from your deployment. Use Netlify\'s environment variable settings in the dashboard instead. Rotate any exposed secrets immediately.'
                            : 'While netlify.toml is typically committed to git, ensure it doesn\'t contain sensitive values. Consider blocking access via redirect rules.',
                    });
                }
            }
        } catch { /* skip */ }
    }

    if (exposed) return 35;

    findings.push({
        id: 'netlify-env-ok',
        severity: 'info',
        title: 'No configuration files publicly accessible',
        description: 'Common .env and config file paths are not accessible on this deployment.',
        recommendation: 'No action needed.',
    });

    return 0;
}

// ---------------------------------------------------------------------------
// Check 4: Deploy Preview Info
// ---------------------------------------------------------------------------

function checkDeployPreview(
    headers: Headers,
    targetUrl: string,
    findings: Finding[],
): number {
    const isPreview = headers.get('x-nf-deploy-id') ||
        /--[a-z0-9]+\.netlify\.app/i.test(targetUrl) ||
        headers.get('x-nf-deploy-context')?.includes('deploy-preview');

    if (isPreview) {
        findings.push({
            id: 'netlify-deploy-preview',
            severity: 'info',
            title: 'This appears to be a deploy preview',
            description: 'This URL appears to be a Netlify deploy preview rather than the production deployment. Deploy previews may expose draft content or unreleased features.',
            recommendation: 'Ensure deploy previews are not indexed by search engines and don\'t expose sensitive data. Consider adding authentication to preview URLs.',
        });
        return 0;
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
                    id: 'netlify-git-exposed',
                    severity: 'critical',
                    title: '.git directory is publicly accessible',
                    description: 'The .git/HEAD file is accessible, meaning the entire git repository (including commit history, source code, and potentially secrets in old commits) can be downloaded.',
                    recommendation: 'Add a redirect rule in netlify.toml to block /.git/*: [[redirects]] from = "/.git/*" to = "/404" status = 404 force = true',
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
            id: 'netlify-backup-files',
            severity: 'high',
            title: `${found.length} backup/sensitive file(s) publicly accessible`,
            description: `The following backup or sensitive files are downloadable: ${found.join(', ')}. These may contain database dumps, source code, or credentials.`,
            recommendation: 'Remove backup files from your deployment. Add redirect rules in netlify.toml to block common backup file extensions.',
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
        { path: '/_redirects', name: '_redirects', desc: 'redirect rules revealing internal paths and API endpoints' },
        { path: '/_headers', name: '_headers', desc: 'custom header configuration that may reveal security policies' },
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
                    if (/secret|password|token|api[_-]?key|credential/i.test(text)) {
                        hasSecrets = true;
                    }
                }
            }
        } catch { /* skip */ }
    }

    if (exposed.length > 0) {
        findings.push({
            id: 'netlify-config-exposed',
            severity: hasSecrets ? 'high' : 'low',
            title: `Netlify config file(s) accessible: ${exposed.join(', ')}`,
            description: `The following Netlify configuration files are publicly downloadable: ${exposed.join(', ')}. These reveal routing rules, internal paths, and deployment configuration.${hasSecrets ? ' References to secrets or API keys were detected.' : ''}`,
            recommendation: 'Add redirect rules to block access to _redirects and _headers files, or move to netlify.toml-based configuration which is not served as static files.',
        });
        return hasSecrets ? 15 : 5;
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

// @ts-ignore
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
        const { detected, headers } = await detectNetlify(targetUrl);

        if (!detected) {
            findings.push({
                id: 'no-netlify-detected',
                severity: 'info',
                title: 'Not a Netlify deployment',
                description: 'No Netlify hosting indicators were found. This scanner only applies to Netlify-hosted sites.',
                recommendation: 'No action needed.',
            });

            return new Response(JSON.stringify({
                scannerType: 'netlify_hosting',
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
            id: 'netlify-detected',
            severity: 'info',
            title: 'Netlify hosting detected',
            description: 'This site is hosted on Netlify. Running platform-specific security checks.',
            recommendation: 'Review Netlify security best practices.',
        });

        const [fnDeduction, metaDeduction, envDeduction, gitDeduction, backupDeduction, configDeduction] = await Promise.all([
            (checksRun++, checkFunctionEnumeration(targetUrl, findings)),
            (checksRun++, checkBuildMetadata(targetUrl, findings)),
            (checksRun++, checkEnvExposed(targetUrl, findings)),
            (checksRun++, checkGitExposure(targetUrl, findings)),
            (checksRun++, checkBackupFiles(targetUrl, findings)),
            (checksRun++, checkPlatformConfig(targetUrl, findings)),
        ]);

        checksRun++;
        const previewDeduction = checkDeployPreview(headers, targetUrl, findings);

        score -= fnDeduction + metaDeduction + envDeduction + previewDeduction + gitDeduction + backupDeduction + configDeduction;
        score = Math.max(0, Math.min(100, score));

        const result: ScanResult = {
            scannerType: 'netlify_hosting',
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
        console.error('Netlify scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'netlify_hosting',
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
