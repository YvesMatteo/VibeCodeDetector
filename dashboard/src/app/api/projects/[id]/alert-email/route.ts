import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const { id: projectId } = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify project ownership
        const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const body = await req.json();
        const email = (typeof body.email === 'string' ? body.email.trim() : '') || null;

        // Update all alert_rules for this project
        await (supabase
            .from('alert_rules' as never)
            .update({ notify_email: email } as never)
            .eq('project_id' as never, projectId)
            .eq('user_id' as never, user.id));

        // Update threat_settings for this project (if row exists)
        await (supabase
            .from('threat_settings' as never)
            .update({ alert_email: email } as never)
            .eq('project_id' as never, projectId)
            .eq('user_id' as never, user.id));

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
