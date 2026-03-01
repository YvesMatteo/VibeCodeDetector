import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeNextRun } from '@/lib/schedule-utils';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/monitoring?projectId=xxx — get schedule + alerts for a project
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 30 monitoring reads per minute per user
    const rlGet = await checkRateLimit(`monitoring-get:${user.id}`, 30, 60);
    if (!rlGet.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // scheduled_scans and alert_rules are not in generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom tables not in generated types
    const sbUntyped = supabase as any;
    const [scheduleRes, alertsRes] = await Promise.all([
        sbUntyped.from('scheduled_scans').select('*').eq('project_id', projectId).eq('user_id', user.id).maybeSingle() as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>,
        sbUntyped.from('alert_rules').select('*').eq('project_id', projectId).eq('user_id', user.id) as Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
    ]);

    return NextResponse.json({
        schedule: scheduleRes.data,
        alerts: alertsRes.data || [],
    });
}

// POST /api/monitoring — create/update schedule or alert
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 monitoring writes per minute per user
    const rl = await checkRateLimit(`monitoring:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { projectId, type } = body;

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    if (type === 'schedule') {
        const { frequency, hourUtc, dayOfWeek, enabled } = body;
        if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
            return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
        }

        const nextRunAt = enabled !== false ? computeNextRun(frequency, hourUtc ?? 6, dayOfWeek) : null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scheduled_scans not in generated types
        const sbUntypedSchedule = supabase as any;
        const { data, error } = await sbUntypedSchedule
            .from('scheduled_scans')
            .upsert({
                project_id: projectId,
                user_id: user.id,
                frequency,
                hour_utc: hourUtc ?? 6,
                day_of_week: dayOfWeek ?? null,
                enabled: enabled !== false,
                next_run_at: nextRunAt,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'project_id' })
            .select()
            .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

        if (error) {
            console.error('Monitoring schedule upsert error:', error);
            return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
        }
        return NextResponse.json(data);
    }

    if (type === 'alert') {
        const { alertType, threshold, notifyEmail, enabled } = body;
        if (!['score_drop', 'new_critical', 'score_below'].includes(alertType)) {
            return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
        }

        // Validate threshold range for types that use it
        if (threshold != null && (typeof threshold !== 'number' || threshold < 1 || threshold > 100)) {
            return NextResponse.json({ error: 'Threshold must be between 1 and 100' }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- alert_rules not in generated types
        const sbUntypedAlert = supabase as any;
        const { data, error } = await sbUntypedAlert
            .from('alert_rules')
            .upsert({
                project_id: projectId,
                user_id: user.id,
                type: alertType,
                threshold: threshold ?? null,
                notify_email: notifyEmail || user.email,
                enabled: enabled !== false,
            }, { onConflict: 'project_id,type' })
            .select()
            .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

        if (error) {
            console.error('Monitoring alert upsert error:', error);
            return NextResponse.json({ error: 'Failed to save alert rule' }, { status: 500 });
        }
        return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// DELETE /api/monitoring?id=xxx&type=schedule|alert
export async function DELETE(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 monitoring deletes per minute per user
    const rl2 = await checkRateLimit(`monitoring-del:${user.id}`, 10, 60);
    if (!rl2.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const type = req.nextUrl.searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 });

    if (type !== 'schedule' && type !== 'alert') {
        return NextResponse.json({ error: 'type must be "schedule" or "alert"' }, { status: 400 });
    }

    const table = type === 'schedule' ? 'scheduled_scans' : 'alert_rules';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom tables not in generated types
    const sbUntypedDel = supabase as any;
    const { error } = await sbUntypedDel
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id) as { error: { message: string } | null };

    if (error) {
        console.error('Monitoring delete error:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
