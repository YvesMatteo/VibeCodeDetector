import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { computeNextRun, resolveAppUrl } from '@/lib/schedule-utils';

/**
 * Cron endpoint for executing scheduled scans.
 * Called by Vercel Cron Jobs daily (configurable in vercel.json).
 *
 * Flow:
 * 1. Authenticate via CRON_SECRET Bearer token
 * 2. Query scheduled_scans where next_run_at <= now() AND enabled = true
 * 3. For each due schedule, fetch the project config and trigger the scan
 * 4. Update last_run_at and compute next_run_at
 */

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

export const maxDuration = 300; // 5 min max for Vercel Pro

interface ScheduledScanProject {
    id: string;
    url: string;
    github_repo: string | null;
    backend_type: string | null;
    backend_url: string | null;
    supabase_pat: string | null;
    user_id: string;
}

interface ScheduledScanRow {
    id: string;
    project_id: string;
    frequency: string;
    hour_utc: number;
    day_of_week: number | null;
    enabled: boolean;
    projects: ScheduledScanProject;
}

// Note: Using GET because Vercel Cron only supports GET requests.
// The Bearer token check prevents accidental triggering by prefetchers/crawlers.
export async function GET(req: NextRequest) {
    // Verify cron secret — must be a non-empty string
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || cronSecret.length < 16) {
        console.error('CRON_SECRET is not configured or too short');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const now = new Date().toISOString();

    // Find all due scheduled scans
    const { data: dueSchedules, error: queryError } = await supabase
        .from('scheduled_scans' as never)
        .select('*, projects!inner(id, url, github_repo, backend_type, backend_url, supabase_pat, user_id)')
        .eq('enabled', true)
        .lte('next_run_at', now)
        .limit(10) as { data: ScheduledScanRow[] | null; error: unknown }; // Process up to 10 per invocation to stay within time limits

    if (queryError) {
        console.error('Failed to query scheduled scans:', queryError);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
        return NextResponse.json({ message: 'No scheduled scans due', processed: 0 });
    }

    const results: { projectId: string; status: string; scanId?: string; error?: string }[] = [];

    for (const schedule of dueSchedules) {
        const project = schedule.projects;
        if (!project) {
            results.push({ projectId: schedule.project_id, status: 'skipped', error: 'Project not found' });
            continue;
        }

        try {
            // Check scan usage before triggering
            const { data: usageResult } = await supabase
                .rpc('increment_scan_usage', { p_user_id: project.user_id });

            if (usageResult?.[0] && !usageResult[0].success) {
                results.push({ projectId: project.id, status: 'skipped', error: 'Scan limit reached' });
                // Still update next_run_at so we don't keep retrying
                await updateSchedule(supabase, schedule);
                continue;
            }

            // Build the scan request body
            const scanBody: Record<string, string | boolean> = {
                url: project.url,
                projectId: project.id,
                backendType: project.backend_type || 'none',
                backendUrl: project.backend_url || '',
                isScheduled: true,
            };

            if (project.github_repo) {
                scanBody.githubRepo = project.github_repo;
            }

            if (project.supabase_pat) {
                // decrypt() handles legacy plaintext values gracefully (returns as-is if no "enc:" prefix)
                scanBody.supabasePAT = decrypt(project.supabase_pat);
            }

            const appUrl = resolveAppUrl();

            // Trigger scan via internal fetch — the cron secret authenticates
            // the request. The user is resolved from projectId in api-auth.ts,
            // NOT from a user-supplied header (prevents impersonation).
            const scanRes = await fetch(`${appUrl}/api/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': cronSecret,
                },
                body: JSON.stringify(scanBody),
            });

            if (scanRes.ok) {
                // Read the NDJSON stream for the scanId
                const text = await scanRes.text();
                const firstLine = text.split('\n')[0];
                try {
                    const parsed = JSON.parse(firstLine) as { scanId?: string };
                    results.push({ projectId: project.id, status: 'triggered', scanId: parsed.scanId });
                } catch {
                    results.push({ projectId: project.id, status: 'triggered' });
                }
            } else {
                const errText = await scanRes.text().catch(() => 'Unknown error');
                results.push({ projectId: project.id, status: 'failed', error: errText.slice(0, 200) });
            }

            // Update schedule timing
            await updateSchedule(supabase, schedule);

        } catch (err: unknown) {
            console.error(`Scheduled scan failed for project ${project.id}:`, err);
            const msg = err instanceof Error ? err.message?.slice(0, 200) : 'Unknown error';
            results.push({ projectId: project.id, status: 'error', error: msg });
            // Still advance the schedule
            await updateSchedule(supabase, schedule);
        }
    }

    return NextResponse.json({
        message: `Processed ${results.length} scheduled scans`,
        processed: results.length,
        results,
    });
}

async function updateSchedule(supabase: ReturnType<typeof getServiceClient>, schedule: ScheduledScanRow) {
    const nextRunAt = computeNextRun(
        schedule.frequency,
        schedule.hour_utc,
        schedule.day_of_week,
    );

    await supabase
        .from('scheduled_scans' as never)
        .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt,
            updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);
}
