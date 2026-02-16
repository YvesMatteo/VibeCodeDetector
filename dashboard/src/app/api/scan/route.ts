import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { resolveAuth, requireScope, requireDomain, logApiKeyUsage } from '@/lib/api-auth';
import { getServiceClient } from '@/lib/api-keys';
import { validateTargetUrl, isPrivateHostname } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';

const VALID_SCAN_TYPES = ['security', 'api_keys', 'legal', 'threat_intelligence', 'sqli', 'tech_stack', 'cors', 'csrf', 'cookies', 'auth', 'supabase_backend', 'firebase_backend', 'convex_backend', 'dependencies', 'ssl_tls', 'dns_email', 'xss', 'open_redirect', 'scorecard', 'github_security', 'supabase_mgmt', 'vercel_hosting', 'netlify_hosting', 'cloudflare_hosting', 'railway_hosting', 'ddos_protection', 'file_upload', 'audit_logging', 'mobile_api'] as const;

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
        const projectIdFilter = searchParams.get('projectId');
        const VALID_STATUSES = ['pending', 'running', 'completed', 'failed'];

        const supabase = auth.keyId ? getServiceClient() : await createClient();

        let query = supabase
            .from('scans')
            .select('id, url, status, overall_score, created_at, completed_at, results, project_id', { count: 'exact' })
            .eq('user_id', auth.userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
            query = query.eq('status', statusFilter);
        }

        if (projectIdFilter) {
            query = query.eq('project_id', projectIdFilter);
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
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

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
        let { url, scanTypes, githubRepo, supabasePAT } = body;
        const projectId: string | undefined = body.projectId;

        // If projectId is provided, fetch project and use its config
        let resolvedProjectId: string | undefined;
        if (projectId) {
            const projectClient = auth.keyId ? getServiceClient() : await createClient();
            const { data: project, error: projectError } = await projectClient
                .from('projects' as any)
                .select('*')
                .eq('id', projectId)
                .eq('user_id', auth.userId)
                .single();

            if (projectError || !project) {
                return NextResponse.json({ error: 'Project not found' }, { status: 404 });
            }

            // Use project config
            url = (project as any).url;
            githubRepo = (project as any).github_repo || githubRepo;
            supabasePAT = (project as any).supabase_pat || supabasePAT;
            body.backendType = (project as any).backend_type || body.backendType;
            body.backendUrl = (project as any).backend_url || body.backendUrl;
            if ((project as any).backend_type === 'convex' && (project as any).backend_url) {
                body.convexUrl = (project as any).backend_url;
            }
            resolvedProjectId = projectId;
        }

        // Backend provider: new format (backendType + backendUrl) or legacy (supabaseUrl)
        const backendType: string = body.backendType || (body.supabaseUrl ? 'supabase' : 'none');
        const convexUrl: string = body.convexUrl || '';
        const backendUrl: string = body.backendUrl || body.supabaseUrl || '';
        const userSupabaseUrl = backendType === 'supabase' ? backendUrl : body.supabaseUrl;

        // ==========================================
        // URL VALIDATION + SSRF PROTECTION
        // ==========================================
        const urlValidation = validateTargetUrl(url);
        if (!urlValidation.valid) {
            return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }
        const targetUrl = urlValidation.parsed.href;
        const parsedUrl = urlValidation.parsed;

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

        // Domain registration (skip when running via project — project creation enforced limit)
        if (!resolvedProjectId) {
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
        }

        // Atomic scan usage increment
        const { data: usageResult, error: usageError } = await supabase
            .rpc('increment_scan_usage', { p_user_id: auth.userId });

        if (usageError) {
            console.error('Usage increment error:', usageError);
            return NextResponse.json({ error: 'Failed to check scan usage' }, { status: 500 });
        }

        if (usageResult && usageResult.length > 0 && !usageResult[0].success) {
            const hasNoPlan = usageResult[0].plan_scans_limit === 0;
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
        } else {
            results.github_secrets = { skipped: true, reason: 'GitHub repository not linked', missingConfig: 'githubRepo' };
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
        } else {
            results.supabase_backend = { skipped: true, reason: 'Backend type is not Supabase', missingConfig: 'backendType' };
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
        } else {
            results.firebase_backend = { skipped: true, reason: 'Backend type is not Firebase', missingConfig: 'backendType' };
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
        } else {
            results.convex_backend = { skipped: true, reason: 'Backend type is not Convex', missingConfig: 'backendType' };
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
        } else {
            results.dependencies = { skipped: true, reason: 'GitHub repository not linked', missingConfig: 'githubRepo' };
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
        } else {
            results.scorecard = { skipped: true, reason: 'GitHub repository not linked', missingConfig: 'githubRepo' };
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
        } else {
            results.github_security = { skipped: true, reason: 'GitHub repository not linked', missingConfig: 'githubRepo' };
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
        } else if (backendType === 'supabase' || userSupabaseUrl) {
            results.supabase_mgmt = { skipped: true, reason: 'Supabase PAT not provided', missingConfig: 'supabasePAT' };
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

        // 26. DDoS Protection Scanner (always runs)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/ddos-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.ddos_protection = data; })
                .catch(err => { results.ddos_protection = { error: err.message, score: 0 }; })
        );

        // 28. File Upload Security Scanner (always runs)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/upload-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.file_upload = data; })
                .catch(err => { results.file_upload = { error: err.message, score: 0 }; })
        );

        // 29. Audit Logging & Monitoring Scanner (always runs)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/audit-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.audit_logging = data; })
                .catch(err => { results.audit_logging = { error: err.message, score: 0 }; })
        );

        // 30. Mobile API Rate Limiting Scanner (always runs)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/mobile-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.mobile_api = data; })
                .catch(err => { results.mobile_api = { error: err.message, score: 0 }; })
        );

        // Wait for all
        await Promise.all(scannerPromises);

        // Calculate Overall Score using weighted average (weights sum to 1.0)
        const SCANNER_WEIGHTS: Record<string, number> = {
            security: 0.08,       // Security headers — broad impact
            sqli: 0.07,           // SQL injection — critical vulnerability
            xss: 0.07,            // XSS — critical vulnerability
            ssl_tls: 0.06,        // TLS — foundational
            api_keys: 0.06,       // Exposed keys — high impact
            cors: 0.04,           // CORS misconfiguration
            csrf: 0.04,           // CSRF protection
            cookies: 0.04,        // Cookie security
            auth: 0.04,           // Authentication flow
            supabase_backend: 0.04, // Supabase misconfig
            firebase_backend: 0.04, // Firebase misconfig
            convex_backend: 0.04, // Convex misconfig
            supabase_mgmt: 0.04,  // Supabase deep lint
            open_redirect: 0.03,  // Open redirects
            github_secrets: 0.03, // Leaked secrets in repo
            github_security: 0.03, // Dependabot/CodeQL/secret scanning
            dependencies: 0.03,   // Known CVEs in deps
            dns_email: 0.03,      // SPF/DMARC/DKIM
            threat_intelligence: 0.03, // Threat feeds
            tech_stack: 0.03,     // Tech fingerprint & CVEs
            vercel_hosting: 0.02, // Vercel platform checks
            netlify_hosting: 0.02, // Netlify platform checks
            cloudflare_hosting: 0.02, // Cloudflare Pages checks
            railway_hosting: 0.02, // Railway platform checks
            scorecard: 0.02,      // OpenSSF supply chain score
            legal: 0.01,          // Legal compliance
            ddos_protection: 0.04, // DDoS/WAF protection
            file_upload: 0.03,    // File upload security
            audit_logging: 0.02,  // Monitoring & audit readiness
            mobile_api: 0.03,     // Mobile API rate limiting
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
                ...(resolvedProjectId ? { project_id: resolvedProjectId } : {}),
            })
            .select()
            .single();

        if (!insertError && scan) {
            scanId = scan.id;
        } else {
            console.error('Failed to save scan:', insertError);
        }

        // Update project favicon (fire-and-forget)
        if (resolvedProjectId) {
            (async () => {
                try {
                    const faviconUrl = await fetchFaviconUrl(targetUrl);
                    if (faviconUrl) {
                        const svc = getServiceClient();
                        await svc.from('projects' as any).update({ favicon_url: faviconUrl }).eq('id', resolvedProjectId);
                    }
                } catch {
                    // Non-critical, ignore
                }
            })();
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

/**
 * Fetch the favicon URL from a website by parsing its HTML for <link rel="icon"> tags.
 * Returns an absolute URL or null if not found.
 * Includes SSRF protection on the resolved favicon href to prevent internal network probing.
 */
async function fetchFaviconUrl(siteUrl: string): Promise<string | null> {
    try {
        const res = await fetch(siteUrl, {
            headers: { 'User-Agent': 'CheckVibe/1.0' },
            redirect: 'follow',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;

        const html = await res.text();
        // Match <link rel="icon" href="..."> or <link rel="shortcut icon" href="...">
        const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
            || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

        if (!match?.[1]) return null;

        const href = match[1];
        // Resolve relative URLs to absolute
        let absoluteUrl: string;
        if (href.startsWith('http')) {
            absoluteUrl = href;
        } else if (href.startsWith('//')) {
            absoluteUrl = `https:${href}`;
        } else {
            const base = new URL(siteUrl);
            absoluteUrl = href.startsWith('/') ? `${base.origin}${href}` : `${base.origin}/${href}`;
        }

        // SSRF check: block favicon URLs pointing to internal/private networks
        try {
            const faviconParsed = new URL(absoluteUrl);
            if (!['http:', 'https:'].includes(faviconParsed.protocol)) return null;
            if (isPrivateHostname(faviconParsed.hostname)) return null;
        } catch {
            return null;
        }

        return absoluteUrl;
    } catch {
        return null;
    }
}
