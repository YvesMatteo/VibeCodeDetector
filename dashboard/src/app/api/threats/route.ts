import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLAN_CONFIG, FREE_PLAN_CONFIG } from '@/lib/plan-config';

const PAGE_SIZE = 50;

// GET /api/threats?projectId=xxx&page=1&type=xss&severity=critical&from=2026-01-01&to=2026-02-28
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threats-list:${user.id}`, 30, 60);
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

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10));
    const eventType = req.nextUrl.searchParams.get('type');
    const severity = req.nextUrl.searchParams.get('severity');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    // threat_events not in generated types — cast through never
    let query = supabase
        .from('threat_events' as never)
        .select('*', { count: 'exact' })
        .eq('project_id' as never, projectId)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (eventType) {
        const validTypes = ['xss', 'sqli', 'csrf', 'bot', 'brute_force', 'path_traversal', 'other'];
        if (validTypes.includes(eventType)) {
            query = query.eq('event_type', eventType);
        }
    }

    if (severity) {
        const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
        if (validSeverities.includes(severity)) {
            query = query.eq('severity', severity);
        }
    }

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, count, error } = await query;

    if (error) {
        console.error('Threat events list error:', error);
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({
        events: data || [],
        total: count || 0,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    });
}
