import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { PLAN_CONFIG, FREE_PLAN_CONFIG } from '@/lib/plan-config';

// GET /api/threats/snippet?projectId=xxx — returns the embed HTML
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threats-snippet:${user.id}`, 30, 60);
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

    // threat_settings not in generated types — cast through never
    const { data: settings } = await supabase
        .from('threat_settings' as never)
        .select('snippet_token')
        .eq('project_id' as never, projectId)
        .eq('user_id' as never, user.id)
        .maybeSingle();

    const s = settings as { snippet_token?: string } | null;
    if (!s?.snippet_token) {
        return NextResponse.json({ error: 'Enable threat detection first' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://checkvibe.dev';

    const snippet = `<script src="${appUrl}/sdk/cv-threat.min.js" data-token="${s.snippet_token}" async defer></script>`;

    return NextResponse.json({ snippet, token: s.snippet_token });
}
