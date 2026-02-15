import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const hasBypass = request.cookies.get('cv-access')?.value === '1';

    // Waitlist gate: redirect public pages to /waitlist unless bypassed or authenticated
    const isWaitlistPage = pathname === '/waitlist';
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isDashboard = pathname.startsWith('/dashboard');
    const isResetPassword = pathname.startsWith('/reset-password');

    if (!hasBypass && !user && !isWaitlistPage && !isDashboard && !isResetPassword) {
        const url = request.nextUrl.clone();
        url.pathname = '/waitlist';
        return NextResponse.redirect(url);
    }

    // Redirect to login if accessing protected routes without auth
    if (
        !user &&
        isDashboard
    ) {
        const url = request.nextUrl.clone();
        url.pathname = hasBypass ? '/login' : '/waitlist';
        return NextResponse.redirect(url);
    }

    // Redirect to dashboard if already logged in and accessing auth pages
    if (
        user &&
        (isAuthPage || isWaitlistPage)
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
