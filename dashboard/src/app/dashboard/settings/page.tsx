import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Settings</h1>
                <p className="text-zinc-500 text-sm">
                    Manage your account settings
                </p>
            </div>

            {/* Profile */}
            <Card className="mb-4 bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-white text-sm font-medium">Profile</CardTitle>
                    <CardDescription className="text-zinc-600 text-xs">Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs text-zinc-500">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email || ''} disabled className="bg-white/[0.03] border-white/[0.06] h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Account ID</Label>
                        <Input defaultValue={user?.id || ''} disabled className="bg-white/[0.03] border-white/[0.06] h-9 font-mono text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Member since</Label>
                        <Input defaultValue={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled className="bg-white/[0.03] border-white/[0.06] h-9 text-sm" />
                    </div>
                    {plan !== 'none' && (
                        <div className="pt-1">
                            <ManageSubscriptionButton />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="pb-4">
                    <CardTitle className="text-white text-sm font-medium">Security</CardTitle>
                    <CardDescription className="text-zinc-600 text-xs">Manage your account security</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-300">Password</p>
                                <p className="text-xs text-zinc-600">Change your account password</p>
                            </div>
                            <Button variant="outline" size="sm" asChild className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] h-7 text-xs text-zinc-300">
                                <Link href="/update-password">Change</Link>
                            </Button>
                        </div>
                        <Separator className="bg-white/[0.06]" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-400">Delete account</p>
                                <p className="text-xs text-zinc-600">Contact support to delete your account</p>
                            </div>
                            <Button variant="ghost" size="sm" disabled className="opacity-40 h-7 text-xs text-zinc-500">Contact Support</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
