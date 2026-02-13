import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * API Key & Exposure Scanner
 * Detects exposed API keys, secrets, credentials, exposed infrastructure,
 * and unprotected databases in client-side code and server paths.
 */

const API_KEY_PATTERNS = [
    // AWS
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
    { name: 'AWS Secret Key', pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, severity: 'critical', requiresContext: true },
    { name: 'AWS MWS Token', pattern: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'critical' },

    // Azure
    { name: 'Azure Storage Key', pattern: /(?:[A-Za-z0-9+/]{86}==)/g, severity: 'critical', requiresContext: true },
    { name: 'Azure AD Client Secret', pattern: /(?:azure|AZURE).*['"]\b[a-zA-Z0-9~._-]{34}\b['"]/gi, severity: 'critical' },

    // GCP
    { name: 'GCP Service Account Key', pattern: /"type"\s*:\s*"service_account"/g, severity: 'critical' },

    // Stripe
    { name: 'Stripe Live Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
    { name: 'Stripe Test Secret Key', pattern: /sk_test_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
    { name: 'Stripe Restricted Key', pattern: /rk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical' },

    // OpenAI
    { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g, severity: 'critical' },
    { name: 'OpenAI API Key (new)', pattern: /sk-proj-[a-zA-Z0-9]{48}/g, severity: 'critical' },

    // Anthropic
    { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },

    // Hugging Face
    { name: 'Hugging Face Token', pattern: /hf_[a-zA-Z0-9]{34,}/g, severity: 'critical' },

    // Replicate
    { name: 'Replicate API Token', pattern: /r8_[a-zA-Z0-9]{20,}/g, severity: 'critical' },

    // Google
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g, severity: 'critical' },
    { name: 'Google OAuth Client ID', pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, severity: 'critical' },

    // Firebase
    { name: 'Firebase API Key', pattern: /(?:apiKey|FIREBASE_API_KEY)\s*[:=]\s*['"](AIza[0-9A-Za-z-_]{35})['"]/gi, severity: 'critical' },

    // GitHub
    { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub OAuth Token', pattern: /gho_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub App Token', pattern: /ghu_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub Fine-Grained PAT', pattern: /github_pat_[a-zA-Z0-9_]{82}/g, severity: 'critical' },

    // GitLab
    { name: 'GitLab PAT', pattern: /glpat-[a-zA-Z0-9_-]{20,}/g, severity: 'critical' },

    // Supabase
    { name: 'Supabase Service Role Key', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, severity: 'critical', additionalCheck: (match: string) => match.includes('service_role') },

    // MongoDB
    { name: 'MongoDB Connection String', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },

    // PostgreSQL
    { name: 'PostgreSQL Connection String', pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },

    // Redis
    { name: 'Redis Connection String', pattern: /redis:\/\/[^:]*:[^@]+@[^\s'"]+/gi, severity: 'critical' },

    // MySQL
    { name: 'MySQL Connection String', pattern: /mysql:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },

    // Twilio
    { name: 'Twilio API Key', pattern: /SK[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Twilio Auth Token', pattern: /(?:twilio|TWILIO).*['"]\b[a-f0-9]{32}\b['"]/gi, severity: 'critical' },

    // Slack
    { name: 'Slack Bot Token', pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g, severity: 'critical' },
    { name: 'Slack Webhook URL', pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g, severity: 'critical' },

    // Discord
    { name: 'Discord Bot Token', pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/g, severity: 'critical' },
    { name: 'Discord Webhook', pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g, severity: 'critical' },

    // Telegram
    { name: 'Telegram Bot Token', pattern: /\d{8,10}:[A-Za-z0-9_-]{35}/g, severity: 'critical' },

    // SendGrid
    { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'critical' },

    // Mailchimp
    { name: 'Mailchimp API Key', pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g, severity: 'critical' },

    // Mailgun
    { name: 'Mailgun API Key', pattern: /key-[a-zA-Z0-9]{32}/g, severity: 'critical' },

    // Postmark
    { name: 'Postmark Server Token', pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical', requiresContext: true },

    // Square
    { name: 'Square Access Token', pattern: /sq0atp-[a-zA-Z0-9_-]{22,}/g, severity: 'critical' },
    { name: 'Square OAuth Secret', pattern: /sq0csp-[a-zA-Z0-9_-]{43,}/g, severity: 'critical' },

    // PayPal / Braintree
    { name: 'PayPal/Braintree Token', pattern: /access_token\$production\$[a-z0-9]{13}\$[a-f0-9]{32}/g, severity: 'critical' },

    // Doppler
    { name: 'Doppler Token', pattern: /dp\.st\.[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },

    // Vercel
    { name: 'Vercel Token', pattern: /(?:vercel|VERCEL).*['"]\b[a-zA-Z0-9]{24}\b['"]/gi, severity: 'critical' },

    // Netlify
    { name: 'Netlify Token', pattern: /(?:netlify|NETLIFY).*['"]\b[a-zA-Z0-9_-]{40,}\b['"]/gi, severity: 'critical' },

    // JWT Secret
    { name: 'JWT Secret', pattern: /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{16,}['"]/gi, severity: 'critical' },

    // Private Keys
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },

    // Generic patterns
    { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Generic Secret', pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },
];

// ---------------------------------------------------------------------------
// Public key allowlist — keys that are designed to be in client-side code.
// If a matched secret matches one of these, downgrade to info severity.
// ---------------------------------------------------------------------------
const PUBLIC_KEY_ALLOWLIST: Array<{
    name: string;
    test: (match: string, context: string) => boolean;
    note: string;
}> = [
    {
        name: 'Stripe Publishable Key',
        test: (m) => /^pk_(?:live|test)_/.test(m),
        note: 'Stripe publishable keys are safe to expose in client-side code. They can only create tokens, not read data.',
    },
    {
        name: 'Google Analytics ID',
        test: (m) => /^G-[A-Z0-9]{4,12}$/.test(m),
        note: 'Google Analytics measurement IDs are public tracking identifiers.',
    },
    {
        name: 'Google AdSense ID',
        test: (m) => /^ca-pub-\d{10,16}$/.test(m),
        note: 'AdSense publisher IDs are public by design.',
    },
    {
        name: 'reCAPTCHA Site Key',
        test: (m, ctx) => /recaptcha|captcha|sitekey/i.test(ctx) && /^6L[a-zA-Z0-9_-]{38}$/.test(m),
        note: 'reCAPTCHA site keys are designed to be public.',
    },
];

/**
 * Check if a matched secret is a known public key.
 * Returns the allowlist entry if matched, null otherwise.
 */
function checkPublicKey(match: string, surroundingContext: string): typeof PUBLIC_KEY_ALLOWLIST[number] | null {
    for (const entry of PUBLIC_KEY_ALLOWLIST) {
        if (entry.test(match, surroundingContext)) return entry;
    }
    return null;
}

/**
 * Get ~200 chars of surrounding context for a match in content.
 */
function getSurroundingContext(content: string, matchIndex: number, matchLength: number): string {
    const start = Math.max(0, matchIndex - 100);
    const end = Math.min(content.length, matchIndex + matchLength + 100);
    return content.substring(start, end);
}

// CDN domains to skip when fetching JS files
const CDN_SKIP_LIST = [
    'cdn.', 'unpkg.com', 'cdnjs.', 'jsdelivr.net', 'ajax.aspnetcdn.com',
    'code.jquery.com', 'fonts.googleapis.com', 'polyfill.io', 'googletagmanager.com',
    'google-analytics.com', 'connect.facebook.net', 'platform.twitter.com',
];

// Paths to probe for exposed infrastructure
const INFRA_PROBES = [
    { path: '/.env', severity: 'critical', validate: (body: string, status: number) => status === 200 && /^[A-Z_]+=.+/m.test(body) && !body.includes('<!DOCTYPE') && !body.includes('<html') },
    { path: '/.git/HEAD', severity: 'critical', validate: (body: string, status: number) => status === 200 && body.startsWith('ref: refs/') },
    { path: '/.git/config', severity: 'critical', validate: (body: string, status: number) => status === 200 && (body.includes('[core]') || body.includes('[remote')) },
    { path: '/phpinfo.php', severity: 'high', validate: (body: string, status: number) => status === 200 && body.includes('PHP Version') && body.includes('phpinfo()') },
    { path: '/swagger.json', severity: 'medium', validate: (body: string, status: number) => { try { const j = JSON.parse(body); return status === 200 && (j.swagger || j.openapi); } catch { return false; } } },
    { path: '/api-docs', severity: 'medium', validate: (body: string, status: number) => status === 200 && /swagger|openapi|api documentation/i.test(body) },
    { path: '/wp-config.php.bak', severity: 'critical', validate: (body: string, status: number) => status === 200 && (body.includes('DB_NAME') || body.includes('DB_PASSWORD')) },
    { path: '/server-status', severity: 'medium', validate: (body: string, status: number) => status === 200 && body.includes('Apache Server Status') },
    { path: '/.DS_Store', severity: 'low', validate: (body: string, status: number) => status === 200 && body.includes('Bud1') },
    { path: '/debug', severity: 'high', validate: (body: string, status: number) => { if (status !== 200) return false; try { const j = JSON.parse(body); return j.stack || j.debug; } catch { return body.includes('Traceback (most recent call last)'); } } },
    { path: '/graphql', severity: 'medium', validate: (body: string, status: number) => status === 200 && /graphql playground|graphiql|altair/i.test(body) },
];

// Database admin UI probes
const DB_ADMIN_PROBES = [
    { path: '/phpmyadmin/', validate: (body: string) => body.includes('phpMyAdmin') && body.includes('pma_'), name: 'phpMyAdmin' },
    { path: '/adminer.php', validate: (body: string) => body.includes('Adminer') && body.includes('login-'), name: 'Adminer' },
    { path: '/_utils/', validate: (body: string) => /fauxton|couchdb/i.test(body), name: 'CouchDB Fauxton' },
    { path: '/mongo-express/', validate: (body: string) => body.includes('mongo-express'), name: 'Mongo Express' },
];

// Unprotected API endpoint probes
const API_ENDPOINT_PROBES = [
    '/api/users',
    '/api/v1/users',
    '/api/admin',
];

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    location?: string;
    evidence?: string;
    category?: 'credentials' | 'infrastructure' | 'databases';
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    sourcesScanned: number;
    scannedAt: string;
    url: string;
}

function redactSecret(secret: string): string {
    if (secret.length <= 8) return '***REDACTED***';
    return secret.substring(0, 4) + '...[REDACTED]';
}

function calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1;
    }
    return Object.values(freq).reduce((entropy, count) => {
        const p = count / str.length;
        return entropy - p * Math.log2(p);
    }, 0);
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'CheckVibe-Scanner/2.0' },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Compute a simple hash of a string for SPA fingerprinting */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 2000); i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

function resolveUrl(scriptUrl: string, baseUrl: string): string {
    if (scriptUrl.startsWith('//')) {
        return 'https:' + scriptUrl;
    } else if (scriptUrl.startsWith('/')) {
        const base = new URL(baseUrl);
        return base.origin + scriptUrl;
    } else if (!scriptUrl.startsWith('http')) {
        return new URL(scriptUrl, baseUrl).href;
    }
    return scriptUrl;
}

function isCdnUrl(url: string): boolean {
    return CDN_SKIP_LIST.some(cdn => url.includes(cdn));
}

async function fetchSources(url: string): Promise<Array<{ content: string; location: string }>> {
    const sources: Array<{ content: string; location: string }> = [];

    try {
        // Fetch main HTML
        const response = await fetchWithTimeout(url);
        const html = await response.text();
        sources.push({ content: html, location: 'HTML source' });

        // Extract script URLs from HTML
        const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
        const scriptUrls: string[] = [];

        for (const match of scriptMatches) {
            if (scriptUrls.length >= 15) break;
            const scriptUrl = resolveUrl(match[1], url);
            if (!isCdnUrl(scriptUrl)) {
                scriptUrls.push(scriptUrl);
            }
        }

        // Discover webpack/Next.js build manifest chunks
        const manifestMatch = html.match(/\/_next\/static\/[^/]+\/_buildManifest\.js/);
        if (manifestMatch) {
            const manifestUrl = resolveUrl(manifestMatch[0], url);
            try {
                const manifestRes = await fetchWithTimeout(manifestUrl, 5000);
                const manifestContent = await manifestRes.text();
                // Extract chunk paths from the manifest
                const chunkPaths = manifestContent.matchAll(/["'](\/_next\/static\/chunks\/[^"']+)["']/g);
                for (const chunkMatch of chunkPaths) {
                    if (scriptUrls.length >= 15) break;
                    const chunkUrl = resolveUrl(chunkMatch[1], url);
                    if (!scriptUrls.includes(chunkUrl)) {
                        scriptUrls.push(chunkUrl);
                    }
                }
            } catch { /* skip manifest fetch failures */ }
        }

        // Fetch JS files + attempt source map extraction
        await Promise.all(
            scriptUrls.map(async (jsUrl) => {
                try {
                    const jsResponse = await fetchWithTimeout(jsUrl, 5000);
                    const jsContent = await jsResponse.text();
                    if (jsContent.length > 500000) return;
                    sources.push({ content: jsContent, location: jsUrl });

                    // Check for source map
                    let sourceMapUrl: string | null = null;

                    // Check response header
                    const smHeader = jsResponse.headers.get('SourceMap') || jsResponse.headers.get('X-SourceMap');
                    if (smHeader) {
                        sourceMapUrl = resolveUrl(smHeader, jsUrl);
                    }

                    // Check inline comment
                    if (!sourceMapUrl) {
                        const smMatch = jsContent.match(/\/\/[#@]\s*sourceMappingURL=(\S+)/);
                        if (smMatch && !smMatch[1].startsWith('data:')) {
                            sourceMapUrl = resolveUrl(smMatch[1], jsUrl);
                        }
                    }

                    // Fetch source map and extract original source
                    if (sourceMapUrl) {
                        try {
                            const smResponse = await fetchWithTimeout(sourceMapUrl, 5000);
                            if (smResponse.ok) {
                                const smText = await smResponse.text();
                                const smData = JSON.parse(smText);
                                if (smData.sourcesContent && Array.isArray(smData.sourcesContent)) {
                                    for (const src of smData.sourcesContent) {
                                        if (typeof src === 'string' && src.length > 50 && src.length <= 200000) {
                                            sources.push({ content: src, location: `Source map: ${sourceMapUrl}` });
                                        }
                                    }
                                }
                            }
                        } catch { /* skip source map fetch failures */ }
                    }
                } catch { /* skip failed JS fetches */ }
            })
        );

        // Extract inline scripts
        const inlineScripts = html.match(/<script[^>]*>([^<]+)<\/script>/gi) || [];
        inlineScripts.forEach((script, index) => {
            const content = script.replace(/<\/?script[^>]*>/gi, '');
            if (content.length > 50) {
                sources.push({ content, location: `Inline script #${index + 1}` });
            }
        });

    } catch {
        // Return whatever we have
    }

    return sources;
}

/** Fingerprint the site's 404 response to avoid SPA false positives */
async function get404Fingerprint(baseUrl: string): Promise<{ status: number; hash: number } | null> {
    try {
        const randomPath = '/__checkvibe_nonexistent_' + Math.random().toString(36).slice(2);
        const origin = new URL(baseUrl).origin;
        const res = await fetchWithTimeout(origin + randomPath, 5000);
        const body = await res.text();
        return { status: res.status, hash: simpleHash(body) };
    } catch {
        return null;
    }
}

async function probeExposedPaths(baseUrl: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origin = new URL(baseUrl).origin;

    // Get 404 fingerprint for SPA detection
    const fingerprint404 = await get404Fingerprint(baseUrl);

    const probeResults = await Promise.all(
        INFRA_PROBES.map(async (probe) => {
            try {
                const res = await fetchWithTimeout(origin + probe.path, 5000);
                const body = await res.text();

                // Check if this is just the SPA catch-all
                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                if (probe.validate(body, res.status)) {
                    return {
                        id: `infra-${probe.path.replace(/[^a-z0-9]/gi, '-')}-${findings.length}`,
                        severity: probe.severity as Finding['severity'],
                        title: `Exposed ${probe.path}`,
                        description: `The path ${probe.path} is publicly accessible and contains sensitive content. This file should never be served to the internet.`,
                        recommendation: `Block access to ${probe.path} immediately via your web server configuration or .htaccess rules.`,
                        location: origin + probe.path,
                        category: 'infrastructure' as const,
                    };
                }
            } catch { /* timeout or network error - skip */ }
            return null;
        })
    );

    for (const result of probeResults) {
        if (result) findings.push(result);
    }

    return findings;
}

async function probeExposedDatabases(baseUrl: string, html: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origin = new URL(baseUrl).origin;

    // Get 404 fingerprint for SPA detection
    const fingerprint404 = await get404Fingerprint(baseUrl);

    // DB Admin UI probes
    const adminResults = await Promise.all(
        DB_ADMIN_PROBES.map(async (probe) => {
            try {
                const res = await fetchWithTimeout(origin + probe.path, 5000);
                const body = await res.text();

                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                if (res.ok && probe.validate(body)) {
                    return {
                        id: `db-admin-${probe.name.toLowerCase().replace(/\s+/g, '-')}`,
                        severity: 'critical' as const,
                        title: `Exposed ${probe.name} Panel`,
                        description: `${probe.name} database admin panel is publicly accessible at ${probe.path}. Anyone can attempt to log in and access your database.`,
                        recommendation: `Restrict access to ${probe.name} by IP allowlist, VPN, or remove it from the public server entirely.`,
                        location: origin + probe.path,
                        category: 'databases' as const,
                    };
                }
            } catch { /* skip */ }
            return null;
        })
    );

    for (const r of adminResults) if (r) findings.push(r);

    // Firebase RTDB world-readable check
    const firebaseMatch = html.match(/["']https?:\/\/([a-z0-9-]+\.firebaseio\.com)["']/i);
    if (firebaseMatch) {
        const firebaseUrl = `https://${firebaseMatch[1]}/.json?shallow=true`;
        try {
            const res = await fetchWithTimeout(firebaseUrl, 5000);
            const body = await res.text();
            if (res.ok && body !== 'null' && !body.includes('Permission denied')) {
                findings.push({
                    id: 'db-firebase-rtdb-open',
                    severity: 'critical',
                    title: 'Firebase Realtime DB World-Readable',
                    description: `Firebase Realtime Database at ${firebaseMatch[1]} is readable by anyone without authentication. All data is publicly exposed.`,
                    recommendation: 'Update Firebase Realtime Database security rules to require authentication. Never use {"rules": {".read": true}}.',
                    location: firebaseUrl,
                    category: 'databases',
                });
            }
        } catch { /* skip */ }
    }

    // Unprotected API endpoint probes
    const apiResults = await Promise.all(
        API_ENDPOINT_PROBES.map(async (path) => {
            try {
                const res = await fetchWithTimeout(origin + path, 5000);
                if (!res.ok) return null;
                const body = await res.text();

                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                try {
                    const json = JSON.parse(body);
                    const str = JSON.stringify(json).toLowerCase();
                    const hasSensitive = ['email', 'password', 'username', 'secret', 'token', 'ssn'].some(f => str.includes(f));
                    if (hasSensitive && (Array.isArray(json) || (json.data && Array.isArray(json.data)))) {
                        return {
                            id: `db-api-${path.replace(/[^a-z0-9]/gi, '-')}`,
                            severity: 'high' as const,
                            title: `Unprotected API: ${path}`,
                            description: `The endpoint ${path} returns sensitive data (e.g. emails, usernames) without authentication.`,
                            recommendation: `Add authentication middleware to ${path} and ensure it requires valid credentials.`,
                            location: origin + path,
                            category: 'databases' as const,
                        };
                    }
                } catch { /* not JSON, skip */ }
            } catch { /* skip */ }
            return null;
        })
    );

    for (const r of apiResults) if (r) findings.push(r);

    return findings;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
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
        const url = validation.url!;

        // Run all three workstreams in parallel
        const [sources, infraFindings, dbFindings] = await Promise.all([
            fetchSources(url),
            probeExposedPaths(url),
            // DB probing needs HTML, so we fetch it inline
            fetchWithTimeout(url).then(r => r.text()).then(html => probeExposedDatabases(url, html)).catch(() => [] as Finding[]),
        ]);

        const findings: Finding[] = [];
        const foundSecrets = new Set<string>(); // Deduplicate

        // Scan sources for credential patterns
        for (const { content, location } of sources) {
            for (const { name, pattern, severity, requiresContext, additionalCheck } of API_KEY_PATTERNS) {
                // Reset regex lastIndex
                pattern.lastIndex = 0;

                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const secret = match[0];

                    // Skip if already found
                    if (foundSecrets.has(secret)) continue;

                    // Skip low entropy matches for generic patterns
                    if (requiresContext) {
                        const entropy = calculateEntropy(secret);
                        if (entropy < 4.0) continue;
                    }

                    // Run additional check if specified
                    if (additionalCheck && !additionalCheck(secret)) continue;

                    foundSecrets.add(secret);

                    const isSourceMap = location.startsWith('Source map:');

                    // Check if this is a known public key (no score deduction)
                    const context = getSurroundingContext(content, match.index, secret.length);
                    const publicKey = checkPublicKey(secret, context);

                    if (publicKey) {
                        findings.push({
                            id: `public-key-${name.toLowerCase().replace(/\s+/g, '-')}-${findings.length}`,
                            severity: 'info',
                            title: `Public Key: ${publicKey.name}`,
                            description: publicKey.note,
                            recommendation: 'No action required. This is a publishable key intended for client-side use.',
                            location,
                            evidence: redactSecret(secret),
                            category: 'credentials',
                        });
                    } else {
                        findings.push({
                            id: `leak-${name.toLowerCase().replace(/\s+/g, '-')}-${findings.length}`,
                            severity: severity as Finding['severity'],
                            title: `Exposed ${name}`,
                            description: `Found a potential ${name} exposed in ${isSourceMap ? 'a downloadable source map' : 'client-side code'}. This could allow attackers to access your services.`,
                            recommendation: `Immediately revoke this key and generate a new one. Never expose secret keys in client-side code. Use environment variables and server-side API routes instead.${isSourceMap ? ' Disable source map generation in production builds.' : ''}`,
                            location,
                            evidence: redactSecret(secret),
                            category: 'credentials',
                        });
                    }
                }
            }
        }

        // Check if any source maps were discovered (even if no keys found in them)
        const sourceMapSources = sources.filter(s => s.location.startsWith('Source map:'));
        if (sourceMapSources.length > 0) {
            findings.push({
                id: 'infra-source-maps-exposed',
                severity: 'medium',
                title: 'Source Maps Publicly Accessible',
                description: `Found ${sourceMapSources.length} source map file(s) exposing your original unminified source code. Attackers can read your business logic, comments, and internal paths.`,
                recommendation: 'Disable source map generation in production or restrict access to .map files via server config.',
                category: 'infrastructure',
            });
        }

        // Merge all findings
        findings.push(...infraFindings);
        findings.push(...dbFindings);

        // Calculate score
        let score = 100;
        for (const finding of findings) {
            switch (finding.severity) {
                case 'critical': score -= 30; break;
                case 'high': score -= 20; break;
                case 'medium': score -= 10; break;
                case 'low': score -= 5; break;
            }
        }

        const result: ScanResult = {
            scannerType: 'api_keys',
            score: Math.max(0, Math.min(100, score)),
            findings,
            sourcesScanned: sources.length,
            scannedAt: new Date().toISOString(),
            url,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'api_keys',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                metadata: {},
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            }
        );
    }
});
