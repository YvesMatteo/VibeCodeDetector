import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Crown,
    Activity,
    Globe,
    ArrowRight,
    Clock,
    BarChart3,
    User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function timeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    let plan = 'none';
    let planScansUsed = 0;
    let planScansLimit = 0;
    let domainsUsed = 0;
    let domainsLimit = 0;
    let allowedDomains: string[] = [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_scans_used, plan_scans_limit, plan_domains, allowed_domains')
        .eq('id', user.id)
        .single();
    if (profile) {
        plan = profile.plan || 'none';
        planScansUsed = profile.plan_scans_used || 0;
        planScansLimit = profile.plan_scans_limit || 0;
        allowedDomains = profile.allowed_domains || [];
        domainsUsed = allowedDomains.length;
        domainsLimit = profile.plan_domains || 0;
    }

    // Lifetime scan count
    const { count: lifetimeScans } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    // Completed scans for avg score
    const { data: completedScans } = await supabase
        .from('scans')
        .select('overall_score')
        .eq('user_id', user.id)
        .eq('status', 'completed');

    const avgScore = completedScans && completedScans.length > 0
        ? Math.round(completedScans.reduce((sum, s) => sum + (s.overall_score || 0), 0) / completedScans.length)
        : 0;

    // Recent 3 scans for activity feed
    const { data: recentScans } = await supabase
        .from('scans')
        .select('id, url, status, overall_score, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

    const planLabel = plan === 'none' ? 'No Plan' : plan.charAt(0).toUpperCase() + plan.slice(1);
    const scansRemaining = Math.max(0, planScansLimit - planScansUsed);
    const domainsRemaining = Math.max(0, domainsLimit - domainsUsed);
    const scansPct = planScansLimit > 0 ? Math.min((planScansUsed / planScansLimit) * 100, 100) : 0;
    const domainsPct = domainsLimit > 0 ? Math.min((domainsUsed / domainsLimit) * 100, 100) : 0;

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Manage your account and subscription
                    </p>
                </div>
                {plan !== 'enterprise' && (
                    <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
                        <Link href="/dashboard/credits">
                            <Crown className="mr-2 h-4 w-4" />
                            {plan === 'none' ? 'Subscribe' : 'Upgrade Plan'}
                        </Link>
                    </Button>
                )}
            </div>

            {/* Account Card */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-blue-400" />
                        <div>
                            <CardTitle className="text-white">Account</CardTitle>
                            <CardDescription className="text-zinc-400">{user.email}</CardDescription>
                        </div>
                    </div>
                    <Badge
                        variant={plan === 'none' ? 'secondary' : 'default'}
                        className={plan === 'none'
                            ? 'bg-zinc-700/50 text-zinc-300'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}
                    >
                        {planLabel}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                        <span>Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        {plan !== 'none' && (
                            <Link href="/dashboard/settings" className="text-blue-400 hover:text-blue-300 transition-colors">
                                Manage subscription
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Usage Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Scans Usage */}
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-purple-400" />
                            <CardTitle className="text-white text-base">Scans This Month</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {plan === 'none' ? (
                            <p className="text-sm text-zinc-500">Subscribe to start scanning</p>
                        ) : (
                            <>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-zinc-400">{planScansUsed} / {planScansLimit} used</span>
                                    <span className="text-zinc-300 font-medium">{scansRemaining} remaining</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${scansPct}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Domains Usage */}
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-green-400" />
                            <CardTitle className="text-white text-base">Domains</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {plan === 'none' ? (
                            <p className="text-sm text-zinc-500">Subscribe to register domains</p>
                        ) : (
                            <>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-zinc-400">{domainsUsed} / {domainsLimit} used</span>
                                    <span className="text-zinc-300 font-medium">{domainsRemaining} slot{domainsRemaining !== 1 ? 's' : ''} available</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${domainsPct}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Registered Domains */}
            {allowedDomains.length > 0 && (
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-blue-400" />
                            <div>
                                <CardTitle className="text-white text-base">Registered Domains</CardTitle>
                                <CardDescription className="text-zinc-500 text-xs">Domains register automatically when scanned</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {allowedDomains.map((domain) => (
                                <div key={domain} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5">
                                    <Globe className="h-3.5 w-3.5 text-zinc-500" />
                                    <span className="text-sm text-white font-mono">{domain}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                                <BarChart3 className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{lifetimeScans || 0}</p>
                                <p className="text-xs text-zinc-500">Lifetime scans</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                                <Activity className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${avgScore > 0 ? getScoreColor(avgScore) : 'text-zinc-500'}`}>
                                    {avgScore > 0 ? avgScore : '—'}
                                </p>
                                <p className="text-xs text-zinc-500">Average score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-white text-base">Recent Activity</CardTitle>
                    {recentScans && recentScans.length > 0 && (
                        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-white hover:bg-white/5">
                            <Link href="/dashboard/scans">
                                View all scans
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!recentScans || recentScans.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-500 text-sm">No scans yet</p>
                            <Button asChild size="sm" className="mt-3 bg-white text-black hover:bg-zinc-200 border-0">
                                <Link href="/dashboard/scans/new">Run your first scan</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentScans.map((scan) => (
                                <Link
                                    key={scan.id}
                                    href={`/dashboard/scans/${scan.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Globe className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span className="text-sm text-white truncate">{scan.url.replace(/^https?:\/\//, '')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {scan.status === 'completed' && scan.overall_score != null && (
                                            <span className={`text-sm font-bold ${getScoreColor(scan.overall_score)}`}>
                                                {scan.overall_score}
                                            </span>
                                        )}
                                        {scan.status !== 'completed' && (
                                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                                                Scanning
                                            </Badge>
                                        )}
                                        <span className="text-xs text-zinc-600 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {timeAgo(scan.completed_at || scan.created_at)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
