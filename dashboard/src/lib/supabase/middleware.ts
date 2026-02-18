import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';

async function hmacSha256(secret: string, message: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    const supabase = createServerClient<Database>(
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

    // Signed waitlist bypass cookie: cv-access=1:<hmac-hex>
    // Prevents forgery — only the server can issue valid bypass cookies.
    // Cookie values may be URL-encoded by Next.js (e.g. : → %3A), so decode first.
    const cvAccessRaw = request.cookies.get('cv-access')?.value;
    let hasBypass = false;
    if (cvAccessRaw) {
        try {
            const decoded = decodeURIComponent(cvAccessRaw);
            const [value, signature] = decoded.split(':');
            const secret = process.env.COOKIE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (value === '1' && signature && secret) {
                const expected = await hmacSha256(secret, 'cv-access=1');
                hasBypass = constantTimeEqual(signature, expected);
            }
        } catch {
            // If bypass check fails, continue without bypass
            hasBypass = false;
        }
    }

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
