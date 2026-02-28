import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLAN_CONFIG, FREE_PLAN_CONFIG } from '@/lib/plan-config';

// GET /api/threats/stats?projectId=xxx&hours=24
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threats-stats:${user.id}`, 30, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    // Plan gating: threat detection requires a paid plan
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

    const planKey = (profile?.plan || 'none') as string;
    const planConfig = planKey in PLAN_CONFIG
        ? PLAN_CONFIG[planKey as keyof typeof PLAN_CONFIG]
        : FREE_PLAN_CONFIG;

    if (!planConfig.threatDetection) {
        return NextResponse.json(
            { error: 'Threat detection requires a paid plan. Please upgrade.' },
            { status: 403 }
        );
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const hours = Math.min(720, Math.max(1, parseInt(req.nextUrl.searchParams.get('hours') || '24', 10)));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get aggregated stats via RPC
    const { data: stats, error: statsError } = await supabase
        .rpc('get_threat_stats' as any, { p_project_id: projectId, p_since: since });

    if (statsError) {
        console.error('Threat stats RPC error:', statsError);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Get hourly time-series for chart
    const { data: timeSeries, error: tsError } = await supabase
        .from('threat_events' as any)
        .select('created_at, severity')
        .eq('project_id', projectId)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

    // Build hourly buckets
    const buckets: Record<string, { hour: string; critical: number; high: number; medium: number; low: number; total: number }> = {};

    if (timeSeries && !tsError) {
        for (const evt of timeSeries) {
            const date = new Date((evt as any).created_at);
            const hourKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:00`;

            if (!buckets[hourKey]) {
                buckets[hourKey] = { hour: hourKey, critical: 0, high: 0, medium: 0, low: 0, total: 0 };
            }

            const sev = (evt as any).severity as string;
            if (sev === 'critical') buckets[hourKey].critical++;
            else if (sev === 'high') buckets[hourKey].high++;
            else if (sev === 'medium') buckets[hourKey].medium++;
            else buckets[hourKey].low++;
            buckets[hourKey].total++;
        }
    }

    // Get top source IPs via RPC (aggregated in Postgres, not client-side)
    const { data: topIpsRaw } = await supabase.rpc('get_threat_top_ips' as any, {
        p_project_id: projectId,
        p_since: since,
        p_limit: 10
    });

    const topIps = Array.isArray(topIpsRaw)
        ? topIpsRaw.map((row: any) => ({ ip: row.source_ip, count: Number(row.event_count) }))
        : [];

    return NextResponse.json({
        stats: stats || { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        timeSeries: Object.values(buckets),
        topIps,
        hours,
    });
}
