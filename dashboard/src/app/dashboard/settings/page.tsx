import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, User, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let credits = 0;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();
        if (profile) credits = profile.credits;
    }

    const { count: scanCount } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true });

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-heading font-medium tracking-tight text-white mb-2">Settings</h1>
                <p className="text-zinc-400">
                    Manage your account settings
                </p>
            </div>

            {/* Profile */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-blue-400" />
                        <div>
                            <CardTitle className="text-white">Profile</CardTitle>
                            <CardDescription className="text-zinc-400">Your account information</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email || ''} disabled className="bg-white/5 border-white/10" />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Account ID</Label>
                        <Input defaultValue={user?.id || ''} disabled className="bg-white/5 border-white/10 font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label>Member since</Label>
                        <Input defaultValue={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled className="bg-white/5 border-white/10" />
                    </div>
                </CardContent>
            </Card>

            {/* Credits */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-blue-400" />
                            <div>
                                <CardTitle className="text-white">Credits</CardTitle>
                                <CardDescription className="text-zinc-400">Your scan credits balance</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-white/10 p-4 mb-4 bg-white/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold gradient-text">{credits}</div>
                                <p className="text-sm text-muted-foreground">credits remaining</p>
                            </div>
                            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">
                                <Link href="/dashboard/credits">Buy Credits</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p>Total scans run: <strong>{scanCount || 0}</strong></p>
                        <p className="mt-1">Credits never expire. Each scan costs 1 credit.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-blue-400" />
                        <div>
                            <CardTitle className="text-white">Security</CardTitle>
                            <CardDescription className="text-zinc-400">Manage your account security</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Password</p>
                                <p className="text-sm text-muted-foreground">Change your account password</p>
                            </div>
                            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10">Change</Button>
                        </div>
                        <Separator className="bg-white/10" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-400">Delete account</p>
                                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                            </div>
                            <Button variant="destructive" size="sm">Delete</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
