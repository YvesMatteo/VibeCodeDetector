import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const allCookies = req.cookies.getAll();
    const authCookies = allCookies.filter(c => c.name.startsWith('sb-'));

    let user = null;
    let authError = null;
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        user = data?.user ? { id: data.user.id, email: data.user.email } : null;
        authError = error?.message || null;
    } catch (e: any) {
        authError = e.message;
    }

    return NextResponse.json({
        totalCookies: allCookies.length,
        authCookieNames: authCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
        hasBypassCookie: allCookies.some(c => c.name === 'cv-access'),
        user,
        authError,
    });
}
