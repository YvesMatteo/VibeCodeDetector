import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { resolveAuth, requireScope, requireDomain, logApiKeyUsage } from '@/lib/api-auth';
import { getServiceClient } from '@/lib/api-keys';

const VALID_SCAN_TYPES = ['security', 'api_keys', 'legal', 'threat_intelligence', 'sqli', 'tech_stack', 'cors', 'csrf', 'cookies', 'auth', 'supabase_backend', 'firebase_backend', 'convex_backend', 'dependencies', 'ssl_tls', 'dns_email', 'xss', 'open_redirect', 'scorecard', 'github_security', 'supabase_mgmt', 'vercel_hosting', 'netlify_hosting', 'cloudflare_hosting', 'railway_hosting'] as const;

export async function GET(req: NextRequest) {
    try {
        const { context: auth, error: authError } = await resolveAuth(req);
        if (authError) return authError;
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? req.headers.get('x-real-ip')
            ?? '0.0.0.0';

        const scopeError = requireScope(auth, 'scan:read');
        if (scopeError) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'GET', ip, statusCode: 403 });
            return scopeError;
        }

        const { searchParams } = new URL(req.url);
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
        const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
        const statusFilter = searchParams.get('status');
        const VALID_STATUSES = ['pending', 'running', 'completed', 'failed'];

        const supabase = auth.keyId ? getServiceClient() : await createClient();

        let query = supabase
            .from('scans')
            .select('id, url, status, overall_score, created_at, completed_at', { count: 'exact' })
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
            query = query.eq('status', statusFilter);
        }

        const { data: scans, count, error: queryError } = await query;

        if (queryError) {
            console.error('List scans error:', queryError);
            return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
        }

        logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'GET', ip, statusCode: 200 });

        return NextResponse.json({
            scans: scans || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error('List scans error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // ==========================================
        // CSRF / ORIGIN CHECK (skip for API key auth)
        // ==========================================
        const isApiKeyAuth = req.headers.get('authorization')?.startsWith('Bearer cvd_live_');

        if (!isApiKeyAuth) {
            const origin = req.headers.get('origin');
            const host = req.headers.get('host') || '';
            if (!origin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const originHost = new URL(origin).host;
            const isSameHost = originHost === host;
            const isLocalhost = originHost.startsWith('localhost');
            if (!isSameHost && !isLocalhost) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // ==========================================
        // UNIFIED AUTH (session OR API key) + RATE LIMITING
        // ==========================================
        const { context: auth, error: authError } = await resolveAuth(req);
        if (authError) return authError;
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? req.headers.get('x-real-ip')
            ?? '0.0.0.0';

        // ==========================================
        // SCOPE CHECK (API key must have scan:write)
        // ==========================================
        const scopeError = requireScope(auth, 'scan:write');
        if (scopeError) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'POST', ip, statusCode: 403 });
            return scopeError;
        }

        const body = await req.json();
        const { url, scanTypes, githubRepo, supabasePAT } = body;

        // Backend provider: new format (backendType + backendUrl) or legacy (supabaseUrl)
        const backendType: string = body.backendType || (body.supabaseUrl ? 'supabase' : 'none');
        const convexUrl: string = body.convexUrl || '';
        const backendUrl: string = body.backendUrl || body.supabaseUrl || '';
        const userSupabaseUrl = backendType === 'supabase' ? backendUrl : body.supabaseUrl;

        // ==========================================
        // URL VALIDATION
        // ==========================================
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }
        if (url.length > 2048) {
            return NextResponse.json({ error: 'URL exceeds maximum length' }, { status: 400 });
        }
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(targetUrl);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
        }
        // SSRF protection
        const privatePatterns = [
            /^localhost$/i, /^127\.\d+\.\d+\.\d+$/, /^10\.\d+\.\d+\.\d+$/,
            /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, /^192\.168\.\d+\.\d+$/,
            /^169\.254\.\d+\.\d+$/, /^0\.\d+\.\d+\.\d+$/,
            /^\[?::1\]?$/, /^\[?fe80:/i, /^\[?fc00:/i, /^\[?fd[0-9a-f]{2}:/i,
            /^\d+$/, /^0x/i,
        ];
        if (privatePatterns.some(p => p.test(parsedUrl.hostname))) {
            return NextResponse.json({ error: 'Internal URLs are not allowed' }, { status: 400 });
        }

        // ==========================================
        // API KEY DOMAIN RESTRICTION CHECK
        // ==========================================
        const domain = parsedUrl.hostname;
        const domainError = requireDomain(auth, domain);
        if (domainError) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'POST', ip, statusCode: 403 });
            return domainError;
        }

        // ==========================================
        // SCAN TYPES VALIDATION
        // ==========================================
        if (scanTypes !== undefined) {
            if (!Array.isArray(scanTypes) || !scanTypes.every((t: unknown) => typeof t === 'string' && (VALID_SCAN_TYPES as readonly string[]).includes(t))) {
                return NextResponse.json({ error: 'Invalid scanTypes' }, { status: 400 });
            }
        }

        // ==========================================
        // ATOMIC SCAN USAGE & DOMAIN CHECKS
        // Use service client for API key auth (anon client for session)
        // ==========================================
        const supabase = auth.keyId ? getServiceClient() : await createClient();

        // First, handle domain registration atomically
        const { data: domainResult, error: domRegError } = await supabase
            .rpc('register_scan_domain', { p_user_id: auth.userId, p_domain: domain });

        if (domRegError) {
            console.error('Domain registration error:', domRegError);
            return NextResponse.json({ error: 'Failed to verify domain' }, { status: 500 });
        }

        if (domainResult && domainResult.length > 0 && !domainResult[0].success) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'POST', ip, statusCode: 402 });
            return NextResponse.json({
                error: `Domain limit reached. Your plan allows ${domainResult[0].allowed_domains?.length || 0} domains.`,
                code: 'DOMAIN_LIMIT_REACHED',
            }, { status: 402 });
        }

        // Atomic scan usage increment
        const { data: usageResult, error: usageError } = await supabase
            .rpc('increment_scan_usage', { p_user_id: auth.userId });

        if (usageError) {
            console.error('Usage increment error:', usageError);
            return NextResponse.json({ error: 'Failed to check scan usage' }, { status: 500 });
        }

        if (usageResult && usageResult.length > 0 && !usageResult[0].success) {
            const hasNoPlan = usageResult[0].plan === 'none' || usageResult[0].plan_scans_limit === 0;
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'POST', ip, statusCode: 402 });
            return NextResponse.json({
                error: hasNoPlan
                    ? 'A plan is required to run scans. Subscribe to get started.'
                    : `Monthly scan limit reached (${usageResult[0].plan_scans_used}/${usageResult[0].plan_scans_limit}). Upgrade your plan for more scans.`,
                code: hasNoPlan ? 'PLAN_REQUIRED' : 'SCAN_LIMIT_REACHED',
            }, { status: 402 });
        }

        // ==========================================
        // RUN SCANNERS
        // ==========================================

        const results: Record<string, any> = {};
        const scannerPromises: Promise<void>[] = [];

        const SCANNER_TIMEOUT_MS = 45000; // 45 second timeout per scanner (8 scanners run in parallel)

        function fetchWithTimeout(fetchUrl: string, options: RequestInit): Promise<Response> {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), SCANNER_TIMEOUT_MS);
            return fetch(fetchUrl, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const scannerSecretKey = process.env.SCANNER_SECRET_KEY || '';

        // For API key auth, use anon key for edge function calls (scanner-key handles auth there)
        let accessToken: string | undefined;
        if (!auth.keyId) {
            const sessionClient = await createClient();
            const { data: { user: validatedUser } } = await sessionClient.auth.getUser();
            accessToken = validatedUser ? (await sessionClient.auth.getSession()).data.session?.access_token : undefined;
        }

        // 1. Security Headers Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/security-headers-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.security = data; })
                .catch(err => { results.security = { error: err.message, score: 0 }; })
        );

        // 2. API Key Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/api-key-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.api_keys = data; })
                .catch(err => { results.api_keys = { error: err.message, score: 0 }; })
        );

        // 3. Legal Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/legal-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.legal = data; })
                .catch(err => { results.legal = { error: err.message, score: 0 }; })
        );

        // 4. Threat Intelligence Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/threat-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.threat_intelligence = data; })
                .catch(err => { results.threat_intelligence = { error: err.message, score: 0 }; })
        );

        // 6. SQL Injection Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/sqli-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.sqli = data; })
                .catch(err => { results.sqli = { error: err.message, score: 0 }; })
        );

        // 7. Technology Stack Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/tech-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.tech_stack = data; })
                .catch(err => { results.tech_stack = { error: err.message, score: 0 }; })
        );

        // 8. GitHub Secrets Scanner (Edge Function) — only if repo URL provided
        if (githubRepo && typeof githubRepo === 'string' && githubRepo.trim()) {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/github-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl, githubRepo: githubRepo.trim() }),
                })
                    .then(res => res.json())
                    .then(data => { results.github_secrets = data; })
                    .catch(err => { results.github_secrets = { error: err.message, score: 0 }; })
            );
        }

        // 9. CORS Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/cors-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.cors = data; })
                .catch(err => { results.cors = { error: err.message, score: 0 }; })
        );

        // 10. CSRF Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/csrf-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.csrf = data; })
                .catch(err => { results.csrf = { error: err.message, score: 0 }; })
        );

        // 11. Cookie/Session Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/cookie-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.cookies = data; })
                .catch(err => { results.cookies = { error: err.message, score: 0 }; })
        );

        // 12. Auth Flow Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/auth-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.auth = data; })
                .catch(err => { results.auth = { error: err.message, score: 0 }; })
        );

        // 13. Supabase Backend Scanner (Edge Function) — runs when supabase or auto-detect
        if (backendType === 'supabase' || backendType === 'none') {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/supabase-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({
                        targetUrl,
                        ...(userSupabaseUrl && typeof userSupabaseUrl === 'string' ? { supabaseUrl: userSupabaseUrl.trim() } : {}),
                    }),
                })
                    .then(res => res.json())
                    .then(data => { results.supabase_backend = data; })
                    .catch(err => { results.supabase_backend = { error: err.message, score: 0 }; })
            );
        }

        // 13b. Firebase Backend Scanner (Edge Function) — runs when firebase is selected
        if (backendType === 'firebase') {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/firebase-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.firebase_backend = data; })
                    .catch(err => { results.firebase_backend = { error: err.message, score: 0 }; })
            );
        }

        // 13c. Convex Backend Scanner (Edge Function) — runs when convex is selected
        if (backendType === 'convex') {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/convex-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({
                        targetUrl,
                        ...(convexUrl && typeof convexUrl === 'string' ? { convexUrl: convexUrl.trim() } : {}),
                    }),
                })
                    .then(res => res.json())
                    .then(data => { results.convex_backend = data; })
                    .catch(err => { results.convex_backend = { error: err.message, score: 0 }; })
            );
        }

        // 14. Dependency Vulnerability Scanner (Edge Function) — only if repo URL provided
        if (githubRepo && typeof githubRepo === 'string' && githubRepo.trim()) {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/deps-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl, githubRepo: githubRepo.trim() }),
                })
                    .then(res => res.json())
                    .then(data => { results.dependencies = data; })
                    .catch(err => { results.dependencies = { error: err.message, score: 0 }; })
            );
        }

        // 15. SSL/TLS Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/ssl-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.ssl_tls = data; })
                .catch(err => { results.ssl_tls = { error: err.message, score: 0 }; })
        );

        // 16. DNS & Email Security Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/dns-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.dns_email = data; })
                .catch(err => { results.dns_email = { error: err.message, score: 0 }; })
        );

        // 17. XSS Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/xss-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.xss = data; })
                .catch(err => { results.xss = { error: err.message, score: 0 }; })
        );

        // 18. Open Redirect Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/redirect-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.open_redirect = data; })
                .catch(err => { results.open_redirect = { error: err.message, score: 0 }; })
        );

        // 19. OpenSSF Scorecard Scanner (Edge Function) — only if repo URL provided
        if (githubRepo && typeof githubRepo === 'string' && githubRepo.trim()) {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/scorecard-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl, githubRepo: githubRepo.trim() }),
                })
                    .then(res => res.json())
                    .then(data => { results.scorecard = data; })
                    .catch(err => { results.scorecard = { error: err.message, score: 0 }; })
            );
        }

        // 20. GitHub Native Security Scanner (Edge Function) — only if repo URL provided
        if (githubRepo && typeof githubRepo === 'string' && githubRepo.trim()) {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/github-security-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl, githubRepo: githubRepo.trim() }),
                })
                    .then(res => res.json())
                    .then(data => { results.github_security = data; })
                    .catch(err => { results.github_security = { error: err.message, score: 0 }; })
            );
        }

        // 21. Supabase Management API Scanner (Edge Function) — only if PAT provided
        if (supabasePAT && typeof supabasePAT === 'string' && supabasePAT.startsWith('sbp_') && userSupabaseUrl) {
            scannerPromises.push(
                fetchWithTimeout(`${supabaseUrl}/functions/v1/supabase-mgmt-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                        'x-scanner-key': scannerSecretKey,
                    },
                    body: JSON.stringify({ targetUrl, supabasePAT, supabaseUrl: userSupabaseUrl.trim() }),
                })
                    .then(res => res.json())
                    .then(data => { results.supabase_mgmt = data; })
                    .catch(err => { results.supabase_mgmt = { error: err.message, score: 0 }; })
            );
        }

        // 22. Vercel Hosting Scanner (always runs, auto-detects)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/vercel-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.vercel_hosting = data; })
                .catch(err => { results.vercel_hosting = { error: err.message, score: 0 }; })
        );

        // 23. Netlify Hosting Scanner (always runs, auto-detects)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/netlify-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.netlify_hosting = data; })
                .catch(err => { results.netlify_hosting = { error: err.message, score: 0 }; })
        );

        // 24. Cloudflare Pages Hosting Scanner (always runs, auto-detects)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/cloudflare-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.cloudflare_hosting = data; })
                .catch(err => { results.cloudflare_hosting = { error: err.message, score: 0 }; })
        );

        // 25. Railway Hosting Scanner (always runs, auto-detects)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/railway-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.railway_hosting = data; })
                .catch(err => { results.railway_hosting = { error: err.message, score: 0 }; })
        );

        // Wait for all
        await Promise.all(scannerPromises);

        // Calculate Overall Score using weighted average (weights sum to 1.0)
        const SCANNER_WEIGHTS: Record<string, number> = {
            security: 0.10,       // Security headers — broad impact
            sqli: 0.07,           // SQL injection — critical vulnerability
            xss: 0.07,            // XSS — critical vulnerability
            ssl_tls: 0.06,        // TLS — foundational
            api_keys: 0.06,       // Exposed keys — high impact
            cors: 0.05,           // CORS misconfiguration
            csrf: 0.05,           // CSRF protection
            cookies: 0.05,        // Cookie security
            auth: 0.05,           // Authentication flow
            supabase_backend: 0.05, // Supabase misconfig
            firebase_backend: 0.05, // Firebase misconfig
            convex_backend: 0.05, // Convex misconfig
            supabase_mgmt: 0.05,  // Supabase deep lint
            open_redirect: 0.04,  // Open redirects
            github_secrets: 0.04, // Leaked secrets in repo
            github_security: 0.04, // Dependabot/CodeQL/secret scanning
            dependencies: 0.04,   // Known CVEs in deps
            vercel_hosting: 0.03, // Vercel platform checks
            netlify_hosting: 0.03, // Netlify platform checks
            cloudflare_hosting: 0.03, // Cloudflare Pages checks
            railway_hosting: 0.03, // Railway platform checks
            scorecard: 0.03,      // OpenSSF supply chain score
            dns_email: 0.03,      // SPF/DMARC/DKIM
            threat_intelligence: 0.03, // Threat feeds
            tech_stack: 0.03,     // Tech fingerprint & CVEs
            legal: 0.01,          // Legal compliance
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const [key, result] of Object.entries(results)) {
            if (typeof result !== 'object' || result === null) continue;
            const r = result as Record<string, any>;
            if (r.error || typeof r.score !== 'number') continue;

            const weight = SCANNER_WEIGHTS[key] ?? 0.05;
            weightedSum += r.score * weight;
            totalWeight += weight;
        }

        const overallScore = totalWeight > 0
            ? Math.round(weightedSum / totalWeight)
            : 0;

        let scanId = null;

        // Use service client for insert when using API key auth
        const insertClient = auth.keyId ? getServiceClient() : await createClient();

        const { data: scan, error: insertError } = await insertClient
            .from('scans')
            .insert({
                user_id: auth.userId,
                url: targetUrl,
                status: 'completed',
                overall_score: overallScore,
                results,
                completed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (!insertError && scan) {
            scanId = scan.id;
        } else {
            console.error('Failed to save scan:', insertError);
        }

        // Audit log (fire-and-forget)
        logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: '/api/scan', method: 'POST', ip, statusCode: 200 });

        return NextResponse.json({
            success: true,
            scanId,
            url: targetUrl,
            overallScore,
            results,
            completedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Scan error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
