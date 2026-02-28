import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import type { DismissalReason, DismissalScope } from '@/lib/dismissals';

const VALID_REASONS: DismissalReason[] = ['false_positive', 'accepted_risk', 'not_applicable', 'will_fix_later'];
const VALID_SCOPES: DismissalScope[] = ['project', 'scan'];

export async function POST(req: NextRequest) {
    try {
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 30 dismissals per minute per user
        const rl = await checkRateLimit(`dismiss:${user.id}`, 30, 60);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
        }

        const body = await req.json();
        const { projectId, scanId, fingerprint, reason, note, scope } = body;

        if (!projectId || typeof projectId !== 'string') {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        if (!scanId || typeof scanId !== 'string') {
            return NextResponse.json({ error: 'scanId is required' }, { status: 400 });
        }
        if (!fingerprint || typeof fingerprint !== 'string') {
            return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 });
        }
        if (!VALID_REASONS.includes(reason)) {
            return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
        }
        if (scope && !VALID_SCOPES.includes(scope)) {
            return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
        }
        if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 500)) {
            return NextResponse.json({ error: 'Note must be 500 characters or less' }, { status: 400 });
        }

        // Verify the project belongs to the user
        const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const { data: dismissal, error } = await supabase
            .from('dismissed_findings')
            .upsert(
                {
                    user_id: user.id,
                    project_id: projectId,
                    scan_id: scanId,
                    fingerprint,
                    reason,
                    note: note?.trim() || null,
                    scope: scope || 'project',
                },
                { onConflict: 'user_id,project_id,fingerprint' }
            )
            .select()
            .single();

        if (error) {
            console.error('Dismiss finding error:', error);
            return NextResponse.json({ error: 'Failed to dismiss finding' }, { status: 500 });
        }

        return NextResponse.json({ dismissal }, { status: 201 });
    } catch (error) {
        console.error('Dismiss finding error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 30 dismissal reads per minute per user
        const rlGet = await checkRateLimit(`dismiss-get:${user.id}`, 30, 60);
        if (!rlGet.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
        }

        const projectId = req.nextUrl.searchParams.get('projectId');
        if (!projectId) {
            return NextResponse.json({ error: 'projectId query param is required' }, { status: 400 });
        }

        const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10) || 100, 1), 500);
        const offset = Math.max(parseInt(req.nextUrl.searchParams.get('offset') || '0', 10) || 0, 0);

        const { data: dismissals, error, count } = await supabase
            .from('dismissed_findings')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('List dismissals error:', error);
            return NextResponse.json({ error: 'Failed to fetch dismissals' }, { status: 500 });
        }

        return NextResponse.json({ dismissals: dismissals || [], total: count || 0, limit, offset });
    } catch (error) {
        console.error('List dismissals error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
