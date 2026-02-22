import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateTargetUrl } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';
import { encrypt } from '@/lib/encryption';

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
            .from('projects')
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (error || !project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Never send decrypted PAT to the client — only expose a boolean flag
        const safeProject = {
            ...project,
            supabase_pat: undefined,
            has_supabase_pat: !!project.supabase_pat,
        };

        return NextResponse.json({ project: safeProject });
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
        // CSRF protection
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('projects')
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await req.json();
        const updates: Record<string, any> = {};

        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 100) {
                return NextResponse.json({ error: 'Project name must be 1-100 characters' }, { status: 400 });
            }
            updates.name = body.name.trim();
        }
        if (body.url !== undefined) {
            const urlValidation = validateTargetUrl(body.url);
            if (!urlValidation.valid) {
                return NextResponse.json({ error: urlValidation.error }, { status: 400 });
            }
            updates.url = urlValidation.parsed.href;
        }
        if (body.githubRepo !== undefined) updates.github_repo = body.githubRepo?.trim() || null;
        if (body.backendType !== undefined) {
            const validBackendTypes = ['supabase', 'firebase', 'convex', 'none'];
            if (!validBackendTypes.includes(body.backendType)) {
                return NextResponse.json({ error: 'Invalid backendType' }, { status: 400 });
            }
            updates.backend_type = body.backendType;
        }
        if (body.backendUrl !== undefined) updates.backend_url = body.backendUrl?.trim() || null;
        if (body.supabasePAT !== undefined) {
            const rawPAT = body.supabasePAT?.trim() || null;
            updates.supabase_pat = rawPAT ? encrypt(rawPAT) : null;
        }
        if (body.badgeEnabled !== undefined) updates.badge_enabled = !!body.badgeEnabled;

        const { data: project, error: updateError } = await supabase
            .from('projects')
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

        // Never send decrypted PAT to the client
        const safeProject = {
            ...project,
            supabase_pat: undefined,
            has_supabase_pat: !!project.supabase_pat,
        };

        return NextResponse.json({ project: safeProject });
    } catch (error) {
        console.error('Update project error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        // CSRF protection
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership first
        const { data: project } = await supabase
            .from('projects')
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
            .from('projects')
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
