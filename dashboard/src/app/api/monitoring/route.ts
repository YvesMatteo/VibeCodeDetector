import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function computeNextRun(frequency: string, hourUtc: number, dayOfWeek?: number): string {
    const now = new Date();
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(hourUtc);

    if (frequency === 'daily') {
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    } else if (frequency === 'weekly') {
        const dow = dayOfWeek ?? 1; // default Monday
        const currentDow = next.getUTCDay();
        let daysUntil = dow - currentDow;
        if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
        next.setUTCDate(next.getUTCDate() + daysUntil);
    } else if (frequency === 'monthly') {
        next.setUTCDate(1);
        if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
    }

    return next.toISOString();
}

// GET /api/monitoring?projectId=xxx — get schedule + alerts for a project
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const [scheduleRes, alertsRes] = await Promise.all([
        supabase.from('scheduled_scans' as any).select('*').eq('project_id', projectId).eq('user_id', user.id).maybeSingle(),
        supabase.from('alert_rules' as any).select('*').eq('project_id', projectId).eq('user_id', user.id),
    ]);

    return NextResponse.json({
        schedule: scheduleRes.data,
        alerts: alertsRes.data || [],
    });
}

// POST /api/monitoring — create/update schedule or alert
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        const { data, error } = await supabase
            .from('scheduled_scans' as any)
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
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    }

    if (type === 'alert') {
        const { alertType, threshold, notifyEmail, enabled } = body;
        if (!['score_drop', 'new_critical', 'score_below'].includes(alertType)) {
            return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('alert_rules' as any)
            .upsert({
                project_id: projectId,
                user_id: user.id,
                type: alertType,
                threshold: threshold ?? null,
                notify_email: notifyEmail || user.email,
                enabled: enabled !== false,
            }, { onConflict: 'project_id,type' })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// DELETE /api/monitoring?id=xxx&type=schedule|alert
export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    const type = req.nextUrl.searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 });

    const table = type === 'schedule' ? 'scheduled_scans' : 'alert_rules';

    const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
