/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase custom tables & dynamic scanner results */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLAN_CONFIG, FREE_PLAN_CONFIG } from '@/lib/plan-config';
import crypto from 'crypto';

// GET /api/threats/settings?projectId=xxx
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threat-settings-get:${user.id}`, 30, 60);
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

    const { data, error } = await (supabase as any)
        .from('threat_settings')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Threat settings fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json(data || { enabled: false, project_id: projectId });
}

// POST /api/threats/settings — create/update threat settings
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threat-settings:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    // Plan gating: threat detection requires a paid plan
    const { data: postProfile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

    const postPlanKey = (postProfile?.plan || 'none') as string;
    const postPlanConfig = postPlanKey in PLAN_CONFIG
        ? PLAN_CONFIG[postPlanKey as keyof typeof PLAN_CONFIG]
        : FREE_PLAN_CONFIG;

    if (!postPlanConfig.threatDetection) {
        return NextResponse.json(
            { error: 'Threat detection requires a paid plan. Please upgrade.' },
            { status: 403 }
        );
    }

    const body = await req.json();
    const { projectId, enabled, alertFrequency, alertEmail } = body;

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Validate alertFrequency
    const validFrequencies = ['immediate', 'hourly', 'daily'];
    if (alertFrequency && !validFrequencies.includes(alertFrequency)) {
        return NextResponse.json({ error: 'Invalid alert frequency' }, { status: 400 });
    }

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const sbUnchecked = supabase as any;

    // Generate snippet token if needed
    const { data: existing } = await sbUnchecked
        .from('threat_settings')
        .select('id, snippet_token')
        .eq('project_id', projectId)
        .maybeSingle();

    const snippetToken = (existing as { snippet_token?: string } | null)?.snippet_token
        || `cvt_${projectId.replace(/-/g, '').slice(0, 12)}_${crypto.randomBytes(8).toString('hex')}`;

    const { data, error } = await sbUnchecked
        .from('threat_settings')
        .upsert({
            project_id: projectId,
            user_id: user.id,
            enabled: enabled !== false,
            alert_frequency: alertFrequency || 'daily',
            alert_email: alertEmail || user.email,
            snippet_token: snippetToken,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id' })
        .select()
        .single();

    if (error) {
        console.error('Threat settings upsert error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json(data);
}
