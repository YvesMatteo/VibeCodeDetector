'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
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
            // Redirect directly to dashboard (email confirmation is disabled)
            router.push('/dashboard');
        }
    }

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { width: '0%', color: 'bg-white/10', label: '' };
        if (password.length < 6) return { width: '25%', color: 'bg-red-500', label: 'Weak' };
        if (password.length < 10) return { width: '50%', color: 'bg-amber-500', label: 'Fair' };
        if (password.length < 14) return { width: '75%', color: 'bg-green-400', label: 'Good' };
        return { width: '100%', color: 'bg-green-500', label: 'Strong' };
    };

    const strength = getPasswordStrength();

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-animated" />

                {/* Floating Orbs */}
                <div className="orb orb-blue w-96 h-96 -top-48 -left-48" />
                <div className="orb orb-blue w-80 h-80 top-1/4 -right-40" />

                <Card className="w-full max-w-md glass-card border-white/10 relative z-10 animate-scale-in">
                    <CardContent className="pt-6 text-center">
                        <div className="relative inline-block">
                            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                            <div className="absolute inset-0 bg-green-500/30 blur-xl" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                        <p className="text-muted-foreground mb-6">
                            We&apos;ve sent you a confirmation link to <span className="font-medium text-foreground">{email}</span>.
                            Click the link to activate your account.
                        </p>
                        <Button variant="outline" asChild className="bg-white/5 border-white/10 hover:bg-white/10">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-animated" />

            {/* Floating Orbs */}
            <div className="orb orb-blue w-96 h-96 -top-48 -left-48" style={{ animationDelay: '0s' }} />
            <div className="orb orb-blue w-80 h-80 top-1/4 -right-40" style={{ animationDelay: '2s' }} />
            <div className="orb orb-blue w-64 h-64 bottom-20 left-1/4" style={{ animationDelay: '4s' }} />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <Image src="/logo.png" alt="CheckVibe Logo" width={48} height={48} className="h-12 w-12 object-contain transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-blue-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-2xl font-bold">CheckVibe</span>
                    </Link>
                </div>

                <Card className="glass-card border-white/10">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Create an account</CardTitle>
                        <CardDescription>Start scanning your websites for free</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                />
                                {/* Password Strength Indicator */}
                                {password && (
                                    <div className="space-y-1">
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strength.color} transition-all duration-300`}
                                                style={{ width: strength.width }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Password strength: <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-muted-foreground">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full shimmer-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 mt-2"
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

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
