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
        .from('scheduled_scans')
        .select('*, projects!inner(id, url, github_repo, backend_type, backend_url, supabase_pat, user_id)')
        .eq('enabled', true)
        .lte('next_run_at', now)
        .limit(10); // Process up to 10 per invocation to stay within time limits

    if (queryError) {
        console.error('Failed to query scheduled scans:', queryError);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!dueSchedules || dueSchedules.length === 0) {
        return NextResponse.json({ message: 'No scheduled scans due', processed: 0 });
    }

    const results: { projectId: string; status: string; scanId?: string; error?: string }[] = [];

    for (const schedule of dueSchedules) {
        const project = (schedule as any).projects;
        if (!project) {
            results.push({ projectId: schedule.project_id, status: 'skipped', error: 'Project not found' });
            continue;
        }

        try {
            // Check scan usage before triggering
            const { data: usageResult } = await supabase
                .rpc('increment_scan_usage', { p_user_id: project.user_id });

            if (usageResult?.[0] && !usageResult[0].success && usageResult[0].plan_scans_limit > 0) {
                results.push({ projectId: project.id, status: 'skipped', error: 'Scan limit reached' });
                // Still update next_run_at so we don't keep retrying
                await updateSchedule(supabase, schedule);
                continue;
            }

            // Build the scan request body
            const scanBody: Record<string, any> = {
                url: project.url,
                projectId: project.id,
                backendType: project.backend_type || 'none',
                backendUrl: project.backend_url || '',
            };

            if (project.github_repo) {
                scanBody.githubRepo = project.github_repo;
            }

            if (project.supabase_pat) {
                try {
                    scanBody.supabasePAT = decrypt(project.supabase_pat);
                } catch {
                    scanBody.supabasePAT = project.supabase_pat;
                }
            }

            // Trigger scan via internal fetch to our own /api/scan endpoint
            const appUrl = resolveAppUrl();

            const scanRes = await fetch(`${appUrl}/api/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Use the cron secret as an internal service auth
                    'x-cron-secret': cronSecret,
                    'x-cron-user-id': project.user_id,
                },
                body: JSON.stringify(scanBody),
            });

            if (scanRes.ok) {
                // Read the NDJSON stream for the scanId
                const text = await scanRes.text();
                const firstLine = text.split('\n')[0];
                try {
                    const parsed = JSON.parse(firstLine);
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

        } catch (err: any) {
            console.error(`Scheduled scan failed for project ${project.id}:`, err);
            results.push({ projectId: project.id, status: 'error', error: err.message?.slice(0, 200) });
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

async function updateSchedule(supabase: ReturnType<typeof getServiceClient>, schedule: any) {
    const nextRunAt = computeNextRun(
        schedule.frequency,
        schedule.hour_utc,
        schedule.day_of_week,
    );

    await supabase
        .from('scheduled_scans')
        .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt,
            updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id);
}
