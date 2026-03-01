import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { OWNER_EMAIL } from '@/lib/constants';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== OWNER_EMAIL) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Query auth.users via admin client
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });

    if (error) {
        console.error('Failed to list users:', error.message);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get plans from profiles table
    const { data: profiles } = await admin.from('profiles').select('id, plan');
    const planMap = new Map((profiles || []).map((p: { id: string; plan: string }) => [p.id, p.plan]));

    const users = (data?.users || []).map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.user_metadata?.full_name || u.user_metadata?.name || null,
        emailConfirmed: !!u.email_confirmed_at,
        emailConfirmedAt: u.email_confirmed_at || null,
        providers: u.app_metadata?.providers || [],
        plan: planMap.get(u.id) || 'none',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
    }));

    return NextResponse.json({ users });
}
