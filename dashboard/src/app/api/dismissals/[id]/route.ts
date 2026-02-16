import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('dismissed_findings' as any)
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
