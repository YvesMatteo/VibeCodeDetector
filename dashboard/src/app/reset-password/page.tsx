'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const supabase = createClient();

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 relative overflow-clip">
                <div className="absolute inset-0 bg-gradient-animated" />
                <Card className="w-full max-w-md relative z-10 glass-card border-white/10">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                        <p className="text-muted-foreground mb-6">
                            We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                        </p>
                        <Button variant="outline" asChild>
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-clip">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-animated" />

            {/* Floating Orbs */}
            <div className="orb orb-blue w-48 h-48 sm:w-96 sm:h-96 -top-24 sm:-top-48 -left-24 sm:-left-48" style={{ animationDelay: '0s' }} />
            <div className="orb orb-blue w-40 h-40 sm:w-80 sm:h-80 top-1/4 -right-20 sm:-right-40" style={{ animationDelay: '2s' }} />
            <div className="orb orb-blue w-32 h-32 sm:w-64 sm:h-64 bottom-20 left-1/4" style={{ animationDelay: '4s' }} />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <Image src="/logo.png" alt="CheckVibe Logo" width={48} height={48} className="h-12 w-12 object-contain transition-transform group-hover:scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            <div className="absolute inset-0 bg-blue-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-2xl font-bold">CheckVibe</span>
                    </Link>
                </div>

                <Card className="glass-card border-white/10">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Reset your password</CardTitle>
                        <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReset} className="space-y-4">
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

                            <Button type="submit" className="w-full shimmer-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 mt-2" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending reset link...
                                    </>
                                ) : (
                                    'Send reset link'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Remember your password?{' '}
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
