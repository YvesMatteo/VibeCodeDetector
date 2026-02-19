'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: GoogleIdConfig) => void;
                    renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
                    prompt: (callback?: (notification: PromptNotification) => void) => void;
                    cancel: () => void;
                };
            };
        };
    }
}

interface GoogleIdConfig {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonConfig {
    type: 'standard' | 'icon';
    theme: 'outline' | 'filled_blue' | 'filled_black';
    size: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
}

interface PromptNotification {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    getNotDisplayedReason: () => string;
    getSkippedReason: () => string;
}

interface GoogleSignInButtonProps {
    onError?: (msg: string) => void;
    text?: 'continue_with' | 'signin_with' | 'signup_with';
}

export function GoogleSignInButton({ onError, text = 'continue_with' }: GoogleSignInButtonProps) {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [gisReady, setGisReady] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const supabase = createClient();
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Load Google Identity Services script
    useEffect(() => {
        if (!clientId) return;

        if (window.google?.accounts?.id) {
            setGisReady(true);
            return;
        }

        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            existing.addEventListener('load', () => setGisReady(true));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setGisReady(true);
        document.head.appendChild(script);
    }, [clientId]);

    // Initialize GIS and render button
    useEffect(() => {
        if (!gisReady || !window.google || !buttonRef.current || !clientId) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
                setSigningIn(true);
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.credential,
                });

                if (error) {
                    setSigningIn(false);
                    onError?.('Could not sign in with Google. Please try again.');
                } else {
                    window.location.href = '/dashboard';
                }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
        });

        const containerWidth = Math.min(buttonRef.current.offsetWidth, 400);
        window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: containerWidth,
        });
    }, [gisReady, supabase, onError, text, clientId]);

    // Fallback: use standard OAuth redirect when GIS not available
    async function handleOAuthFallback() {
        setSigningIn(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) {
            setSigningIn(false);
            onError?.('Could not connect to Google. Please try again.');
        }
    }

    if (signingIn) {
        return (
            <div className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.03] text-white text-sm font-medium">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
            </div>
        );
    }

    // If GIS is ready and client ID exists, show the Google-rendered button
    if (clientId && gisReady) {
        return (
            <div
                ref={buttonRef}
                className="w-full flex justify-center overflow-hidden rounded-md [&_iframe]:!rounded-md"
                style={{ minHeight: '44px' }}
            />
        );
    }

    // Fallback button (no client ID, or GIS still loading)
    return (
        <button
            type="button"
            onClick={clientId ? undefined : handleOAuthFallback}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.03] text-white text-sm font-medium hover:bg-white/[0.06] transition-colors"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
        </button>
    );
}
