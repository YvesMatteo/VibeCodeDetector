'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const handled = useRef(false);
    // Capture hash immediately before Supabase client can consume it
    const hashRef = useRef(typeof window !== 'undefined' ? window.location.hash : '');

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        let next = searchParams.get('next') || '/dashboard';
        // Prevent open redirect
        if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
            next = '/dashboard';
        }

        const code = searchParams.get('code');
        const hash = hashRef.current;

        async function handleAuth() {
            const supabase = createClient();

            // Sign out any existing session so the new auth token takes over cleanly.
            // This fixes the bug where clicking a reset/confirm link while logged in
            // as a different account would keep the old session.
            await supabase.auth.signOut({ scope: 'local' });

            if (code) {
                // PKCE flow: exchange authorization code for session
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error('Auth callback code exchange failed:', error.message);
                    router.replace('/login?error=auth_failed');
                    return;
                }
                router.replace(next);
            } else if (hash) {
                // Implicit flow: tokens are in the URL hash fragment
                // Extract them manually since we signed out before the client could auto-process
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error) {
                        console.error('Auth callback setSession failed:', error.message);
                        router.replace('/login?error=auth_failed');
                        return;
                    }
                    router.replace(next);
                } else {
                    router.replace('/login?error=auth_failed');
                }
            } else {
                // No code and no hash — nothing to process
                router.replace('/login?error=auth_failed');
            }
        }

        handleAuth();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        }>
            <CallbackHandler />
        </Suspense>
    );
}
