import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { isPrivateHostname } from '@/lib/url-validation';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/integrations/webhooks?projectId=xxx
export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 30 webhook reads per minute per user
    const rlGet = await checkRateLimit(`webhook-get:${user.id}`, 30, 60);
    if (!rlGet.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const { data, error } = await supabase
        .from('project_webhooks' as never)
        .select('id, url, events, enabled, last_triggered_at, last_status, created_at')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as { data: Record<string, unknown>[] | null; error: unknown };

    if (error) {
        console.error('List webhooks error:', error);
        return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }
    return NextResponse.json(data || []);
}

// POST /api/integrations/webhooks — create a webhook
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 webhook creates per minute per user
    const rl = await checkRateLimit(`webhook-create:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { projectId, url, events } = body;

    if (!projectId || !url) {
        return NextResponse.json({ error: 'projectId and url required' }, { status: 400 });
    }

    // Validate URL with SSRF protection
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 });
        }
        if (isPrivateHostname(parsed.hostname)) {
            return NextResponse.json({ error: 'Internal/private URLs are not allowed' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const validEvents = ['scan.completed', 'scan.started', 'score.changed', 'threat.detected'];
    const safeEvents = (events || ['scan.completed']).filter((e: string) => validEvents.includes(e));

    if (safeEvents.length === 0) {
        return NextResponse.json({ error: 'At least one valid event is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('project_webhooks' as never)
        .insert({
            project_id: projectId,
            user_id: user.id,
            url,
            events: safeEvents,
            secret,
            enabled: true,
        })
        .select('id, project_id, url, events, enabled, created_at')
        .single() as { data: Record<string, unknown> | null; error: unknown };

    if (error) {
        console.error('Create webhook error:', error);
        return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    // Return the webhook data + secret as a separate one-time field
    return NextResponse.json({ ...(data as Record<string, unknown>), secret }, { status: 201 });
}

// DELETE /api/integrations/webhooks?id=xxx
export async function DELETE(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 webhook deletes per minute per user
    const rl = await checkRateLimit(`webhook-del:${user.id}`, 10, 60);
    if (!rl.allowed) {
        return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
        .from('project_webhooks' as never)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id) as { error: unknown };

    if (error) {
        console.error('Delete webhook error:', error);
        return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
