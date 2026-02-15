import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ManageSubscriptionButton } from './manage-subscription-button';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let plan = 'none';
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
        if (profile) {
            plan = profile.plan || 'none';
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white mb-2">Settings</h1>
                <p className="text-zinc-500">
                    Manage your account settings
                </p>
            </div>

            {/* Profile */}
            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-zinc-400" />
                        <div>
                            <CardTitle className="text-white">Profile</CardTitle>
                            <CardDescription className="text-zinc-500">Your account information</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email || ''} disabled className="bg-white/[0.02] border-white/[0.06]" />
                        <p className="text-xs text-zinc-600">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Account ID</Label>
                        <Input defaultValue={user?.id || ''} disabled className="bg-white/[0.02] border-white/[0.06] font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label>Member since</Label>
                        <Input defaultValue={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled className="bg-white/[0.02] border-white/[0.06]" />
                    </div>
                    <div className="pt-2">
                        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
                            View subscription details on Dashboard
                        </Link>
                    </div>
                    {plan !== 'none' && (
                        <div className="pt-1">
                            <ManageSubscriptionButton />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-zinc-400" />
                        <div>
                            <CardTitle className="text-white">Security</CardTitle>
                            <CardDescription className="text-zinc-500">Manage your account security</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">Password</p>
                                <p className="text-sm text-zinc-500">Change your account password</p>
                            </div>
                            <Button variant="outline" size="sm" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04]">
                                <Link href="/update-password">Change</Link>
                            </Button>
                        </div>
                        <Separator className="bg-white/[0.06]" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-400">Delete account</p>
                                <p className="text-sm text-zinc-500">Please contact support to delete your account</p>
                            </div>
                            <Button variant="destructive" size="sm" disabled className="opacity-50 cursor-not-allowed">Contact Support</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
