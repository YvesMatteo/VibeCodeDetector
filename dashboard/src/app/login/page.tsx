'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Key, Scale, Search, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

const scanTypes = [
    { icon: Shield, label: 'Security Headers', color: 'text-red-400' },
    { icon: Key, label: 'API Key Detection', color: 'text-amber-400' },
    { icon: Scale, label: 'Legal Compliance', color: 'text-indigo-400' },
    { icon: Search, label: 'SEO Analysis', color: 'text-sky-400' },
    { icon: AlertTriangle, label: 'Threat Intel', color: 'text-cyan-400' },
];

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
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex relative overflow-clip">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0E0E10]" aria-hidden="true">
                <div className="absolute top-[-15%] left-[20%] w-[50%] h-[50%] bg-[#497EE9]/15 blur-[140px] rounded-full" />
                <div className="absolute bottom-[-15%] right-[10%] w-[40%] h-[40%] bg-[#749CFF]/10 blur-[140px] rounded-full" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12 xl:p-16">
                <div>
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <Image src="/logo.png" alt="CheckVibe Logo" width={40} height={40} className="h-10 w-10 object-contain transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        </div>
                        <span className="text-xl font-bold text-white">CheckVibe</span>
                    </Link>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-lg">
                    <h1 className="font-heading text-[44px] xl:text-[56px] leading-[1.08] tracking-[-0.02em] text-white mb-4">
                        Scan. Detect.{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow bg-[length:200%_auto]">
                            Protect.
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-lg mb-10">
                        The all-in-one security scanner for vibecoded websites. Five scans, one dashboard.
                    </p>

                    {/* Scan type pills */}
                    <div className="flex flex-wrap gap-3">
                        {scanTypes.map((scan) => (
                            <div
                                key={scan.label}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
                            >
                                <scan.icon className={`h-4 w-4 ${scan.color}`} />
                                <span className="text-sm text-zinc-300">{scan.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-zinc-600 text-sm">&copy; {new Date().getFullYear()} CheckVibe. All rights reserved.</p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-8 relative z-10">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex justify-center mb-8 lg:hidden">
                        <Link href="/" className="flex items-center space-x-2 group">
                            <div className="relative">
                                <Image src="/logo.png" alt="CheckVibe Logo" width={48} height={48} className="h-12 w-12 object-contain transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            </div>
                            <span className="text-2xl font-bold text-white">CheckVibe</span>
                        </Link>
                    </div>

                    <div className="animate-fade-in-up">
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
                            <p className="text-zinc-400 text-sm">Sign in to your account to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
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
                                    className="h-11 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
                                    <Link
                                        href="/reset-password"
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
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
                                    required
                                    className="h-11 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 shimmer-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 font-medium"
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

                        <p className="mt-8 text-center text-sm text-zinc-500">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
