'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle, Mail } from 'lucide-react';

type View = 'email' | 'success' | 'passcode';

export default function WaitlistPage() {
    const router = useRouter();
    const [view, setView] = useState<View>('email');
    const [email, setEmail] = useState('');
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? 'Something went wrong.');
            } else {
                setView('success');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handlePasscode(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', passcode }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? 'Invalid access code');
            } else {
                // Cookie is set by the API — redirect to the main site
                router.push('/');
            }
        } catch {
            setError('Something went wrong. Please try again.');
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
                    <Link href="/waitlist" className="flex items-center space-x-2.5">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={36} height={36} className="h-9 w-9 object-contain" />
                        <span className="text-lg font-semibold text-white tracking-tight">CheckVibe</span>
                    </Link>
                </div>

                <div className="relative flex-1 flex flex-col justify-center max-w-md">
                    <h1 className="font-heading text-[42px] xl:text-[48px] leading-[1.1] tracking-[-0.03em] text-white mb-5">
                        Get early access to CheckVibe
                    </h1>
                    <p className="text-zinc-500 text-lg leading-relaxed">
                        26 automated security scanners. One comprehensive report. Be the first to try it.
                    </p>
                </div>

                <p className="relative text-zinc-700 text-sm">&copy; {new Date().getFullYear()} CheckVibe</p>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-8">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex justify-center mb-10 lg:hidden">
                        <Link href="/waitlist" className="flex items-center space-x-2.5">
                            <Image src="/logo.png" alt="CheckVibe Logo" width={40} height={40} className="h-10 w-10 object-contain" />
                            <span className="text-xl font-semibold text-white tracking-tight">CheckVibe</span>
                        </Link>
                    </div>

                    {/* View: Email signup (default) */}
                    {view === 'email' && (
                        <div className="animate-fade-in-up">
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <Mail className="h-5 w-5 text-[#749CFF]" />
                                    <h2 className="text-2xl font-semibold text-white tracking-tight">Join the waitlist</h2>
                                </div>
                                <p className="text-zinc-500 text-sm">Be the first to know when CheckVibe launches. Drop your email below.</p>
                            </div>

                            <form onSubmit={handleSignup} className="space-y-5">
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
                                        autoFocus
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
                                            Signing up...
                                        </>
                                    ) : (
                                        'Join waitlist'
                                    )}
                                </Button>
                            </form>

                            <button
                                onClick={() => { setView('passcode'); setError(null); }}
                                className="mt-8 block mx-auto text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
                            >
                                Have an access code?
                            </button>
                        </div>
                    )}

                    {/* View: Passcode bypass */}
                    {view === 'passcode' && (
                        <div className="animate-fade-in-up">
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <Lock className="h-5 w-5 text-[#749CFF]" />
                                    <h2 className="text-2xl font-semibold text-white tracking-tight">Enter access code</h2>
                                </div>
                                <p className="text-zinc-500 text-sm">Enter your code to get full access.</p>
                            </div>

                            <form onSubmit={handlePasscode} className="space-y-5">
                                {error && (
                                    <div className="p-3 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="passcode" className="text-zinc-400 text-sm">Access code</Label>
                                    <Input
                                        id="passcode"
                                        type="password"
                                        placeholder="••••••••"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        required
                                        autoFocus
                                        className="h-11 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600 text-center font-mono tracking-[0.2em]"
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
                                            Verifying...
                                        </>
                                    ) : (
                                        'Unlock access'
                                    )}
                                </Button>
                            </form>

                            <button
                                onClick={() => { setView('email'); setError(null); }}
                                className="mt-6 block mx-auto text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                            >
                                Back to waitlist
                            </button>
                        </div>
                    )}

                    {/* View: Success */}
                    {view === 'success' && (
                        <div className="animate-fade-in-up text-center">
                            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-5" />
                            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">You&apos;re on the list!</h2>
                            <p className="text-zinc-500 text-sm mb-8">
                                We&apos;ll notify you when CheckVibe is ready. Keep an eye on your inbox.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
