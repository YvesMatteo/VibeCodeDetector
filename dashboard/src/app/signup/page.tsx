'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Key, Database, Code, Lock, GitBranch, Globe, Cookie } from 'lucide-react';
import Image from 'next/image';

const scanTypes = [
    { icon: Shield, label: 'Security Headers', color: 'text-red-400' },
    { icon: Key, label: 'API Key Detection', color: 'text-amber-400' },
    { icon: Database, label: 'SQL Injection', color: 'text-rose-400' },
    { icon: Code, label: 'XSS Detection', color: 'text-pink-400' },
    { icon: Lock, label: 'SSL/TLS', color: 'text-emerald-400' },
    { icon: GitBranch, label: 'GitHub Secrets', color: 'text-purple-400' },
    { icon: Globe, label: 'CORS Scanner', color: 'text-sky-400' },
    { icon: Cookie, label: 'Cookie Security', color: 'text-yellow-400' },
];

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!/[A-Z]/.test(password)) {
            setError('Password must contain at least one uppercase letter');
            return;
        }

        if (!/[a-z]/.test(password)) {
            setError('Password must contain at least one lowercase letter');
            return;
        }

        if (!/\d/.test(password)) {
            setError('Password must contain at least one number');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    }

    const getPasswordStrength = () => {
        if (!password) return { width: '0%', color: 'bg-white/10', label: '' };
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (password.length >= 12) score++;

        if (score <= 1) return { width: '20%', color: 'bg-red-500', label: 'Weak' };
        if (score === 2) return { width: '40%', color: 'bg-orange-500', label: 'Fair' };
        if (score === 3) return { width: '60%', color: 'bg-amber-500', label: 'Good' };
        if (score === 4) return { width: '80%', color: 'bg-green-400', label: 'Strong' };
        return { width: '100%', color: 'bg-green-500', label: 'Very Strong' };
    };

    const strength = getPasswordStrength();

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
                        The all-in-one security scanner for vibecoded websites. 17 scanners, one dashboard.
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

            {/* Right Panel - Signup Form */}
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
                            <h2 className="text-2xl font-semibold text-white mb-2">Create an account</h2>
                            <p className="text-zinc-400 text-sm">Start scanning your websites in minutes</p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-5">
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
                                <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="h-11 bg-white/[0.04] border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600"
                                />
                                {password && (
                                    <div className="space-y-1">
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strength.color} transition-all duration-300`}
                                                style={{ width: strength.width }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            Password strength: <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-zinc-400 text-sm">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-sm text-zinc-500">
                            Already have an account?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
