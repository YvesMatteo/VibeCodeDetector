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
            window.location.href = '/dashboard';
            return;
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
        if (score === 4) return { width: '80%', color: 'bg-emerald-400', label: 'Strong' };
        return { width: '100%', color: 'bg-emerald-500', label: 'Very Strong' };
    };

    const strength = getPasswordStrength();

    return (
        <div className="min-h-screen flex bg-[#09090B]">
            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

                <div className="relative">
                    <Link href="/" className="flex items-center space-x-2.5">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={36} height={36} className="h-9 w-9 object-contain rounded-lg" />
                        <span className="text-lg font-semibold text-white tracking-tight">CheckVibe</span>
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

            {/* Right Panel - Signup Form */}
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
                            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Create an account</h2>
                            <p className="text-zinc-500 text-sm">Start scanning your websites in minutes</p>
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
                                    className="h-11 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600"
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
                                    className="h-11 bg-white/[0.03] border-white/[0.08] focus:border-white/20 transition-colors placeholder:text-zinc-600"
                                />
                                {password && (
                                    <div className="space-y-1">
                                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strength.color} transition-all duration-300`}
                                                style={{ width: strength.width }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-600">
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
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-sm text-zinc-600">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white hover:text-zinc-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
