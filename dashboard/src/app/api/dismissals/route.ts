import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';
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

        // Verify the project belongs to the user
        const { data: project } = await supabase
            .from('projects' as any)
            .select('id')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const { data: dismissal, error } = await supabase
            .from('dismissed_findings' as any)
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

        const projectId = req.nextUrl.searchParams.get('projectId');
        if (!projectId) {
            return NextResponse.json({ error: 'projectId query param is required' }, { status: 400 });
        }

        const { data: dismissals, error } = await supabase
            .from('dismissed_findings' as any)
            .select('*')
            .eq('user_id', user.id)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('List dismissals error:', error);
            return NextResponse.json({ error: 'Failed to fetch dismissals' }, { status: 500 });
        }

        return NextResponse.json({ dismissals: dismissals || [] });
    } catch (error) {
        console.error('List dismissals error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
