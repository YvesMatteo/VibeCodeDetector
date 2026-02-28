import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/threats/snippet?projectId=xxx — returns the embed HTML
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`threats-snippet:${user.id}`, 30, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
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

    const { data: settings } = await supabase
        .from('threat_settings' as any)
        .select('snippet_token')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!settings?.snippet_token) {
        return NextResponse.json({ error: 'Enable threat detection first' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://checkvibe.dev';

    const snippet = `<script src="${appUrl}/sdk/cv-threat.min.js" data-token="${settings.snippet_token}" async defer></script>`;

    return NextResponse.json({ snippet, token: settings.snippet_token });
}
