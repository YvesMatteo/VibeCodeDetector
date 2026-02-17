'use client';

import { useState } from 'react';
import Link from 'next/link';
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

    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong. Please try again.');
            } else {
                setSuccess(true);
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090B]">
                <Card className="w-full max-w-md border-white/[0.06] bg-white/[0.02]">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                        <p className="text-zinc-500 text-sm mb-6">
                            We&apos;ve sent a password reset link to <span className="font-medium text-white">{email}</span>.
                        </p>
                        <Button variant="outline" asChild className="border-white/[0.08] bg-transparent hover:bg-white/5">
                            <Link href="/login">Back to login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090B]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center space-x-2.5">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={40} height={40} className="h-10 w-10 object-contain rounded-lg" />
                        <span className="text-xl font-semibold text-white tracking-tight">CheckVibe</span>
                    </Link>
                </div>

                <Card className="border-white/[0.06] bg-white/[0.02]">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl text-white">Reset your password</CardTitle>
                        <CardDescription className="text-zinc-500">Enter your email and we&apos;ll send you a reset link</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReset} className="space-y-4">
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

                            <Button
                                type="submit"
                                className="w-full h-11 bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium transition-colors mt-2"
                                disabled={loading}
                            >
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

                        <div className="mt-6 text-center text-sm text-zinc-600">
                            Remember your password?{' '}
                            <Link href="/login" className="text-white hover:text-zinc-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
