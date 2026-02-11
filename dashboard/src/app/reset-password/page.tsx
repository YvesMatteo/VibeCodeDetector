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
            redirectTo: `${window.location.origin}/update-password`,
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
            <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090B]">
                <Card className="w-full max-w-md bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                        <p className="text-zinc-500 text-sm mb-6">
                            We&apos;ve sent a password reset link to <span className="font-medium text-white">{email}</span>.
                        </p>
                        <Button variant="outline" asChild className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-zinc-300">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090B] relative overflow-clip">
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[100px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <Image src="/logo.png" alt="CheckVibe Logo" width={40} height={40} className="h-10 w-10 object-contain" />
                        <span className="text-xl font-semibold text-white">CheckVibe</span>
                    </Link>
                </div>

                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-lg font-semibold text-white">Reset your password</CardTitle>
                        <CardDescription className="text-zinc-500 text-sm">Enter your email and we&apos;ll send you a reset link</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleReset} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-500 text-xs">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white/[0.03] border-white/[0.06] focus:border-white/[0.12] h-9 text-sm"
                                />
                            </div>

                            <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium mt-2" disabled={loading}>
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

                        <div className="mt-6 text-center text-sm text-zinc-500">
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
