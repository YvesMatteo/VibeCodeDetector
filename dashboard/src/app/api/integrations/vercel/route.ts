import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/integrations/vercel?projectId=xxx
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 30 vercel integration reads per minute per user
    const rlVercelGet = await checkRateLimit(`vercel-get:${user.id}`, 30, 60);
    if (!rlVercelGet.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Fetch integration
    const { data: integration, error } = await supabase
        .from('vercel_integrations' as any)
        .select('id, project_id, enabled, last_deployment_at, last_scan_id, created_at')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Fetch vercel integration error:', error);
        return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
    }

    if (!integration) {
        return NextResponse.json({ integration: null, deployments: [] });
    }

    // Fetch recent deployments
    const { data: deployments } = await supabase
        .from('vercel_deployments' as any)
        .select('id, vercel_deployment_id, deployment_url, git_branch, git_commit_sha, scan_id, result_score, created_at')
        .eq('integration_id', (integration as any).id)
        .order('created_at', { ascending: false })
        .limit(10);

    return NextResponse.json({
        integration,
        deployments: deployments || [],
    });
}

// POST /api/integrations/vercel — create integration
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`vercel-create:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { projectId } = body;
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Check if integration already exists
    const { data: existing } = await supabase
        .from('vercel_integrations' as any)
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: 'Integration already exists for this project' }, { status: 409 });
    }

    const webhookSecret = `vcel_whsec_${crypto.randomBytes(24).toString('hex')}`;

    const { data, error } = await supabase
        .from('vercel_integrations' as any)
        .insert({
            project_id: projectId,
            user_id: user.id,
            webhook_secret: webhookSecret,
            enabled: true,
        })
        .select('id, project_id, enabled, created_at')
        .single();

    if (error) {
        console.error('Create vercel integration error:', error);
        return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://checkvibe.dev'}/api/integrations/vercel/webhook`;

    return NextResponse.json({
        ...(data as any),
        webhook_secret: webhookSecret,
        webhook_url: webhookUrl,
    }, { status: 201 });
}

// DELETE /api/integrations/vercel?projectId=xxx
export async function DELETE(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await checkRateLimit(`vercel-del:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const { error } = await supabase
        .from('vercel_integrations' as any)
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Delete vercel integration error:', error);
        return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
