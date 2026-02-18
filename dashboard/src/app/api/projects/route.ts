import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateTargetUrl, isPrivateHostname } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch projects with latest scan info
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('List projects error:', error);
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        // Batch-fetch latest scan for all projects in ONE query (fixes N+1)
        const projectIds = (projects || []).map((p) => p.id);
        const latestScansMap: Record<string, any> = {};

        if (projectIds.length > 0) {
            const { data: recentScans } = await supabase
                .from('scans')
                .select('project_id, id, overall_score, completed_at, results')
                .in('project_id', projectIds)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false });

            for (const scan of (recentScans || [])) {
                if (scan.project_id && !latestScansMap[scan.project_id]) {
                    latestScansMap[scan.project_id] = scan;
                }
            }
        }

        const projectsWithScans = (projects || []).map((project) => {
            const latestScan = latestScansMap[project.id] ?? null;
            let issueCount = 0;
            if (latestScan?.results) {
                const results = latestScan.results as Record<string, any>;
                Object.values(results).forEach((r: any) => {
                    if (r.findings && Array.isArray(r.findings)) {
                        r.findings.forEach((f: any) => {
                            if (f.severity?.toLowerCase() !== 'info') issueCount++;
                        });
                    }
                });
            }
            return {
                ...project,
                // Decrypt supabase_pat for client display (handles legacy plaintext gracefully)
                supabase_pat: project.supabase_pat ? decrypt(project.supabase_pat) : null,
                latestScore: latestScan?.overall_score ?? null,
                lastAuditDate: latestScan?.completed_at ?? null,
                issueCount,
            };
        });

        return NextResponse.json({ projects: projectsWithScans });
    } catch (error) {
        console.error('List projects error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // CSRF protection
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 10 project creations per minute per user
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? req.headers.get('x-real-ip')
            ?? '0.0.0.0';
        const rl = await checkRateLimit(`project-create:${user.id}`, 10, 60);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
        }

        const body = await req.json();
        const { name, url, githubRepo, backendType, backendUrl, supabasePAT } = body;

        // Validate required fields
        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }
        if (name.trim().length > 100) {
            return NextResponse.json({ error: 'Project name must be 100 characters or less' }, { status: 400 });
        }

        // URL validation + SSRF protection (shared utility)
        const urlValidation = validateTargetUrl(url);
        if (!urlValidation.valid) {
            return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }
        const targetUrl = urlValidation.parsed.href;

        // SSRF validation for backendUrl
        if (backendUrl && typeof backendUrl === 'string' && backendUrl.trim()) {
            const backendValidation = validateTargetUrl(backendUrl);
            if (!backendValidation.valid) {
                return NextResponse.json({ error: `Backend URL: ${backendValidation.error}` }, { status: 400 });
            }
        }

        // Check project limit
        const { data: limitResult, error: limitError } = await supabase
            .rpc('check_project_limit', { p_user_id: user.id });

        if (limitError) {
            console.error('Project limit check error:', limitError);
            return NextResponse.json({ error: 'Failed to check project limit' }, { status: 500 });
        }

        const limit = Array.isArray(limitResult) ? limitResult[0] : limitResult;
        if (!limit?.allowed) {
            // Free users get 1 project
            const isFreeUser = limit?.project_limit === 0;
            const freeProjectAllowance = 1;
            if (isFreeUser && (limit?.current_count ?? 0) < freeProjectAllowance) {
                // Allow — free user hasn't used their 1 free project yet
            } else {
                return NextResponse.json({
                    error: isFreeUser
                        ? `Free plan allows ${freeProjectAllowance} project. Subscribe to add more.`
                        : `Project limit reached (${limit?.current_count}/${limit?.project_limit}). Upgrade your plan for more projects.`,
                    code: isFreeUser ? 'FREE_PROJECT_LIMIT' : 'PROJECT_LIMIT_REACHED',
                }, { status: 402 });
            }
        }

        // Encrypt supabase_pat before storing (AES-256-GCM)
        const rawPAT = supabasePAT?.trim() || null;
        const encryptedPAT = rawPAT ? encrypt(rawPAT) : null;

        // Insert project
        const { data: project, error: insertError } = await supabase
            .from('projects')
            .insert({
                user_id: user.id,
                name: name.trim(),
                url: targetUrl,
                github_repo: githubRepo?.trim() || null,
                backend_type: ['supabase', 'firebase', 'convex', 'none'].includes(backendType) ? backendType : 'none',
                backend_url: backendUrl?.trim() || null,
                supabase_pat: encryptedPAT,
            })
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return NextResponse.json({ error: 'A project with this URL already exists' }, { status: 409 });
            }
            console.error('Create project error:', insertError);
            return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
        }

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error('Create project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
