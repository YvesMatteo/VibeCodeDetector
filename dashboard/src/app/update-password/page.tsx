'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

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
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        }
    }

    // Password strength indicator
    const getPasswordStrength = () => {
        if (!password) return { width: '0%', color: 'bg-white/[0.06]', label: '' };
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
                        <CardTitle className="text-lg font-semibold text-white">Update password</CardTitle>
                        <CardDescription className="text-zinc-500 text-sm">Enter your new password below</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Password updated successfully</p>
                                    <p className="text-sm text-zinc-500 mt-1">Redirecting to login...</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-zinc-500 text-xs">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="bg-white/[0.03] border-white/[0.06] focus:border-white/[0.12] h-9 text-sm"
                                    />
                                    {/* Password Strength Indicator */}
                                    {password && (
                                        <div className="space-y-1">
                                            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
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
                                    <p className="text-xs text-zinc-600">
                                        Must be 8+ characters with uppercase, lowercase, and a number
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password" className="text-zinc-500 text-xs">Confirm New Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="bg-white/[0.03] border-white/[0.06] focus:border-white/[0.12] h-9 text-sm"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium mt-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating password...
                                        </>
                                    ) : (
                                        'Update password'
                                    )}
                                </Button>
                            </form>
                        )}

                        <div className="mt-6 text-center text-sm text-zinc-500">
                            <Link href="/login" className="text-white hover:text-zinc-300 font-medium transition-colors">
                                Back to login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
