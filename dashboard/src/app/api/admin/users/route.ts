import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { OWNER_EMAIL } from '@/lib/constants';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check admin status from profiles table (preferred).
    // The is_admin column may not exist yet, so we cast to bypass Supabase's
    // generated types and handle the missing-column case at runtime.
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single() as { data: { is_admin?: boolean | null } | null; error: { message: string } | null };

    if (profileError || profile === null) {
        // Profile lookup failed — fall back to email check with warning
        console.warn(
            `[admin-auth] Could not read profile for user ${user.id}: ${profileError?.message ?? 'no profile row'}. ` +
            'Falling back to OWNER_EMAIL check. Add is_admin column to profiles table to remove this fallback.'
        );
        if (user.email !== OWNER_EMAIL) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } else if (typeof profile.is_admin === 'undefined' || profile.is_admin === null) {
        // is_admin column doesn't exist yet — fall back to email check with warning
        console.warn(
            '[admin-auth] profiles.is_admin column not found. ' +
            'Falling back to OWNER_EMAIL check. Run migration to add is_admin boolean column.'
        );
        if (user.email !== OWNER_EMAIL) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } else if (!profile.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
