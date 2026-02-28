import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PRIMARY_DOMAIN = 'checkvibe.dev';

export async function middleware(request: NextRequest) {
    // 301 redirect non-primary domains (e.g. checkvibe.online) to checkvibe.dev
    const host = request.headers.get('host')?.split(':')[0];
    if (host && host !== PRIMARY_DOMAIN && host !== `www.${PRIMARY_DOMAIN}` && host !== 'localhost' && !host.endsWith('.vercel.app')) {
        const url = new URL(request.url);
        url.host = PRIMARY_DOMAIN;
        url.port = '';
        url.protocol = 'https:';
        return NextResponse.redirect(url, 301);
    }

    try {
        return await updateSession(request);
    } catch (e) {
        console.error('Middleware error:', e);
        // If auth fails on protected routes, redirect to login with error info
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('mw_error', 'auth_refresh_failed');
            return NextResponse.redirect(url);
        }
        // For public routes, allow through even if auth refresh fails
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        });
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes)
         * - Static files (svg, png, jpg, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
