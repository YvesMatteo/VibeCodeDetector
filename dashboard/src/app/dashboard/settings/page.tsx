import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <div className="p-5 md:p-10 max-w-3xl">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    Settings
                </h1>
                <p className="text-zinc-500 text-[15px]">
                    Manage your account and preferences
                </p>
            </div>

            {/* Profile Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2.5 mb-1">
                    <User className="h-4 w-4 text-zinc-500" />
                    <h2 className="text-lg font-heading font-medium text-white">Profile</h2>
                </div>
                <p className="text-[13px] text-zinc-600 mb-5">Your account information</p>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-400 text-[13px]">Email</Label>
                        <Input id="email" type="email" defaultValue={user?.email || ''} disabled className="bg-white/[0.02] border-white/[0.06] text-zinc-300 rounded-lg" />
                        <p className="text-[11px] text-zinc-600">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[13px]">Account ID</Label>
                        <Input defaultValue={user?.id || ''} disabled className="bg-white/[0.02] border-white/[0.06] font-mono text-xs text-zinc-400 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-[13px]">Member since</Label>
                        <Input defaultValue={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled className="bg-white/[0.02] border-white/[0.06] text-zinc-300 rounded-lg" />
                    </div>
                    <div className="pt-1">
                        <Link href="/dashboard/credits" className="text-[13px] text-zinc-500 hover:text-white transition-colors">
                            View subscription details
                        </Link>
                    </div>
                    {plan !== 'none' && (
                        <div className="pt-1">
                            <ManageSubscriptionButton />
                        </div>
                    )}
                </div>
            </div>

            {/* Security Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2.5 mb-1">
                    <Shield className="h-4 w-4 text-zinc-500" />
                    <h2 className="text-lg font-heading font-medium text-white">Security</h2>
                </div>
                <p className="text-[13px] text-zinc-600 mb-5">Manage your account security</p>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[14px] font-medium text-white">Password</p>
                            <p className="text-[13px] text-zinc-500">Change your account password</p>
                        </div>
                        <Button variant="outline" size="sm" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 rounded-lg text-[13px]">
                            <Link href="/update-password">Change</Link>
                        </Button>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[14px] font-medium text-red-400">Delete account</p>
                            <p className="text-[13px] text-zinc-500">Please contact support to delete your account</p>
                        </div>
                        <Button variant="destructive" size="sm" disabled className="opacity-50 cursor-not-allowed rounded-lg text-[13px]">Contact Support</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
