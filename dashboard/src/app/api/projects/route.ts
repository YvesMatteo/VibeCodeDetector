import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateTargetUrl, isPrivateHostname } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch projects with latest scan info
        const { data: projects, error } = await supabase
            .from('projects' as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('List projects error:', error);
            return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
        }

        // For each project, get the latest scan
        const projectsWithScans = await Promise.all(
            (projects || []).map(async (project: any) => {
                const { data: latestScan } = await supabase
                    .from('scans')
                    .select('id, overall_score, completed_at, results')
                    .eq('project_id', project.id)
                    .eq('status', 'completed')
                    .order('completed_at', { ascending: false })
                    .limit(1)
                    .single();

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
                    latestScore: latestScan?.overall_score ?? null,
                    lastAuditDate: latestScan?.completed_at ?? null,
                    issueCount,
                };
            })
        );

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

        const limit = (limitResult as any)?.[0] || limitResult;
        if (!limit?.allowed) {
            return NextResponse.json({
                error: limit?.project_limit === 0
                    ? 'A plan is required to create projects. Subscribe to get started.'
                    : `Project limit reached (${limit?.current_count}/${limit?.project_limit}). Upgrade your plan for more projects.`,
                code: limit?.project_limit === 0 ? 'PLAN_REQUIRED' : 'PROJECT_LIMIT_REACHED',
            }, { status: 402 });
        }

        // Insert project
        const { data: project, error: insertError } = await supabase
            .from('projects' as any)
            .insert({
                user_id: user.id,
                name: name.trim(),
                url: targetUrl,
                github_repo: githubRepo?.trim() || null,
                backend_type: backendType || 'none',
                backend_url: backendUrl?.trim() || null,
                supabase_pat: supabasePAT?.trim() || null,
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
