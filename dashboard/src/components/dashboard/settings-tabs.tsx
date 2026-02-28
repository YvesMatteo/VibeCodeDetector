'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Shield, CreditCard, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ManageSubscriptionButton } from '@/app/dashboard/settings/manage-subscription-button';

interface SettingsTabsProps {
    email: string;
    userId: string;
    createdAt: string;
    plan: string;
}

const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

export function SettingsTabs({ email, userId, createdAt, plan }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState<string>('profile');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    function copyToClipboard(text: string, field: string) {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedField(null), 2000);
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 border-white/[0.06]">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white/[0.05] text-white'
                                : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-w-0">
                {activeTab === 'profile' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-lg font-medium text-white mb-1">Profile</h2>
                            <p className="text-sm text-zinc-500">Your account information</p>
                        </div>
                        <div className="space-y-6 max-w-lg">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-400">Email Address</Label>
                                <Input id="email" type="email" defaultValue={email} disabled className="bg-transparent border-white/[0.06] focus-visible:ring-0 focus-visible:border-white/[0.2] text-zinc-300 h-10" />
                                <p className="text-[11px] text-zinc-600 mt-1">Email cannot be changed at this time.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Account ID</Label>
                                <div className="flex items-center gap-2">
                                    <Input defaultValue={userId} disabled className="bg-transparent border-white/[0.06] font-mono text-xs text-zinc-500 h-10 truncate" title={userId} />
                                    <button
                                        onClick={() => copyToClipboard(userId, 'userId')}
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-2"
                                        title="Copy Account ID"
                                    >
                                        {copiedField === 'userId' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Member Since</Label>
                                <Input defaultValue={createdAt} disabled className="bg-transparent border-white/[0.06] text-zinc-500 h-10" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-lg font-medium text-white mb-1">Security</h2>
                            <p className="text-sm text-zinc-500">Manage your account security</p>
                        </div>
                        <div className="space-y-6 max-w-xl">
                            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                                <div>
                                    <p className="font-medium text-sm text-white">Password</p>
                                    <p className="text-[13px] text-zinc-500 mt-0.5">Change your account password to keep it secure.</p>
                                </div>
                                <Button variant="outline" size="sm" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-xs h-8">
                                    <Link href="/update-password">Update</Link>
                                </Button>
                            </div>

                            <Separator className="bg-white/[0.06]" />

                            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-500/10 bg-red-500/[0.02]">
                                <div>
                                    <p className="font-medium text-sm text-red-400">Delete Account</p>
                                    <p className="text-[13px] text-zinc-500 mt-0.5">Permanently remove your account and all associated data.</p>
                                </div>
                                <Button variant="destructive" size="sm" asChild className="text-xs h-8">
                                    <a href="mailto:support@checkvibe.dev?subject=Account Deletion Request">Request Deletion</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-lg font-medium text-white mb-1">Billing</h2>
                            <p className="text-sm text-zinc-500">Manage your subscription and credits</p>
                        </div>
                        <div className="max-w-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                                <div>
                                    <p className="text-sm text-zinc-400 mb-1">Current Plan</p>
                                    <p className="font-medium text-lg text-white capitalize">{plan === 'none' ? 'Free Plan' : plan}</p>
                                </div>
                                {plan !== 'none' ? (
                                    <ManageSubscriptionButton />
                                ) : (
                                    <Button asChild className="bg-sky-500 text-white hover:bg-sky-400 border-0 font-medium shadow-sm transition-all h-9">
                                        <Link href="/dashboard/credits">Upgrade Plan</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
