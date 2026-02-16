import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: project, error } = await supabase
            .from('projects' as any)
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (error || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error('Get project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('projects' as any)
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await req.json();
        const updates: Record<string, any> = {};

        if (body.name !== undefined) updates.name = body.name.trim();
        if (body.url !== undefined) {
            const targetUrl = body.url.startsWith('http') ? body.url : `https://${body.url}`;
            try {
                const parsed = new URL(targetUrl);
                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
                }
                updates.url = targetUrl;
            } catch {
                return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
            }
        }
        if (body.githubRepo !== undefined) updates.github_repo = body.githubRepo?.trim() || null;
        if (body.backendType !== undefined) updates.backend_type = body.backendType;
        if (body.backendUrl !== undefined) updates.backend_url = body.backendUrl?.trim() || null;
        if (body.supabasePAT !== undefined) updates.supabase_pat = body.supabasePAT?.trim() || null;

        const { data: project, error: updateError } = await supabase
            .from('projects' as any)
            .update(updates)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            if (updateError.code === '23505') {
                return NextResponse.json({ error: 'A project with this URL already exists' }, { status: 409 });
            }
            console.error('Update project error:', updateError);
            return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error('Update project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership first
        const { data: project } = await supabase
            .from('projects' as any)
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Hard delete all scans linked to this project (owned by user)
        const { error: scansError } = await supabase
            .from('scans')
            .delete()
            .eq('project_id', params.id)
            .eq('user_id', user.id);

        if (scansError) {
            console.error('Delete project scans error:', scansError);
            return NextResponse.json({ error: 'Failed to delete project scans' }, { status: 500 });
        }

        // dismissed_findings cascade-deletes via FK, no need to delete manually

        // Delete the project itself
        const { error } = await supabase
            .from('projects' as any)
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Delete project error:', error);
            return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
