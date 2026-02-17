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

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
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

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg">
                                    {error}
                                </div>
                            )}

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
