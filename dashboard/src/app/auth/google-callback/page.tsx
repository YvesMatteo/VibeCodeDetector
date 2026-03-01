'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function GoogleCallbackPage() {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function handleCallback() {
            // Google implicit flow returns params in the URL hash fragment
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const idToken = params.get('id_token');
            let redirectTo = sessionStorage.getItem('google_auth_redirect') || '/dashboard';
            if (!redirectTo.startsWith('/') || redirectTo.startsWith('//') || redirectTo.includes('://')) {
                redirectTo = '/dashboard';
            }

            if (!idToken) {
                // Check for error in query params (Google returns errors there)
                const queryParams = new URLSearchParams(window.location.search);
                const googleError = queryParams.get('error');
                if (googleError) {
                    setError('Google sign-in was cancelled or failed. Please try again.');
                } else {
                    setError('No authentication token received from Google.');
                }
                return;
            }

            const supabase = createClient();
            const { error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            // Clean up session storage
            sessionStorage.removeItem('google_auth_redirect');
            sessionStorage.removeItem('google_auth_nonce');

            if (authError) {
                setError('Could not sign in with Google. Please try again.');
            } else {
                window.location.href = redirectTo;
            }
        }

        handleCallback();
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 bg-[#09090B]">
                <div className="w-full max-w-sm text-center">
                    <div className="p-3 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg mb-6">
                        {error}
                    </div>
                    <a
                        href="/login"
                        className="text-white hover:text-zinc-300 text-sm font-medium transition-colors"
                    >
                        Back to login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
            <div className="flex items-center gap-3 text-white text-sm">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing you in...
            </div>
        </div>
    );
}
