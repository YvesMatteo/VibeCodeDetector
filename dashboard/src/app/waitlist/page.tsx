'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle, Mail } from 'lucide-react';
import * as motion from 'framer-motion/client';
import { useMotionValue, useTransform, useSpring } from 'framer-motion';

type View = 'email' | 'success' | 'passcode';

export default function WaitlistPage() {
    const [view, setView] = useState<View>('email');
    const [email, setEmail] = useState('');
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Parallax orbs (same as landing page)
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const x = (clientX - left) / width - 0.5;
        const y = (clientY - top) / height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    }

    const orb1X = useSpring(useTransform(mouseX, [-0.5, 0.5], [-30, 30]), { stiffness: 150, damping: 30 });
    const orb1Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-30, 30]), { stiffness: 150, damping: 30 });
    const orb2X = useSpring(useTransform(mouseX, [-0.5, 0.5], [30, -30]), { stiffness: 150, damping: 30 });
    const orb2Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [30, -30]), { stiffness: 150, damping: 30 });

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
                window.location.href = '/';
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0E0E10] overflow-hidden" onMouseMove={handleMouseMove}>
            {/* Animated Background */}
            <div className="absolute inset-0" aria-hidden="true">
                <motion.div
                    style={{ x: orb1X, y: orb1Y }}
                    className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#497EE9]/20 blur-[120px] rounded-full"
                />
                <motion.div
                    style={{ x: orb2X, y: orb2Y }}
                    className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#749CFF]/10 blur-[120px] rounded-full"
                />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Nav pill */}
            <nav className="fixed top-4 w-full z-50 flex justify-center pointer-events-none px-4">
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 sm:gap-6 shadow-2xl pointer-events-auto"
                >
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={24} height={24} className="w-6 h-6 object-contain rounded" />
                        <span className="font-bold text-white tracking-tight">CheckVibe</span>
                    </div>
                </motion.div>
            </nav>

            {/* Content */}
            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6">
                <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-5 sm:gap-8">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner shadow-white/5"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse" />
                        <span className="text-xs font-medium text-blue-200 tracking-wide uppercase">Early Access</span>
                    </motion.div>

                    {/* Headline with reveal animation */}
                    <h1 className="font-heading text-[26px] leading-[1.08] min-[400px]:text-[32px] sm:text-[56px] md:text-[80px] tracking-[-0.02em] text-white flex flex-col items-center gap-0 sm:gap-2 w-full">
                        <span className="block overflow-hidden">
                            <motion.span
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                className="block"
                            >
                                Get <span className="italic text-white/50">early access</span> to
                            </motion.span>
                        </span>
                        <span className="block overflow-hidden">
                            <motion.span
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                className="block text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow bg-[length:200%_auto]"
                            >
                                CheckVibe
                            </motion.span>
                        </span>
                    </h1>

                    {/* Subtext */}
                    <div className="overflow-hidden">
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="text-sm sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto px-2"
                        >
                            30 automated security scanners. One comprehensive report. Be the first to try it.
                        </motion.p>
                    </div>

                    {/* Form card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="w-full max-w-md mt-2"
                    >
                        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
                            {/* Email signup (default) */}
                            {view === 'email' && (
                                <>
                                    <form onSubmit={handleSignup} className="space-y-4">
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
                                                className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600 rounded-xl"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full h-12 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Signing up...
                                                </>
                                            ) : (
                                                'Join the waitlist'
                                            )}
                                        </Button>
                                    </form>
                                    <button
                                        onClick={() => { setView('passcode'); setError(null); }}
                                        className="mt-5 block mx-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                    >
                                        Have an access code?
                                    </button>
                                </>
                            )}

                            {/* Passcode bypass */}
                            {view === 'passcode' && (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Lock className="h-4 w-4 text-[#749CFF]" />
                                        <span className="text-sm font-medium text-zinc-300">Enter access code</span>
                                    </div>
                                    <form onSubmit={handlePasscode} className="space-y-4">
                                        {error && (
                                            <div className="p-3 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg">
                                                {error}
                                            </div>
                                        )}
                                        <Input
                                            id="passcode"
                                            type="password"
                                            placeholder="••••••••"
                                            value={passcode}
                                            onChange={(e) => setPasscode(e.target.value)}
                                            required
                                            autoFocus
                                            className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600 text-center font-mono tracking-[0.2em] rounded-xl"
                                        />
                                        <Button
                                            type="submit"
                                            className="w-full h-12 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0"
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
                                        className="mt-5 block mx-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                    >
                                        Back to waitlist
                                    </button>
                                </>
                            )}

                            {/* Success */}
                            {view === 'success' && (
                                <div className="text-center py-4">
                                    <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-white tracking-tight mb-2">You&apos;re on the list!</h2>
                                    <p className="text-zinc-500 text-sm">
                                        We&apos;ll notify you when CheckVibe is ready.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
