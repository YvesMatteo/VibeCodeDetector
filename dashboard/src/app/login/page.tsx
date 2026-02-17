'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleGoogleLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setError('Could not connect to Google. Please try again.');
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Clear ALL stale supabase cookies on every possible domain
            // This prevents conflicts between cookies set on different domains
            document.cookie.split(';').forEach(c => {
                const name = c.trim().split('=')[0];
                if (name.startsWith('sb-')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.checkvibe.dev`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=checkvibe.dev`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=www.checkvibe.dev`;
                }
            });

            await supabase.auth.signOut();

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError('Invalid login credentials');
            } else {
                window.location.href = '/dashboard';
                return;
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex bg-[#09090B]">
            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

                <div className="relative">
                    <Link href="/" className="flex items-center space-x-3">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={48} height={48} className="h-12 w-12 object-contain rounded-lg" />
                        <span className="text-2xl font-semibold text-white tracking-tight">CheckVibe</span>
                    </Link>
                </div>

                <div className="relative flex-1 flex flex-col justify-center max-w-md">
                    <h1 className="font-heading text-[42px] xl:text-[48px] leading-[1.1] tracking-[-0.03em] text-white mb-5">
                        Security scanning for modern web apps
                    </h1>
                    <p className="text-zinc-500 text-lg leading-relaxed">
                        26 automated scanners. One comprehensive report. Ship with confidence.
                    </p>
                </div>

                <p className="relative text-zinc-700 text-sm">&copy; {new Date().getFullYear()} CheckVibe</p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-8">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex justify-center mb-10 lg:hidden">
                        <Link href="/" className="flex items-center space-x-2.5">
                            <Image src="/logo.png" alt="CheckVibe Logo" width={40} height={40} className="h-10 w-10 object-contain rounded-lg" />
                            <span className="text-xl font-semibold text-white tracking-tight">CheckVibe</span>
                        </Link>
                    </div>

                    <div className="animate-fade-in-up">
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Welcome back</h2>
                            <p className="text-zinc-500 text-sm">Sign in to your account to continue</p>
                        </div>

                        <div className="space-y-5">
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg whitespace-pre-wrap break-all">
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
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

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-white/[0.06]" />
                                <span className="text-xs text-zinc-600">or</span>
                                <div className="h-px flex-1 bg-white/[0.06]" />
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5 mt-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="h-11 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
                                    <Link
                                        href="/reset-password"
                                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="h-11 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium transition-colors"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-sm text-zinc-600">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-white hover:text-zinc-300 font-medium transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
