import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    let next = searchParams.get('next') ?? '/dashboard';

    // Prevent open redirect: ensure `next` is a safe relative path
    if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
        next = '/dashboard';
    }

    const isRecovery = next === '/update-password';

    if (code) {
        const supabase = await createClient();

        // For password recovery, sign out any existing session first
        // so the user starts clean on the update-password page
        if (isRecovery) {
            await supabase.auth.signOut();
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Auth failed — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
