import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // List cookie names and sizes (not values for security)
    const cookieInfo = allCookies.map(c => ({
        name: c.name,
        valueLength: c.value.length,
        isSupabase: c.name.startsWith('sb-'),
    }));

    const supabaseCookies = cookieInfo.filter(c => c.isSupabase);

    let userResult: { id: string; email?: string } | null = null;
    let authError: string | null = null;

    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        userResult = user ? { id: user.id, email: user.email ?? undefined } : null;
        authError = error ? error.message : null;
    } catch (e) {
        authError = `Exception: ${e instanceof Error ? e.message : String(e)}`;
    }

    return NextResponse.json({
        totalCookies: allCookies.length,
        supabaseCookies,
        allCookieNames: cookieInfo.map(c => c.name),
        user: userResult,
        authError,
        timestamp: new Date().toISOString(),
    });
}
