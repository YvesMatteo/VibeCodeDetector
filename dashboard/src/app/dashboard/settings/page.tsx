import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Crown, User, Shield, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ManageSubscriptionButton } from './manage-subscription-button';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let plan = 'none';
    let scansUsed = 0;
    let scansLimit = 0;
    let domainsLimit = 0;
    let allowedDomains: string[] = [];
    let periodStart: string | null = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, plan_scans_used, plan_scans_limit, plan_domains, allowed_domains, plan_period_start, stripe_customer_id')
            .eq('id', user.id)
            .single();
        if (profile) {
            plan = profile.plan || 'none';
            scansUsed = profile.plan_scans_used || 0;
            scansLimit = profile.plan_scans_limit || 0;
            domainsLimit = profile.plan_domains || 0;
            allowedDomains = profile.allowed_domains || [];
            periodStart = profile.plan_period_start;
        }
    }

    const { count: scanCount } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true });

    const planLabel = plan === 'none' ? 'No Plan' : plan.charAt(0).toUpperCase() + plan.slice(1);

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white mb-2">Settings</h1>
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

            {/* Subscription */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Crown className="h-5 w-5 text-blue-400" />
                            <div>
                                <CardTitle className="text-white">Subscription</CardTitle>
                                <CardDescription className="text-zinc-400">Your current plan and usage</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-white/10 p-4 mb-4 bg-white/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-3xl font-bold gradient-text">{planLabel}</div>
                                <p className="text-sm text-muted-foreground">
                                    {plan === 'none' ? 'No active subscription' : 'Active subscription'}
                                </p>
                            </div>
                            {plan === 'none' ? (
                                <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">
                                    <Link href="/dashboard/credits">Subscribe</Link>
                                </Button>
                            ) : (
                                <ManageSubscriptionButton />
                            )}
                        </div>
                    </div>

                    {plan !== 'none' && (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Scans this month</span>
                                <span className="text-white font-medium">{scansUsed} / {scansLimit}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${scansLimit > 0 ? Math.min((scansUsed / scansLimit) * 100, 100) : 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Domains</span>
                                <span className="text-white font-medium">{allowedDomains.length} / {domainsLimit}</span>
                            </div>
                            {periodStart && (
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Billing period start</span>
                                    <span className="text-white font-medium">{new Date(periodStart).toLocaleDateString()}</span>
                                </div>
                            )}
                            <p className="text-muted-foreground pt-2">Total scans run: <strong>{scanCount || 0}</strong></p>
                        </div>
                    )}

                    {plan === 'none' && (
                        <div className="text-sm text-muted-foreground">
                            <p>Total scans run: <strong>{scanCount || 0}</strong></p>
                            <p className="mt-1">Subscribe to a plan to start scanning.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Registered Domains */}
            {allowedDomains.length > 0 && (
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-blue-400" />
                            <div>
                                <CardTitle className="text-white">Registered Domains</CardTitle>
                                <CardDescription className="text-zinc-400">Domains you can scan with your current plan</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {allowedDomains.map((domain) => (
                                <div key={domain} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                                    <Globe className="h-4 w-4 text-zinc-400" />
                                    <span className="text-sm text-white font-mono">{domain}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                            <Button variant="outline" size="sm" disabled title="Coming soon" className="opacity-50 cursor-not-allowed bg-white/5 border-white/10">Change</Button>
                        </div>
                        <Separator className="bg-white/10" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-red-400">Delete account</p>
                                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                            </div>
                            <Button variant="destructive" size="sm" disabled title="Coming soon" className="opacity-50 cursor-not-allowed">Delete</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
