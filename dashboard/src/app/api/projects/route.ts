import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateTargetUrl } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';
import { encrypt } from '@/lib/encryption';
import { PLAN_FREQUENCY_MAP } from '@/lib/plan-config';
import { computeNextRun, resolveAppUrl } from '@/lib/schedule-utils';
import { countIssuesBySeverity } from '@/lib/scan-utils';

interface LatestScanEntry {
    id: string;
    project_id: string | null;
    overall_score: number | null;
    completed_at: string | null;
    _issueCount?: number;
}

interface ScheduleEntry {
    project_id: string;
    frequency: string;
    enabled: boolean;
    next_run_at: string | null;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 30 project list reads per minute per user
        const rlList = await checkRateLimit(`projects-list:${user.id}`, 30, 60);
        if (!rlList.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
        const latestScansMap: Record<string, LatestScanEntry> = {};
        const scheduleMap: Record<string, ScheduleEntry> = {};

        if (projectIds.length > 0) {
            // Step 1: Fetch latest scan metadata per project (no results blob)
            const { data: recentScans } = await supabase
                .from('scans')
                .select('project_id, id, overall_score, completed_at')
                .in('project_id', projectIds)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false });

            for (const scan of (recentScans || [])) {
                if (scan.project_id && !latestScansMap[scan.project_id]) {
                    latestScansMap[scan.project_id] = scan as LatestScanEntry;
                }
            }

            // Step 2: Fetch results ONLY for the latest scan per project (for issue counts)
            const latestScanIds = Object.values(latestScansMap).map((s) => s.id);
            const issueCountsMap: Record<string, number> = {};
            if (latestScanIds.length > 0) {
                const { data: scansWithResults } = await supabase
                    .from('scans')
                    .select('id, results')
                    .in('id', latestScanIds);

                for (const scan of (scansWithResults || [])) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- countIssuesBySeverity requires Record<string, any>
                    const counts = countIssuesBySeverity(scan.results as Record<string, any>);
                    issueCountsMap[scan.id] = counts.total;
                }
            }

            // Attach issue counts to the latestScansMap entries
            for (const scan of Object.values(latestScansMap)) {
                scan._issueCount = issueCountsMap[scan.id] ?? 0;
            }

            // Fetch scheduled scans for monitoring badges
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_scans not in generated types
            const { data: schedules } = await (supabase as any)
                .from('scheduled_scans')
                .select('project_id, frequency, enabled, next_run_at')
                .in('project_id', projectIds);

            for (const s of (schedules || []) as ScheduleEntry[]) {
                if (s.project_id) scheduleMap[s.project_id] = s;
            }
        }

        const projectsWithScans = (projects || []).map((project) => {
            const latestScan = latestScansMap[project.id] ?? null;
            const issueCount = latestScan?._issueCount ?? 0;
            const schedule = scheduleMap[project.id] ?? null;
            return {
                ...project,
                // Never send decrypted PAT to the client — only expose a boolean flag
                supabase_pat: undefined,
                has_supabase_pat: !!project.supabase_pat,
                latestScore: latestScan?.overall_score ?? null,
                lastAuditDate: latestScan?.completed_at ?? null,
                issueCount,
                monitoringFrequency: schedule?.enabled ? schedule.frequency : null,
                nextCheckAt: schedule?.enabled ? schedule.next_run_at : null,
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

        // Auto-enable monitoring: scheduled scan + default alerts + first scan
        try {
            const svc = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
            );

            // Fetch user's plan for default frequency
            const { data: profile } = await svc
                .from('profiles')
                .select('plan')
                .eq('id', user.id)
                .single();

            const plan = profile?.plan || 'none';
            const frequency = PLAN_FREQUENCY_MAP[plan] || 'weekly';
            const nextRunAt = computeNextRun(frequency, 6);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_scans & alert_rules not in generated types
            const svcUnchecked = svc as any;

            // Insert scheduled scan + 2 default alert rules (fire-and-forget)
            await Promise.allSettled([
                svcUnchecked.from('scheduled_scans').insert({
                    project_id: project.id,
                    user_id: user.id,
                    frequency,
                    hour_utc: 6,
                    enabled: true,
                    next_run_at: nextRunAt,
                }),
                svcUnchecked.from('alert_rules').insert([
                    {
                        project_id: project.id,
                        user_id: user.id,
                        type: 'score_drop',
                        threshold: 10,
                        notify_email: user.email,
                        enabled: true,
                    },
                    {
                        project_id: project.id,
                        user_id: user.id,
                        type: 'new_critical',
                        threshold: null,
                        notify_email: user.email,
                        enabled: true,
                    },
                ]),
            ]);

            // Trigger first scan (fire-and-forget)
            const appUrl = resolveAppUrl();
            fetch(`${appUrl}/api/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': process.env.CRON_SECRET || '',
                },
                body: JSON.stringify({ projectId: project.id }),
            }).catch(() => { /* non-critical */ });
        } catch {
            // Non-critical — project was still created successfully
        }

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error('Create project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
