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
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        if (window.google?.accounts?.id) {
            setScriptLoaded(true);
            return;
        }

        // Check if script tag already exists
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            existing.addEventListener('load', () => setScriptLoaded(true));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !window.google || !buttonRef.current) return;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;

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

        // Render Google's button — it shows user profile pictures
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
    }, [scriptLoaded, supabase, onError, text]);

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

    return (
        <div
            ref={buttonRef}
            className="w-full flex justify-center overflow-hidden rounded-md [&_iframe]:!rounded-md"
            style={{ minHeight: '44px' }}
        />
    );
}
