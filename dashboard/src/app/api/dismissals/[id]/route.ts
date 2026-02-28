import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 30 dismissal deletes per minute per user
        const rl = await checkRateLimit(`dismiss-del:${user.id}`, 30, 60);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
        }

        const { error } = await supabase
            .from('dismissed_findings')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Restore finding error:', error);
            return NextResponse.json({ error: 'Failed to restore finding' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Restore finding error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
