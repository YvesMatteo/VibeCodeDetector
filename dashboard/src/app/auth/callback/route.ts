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

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Check if this is a password recovery flow — redirect to update-password
            const { data: { session } } = await supabase.auth.getSession();
            const amr = (session?.user as any)?.amr as Array<{ method: string }> | undefined;
            const isRecovery = amr?.some(
                (entry: { method: string }) => entry.method === 'recovery'
            );
            if (isRecovery) {
                return NextResponse.redirect(`${origin}/update-password`);
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Auth failed — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
