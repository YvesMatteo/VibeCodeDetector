'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Shield, CreditCard } from 'lucide-react';
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

    return (
        <>
            <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'text-white border-white'
                                : 'text-zinc-500 border-transparent hover:text-zinc-300'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'profile' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
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
                            <Input id="email" type="email" defaultValue={email} disabled className="bg-white/[0.02] border-white/[0.06]" />
                            <p className="text-xs text-zinc-600">Email cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Account ID</Label>
                            <Input defaultValue={userId} disabled className="bg-white/[0.02] border-white/[0.06] font-mono text-xs" />
                        </div>
                        <div className="space-y-2">
                            <Label>Member since</Label>
                            <Input defaultValue={createdAt} disabled className="bg-white/[0.02] border-white/[0.06]" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'security' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
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
                                <Button variant="destructive" size="sm" asChild>
                                    <a href="mailto:hello@checkvibe.dev?subject=Account Deletion Request">Contact Support</a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'billing' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-zinc-400" />
                            <div>
                                <CardTitle className="text-white">Billing</CardTitle>
                                <CardDescription className="text-zinc-500">Manage your subscription</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">Current plan: <span className="capitalize">{plan === 'none' ? 'Free' : plan}</span></p>
                                <p className="text-sm text-zinc-500">{plan === 'none' ? 'Upgrade for full scan details and more scans' : 'Manage your plan and payment method'}</p>
                            </div>
                            {plan !== 'none' ? (
                                <ManageSubscriptionButton />
                            ) : (
                                <Button variant="outline" size="sm" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04]">
                                    <Link href="/dashboard/credits">View Plans</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
