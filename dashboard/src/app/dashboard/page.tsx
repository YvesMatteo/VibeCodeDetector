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
    if (score >= 80) return 'text-emerald-400';
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
        <div className="p-4 md:p-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Overview of your account and recent activity
                    </p>
                </div>
                {plan !== 'enterprise' && (
                    <Button asChild variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 h-8 text-xs">
                        <Link href="/dashboard/credits">
                            <Crown className="mr-1.5 h-3.5 w-3.5" />
                            {plan === 'none' ? 'Subscribe' : 'Upgrade'}
                        </Link>
                    </Button>
                )}
            </div>

            {/* Account Card */}
            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-white text-sm font-medium truncate">{user.email}</CardTitle>
                            <CardDescription className="text-zinc-600 text-xs">
                                Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </CardDescription>
                        </div>
                    </div>
                    <Badge
                        variant="secondary"
                        className={`shrink-0 ${plan === 'none'
                            ? 'bg-zinc-800 text-zinc-500 border-0 text-[11px]'
                            : 'bg-white/[0.06] text-zinc-300 border-0 text-[11px]'}`}
                    >
                        {planLabel}
                    </Badge>
                </CardHeader>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Scans this month</p>
                        <p className="text-xl font-semibold text-white">{planScansUsed}<span className="text-zinc-600 text-sm font-normal">/{planScansLimit || '0'}</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Domains</p>
                        <p className="text-xl font-semibold text-white">{domainsUsed}<span className="text-zinc-600 text-sm font-normal">/{domainsLimit || '0'}</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Lifetime scans</p>
                        <p className="text-xl font-semibold text-white">{lifetimeScans || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Avg score</p>
                        <p className={`text-xl font-semibold ${avgScore > 0 ? getScoreColor(avgScore) : 'text-zinc-600'}`}>
                            {avgScore > 0 ? avgScore : '---'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Usage Bars */}
            {plan !== 'none' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    <Card className="bg-white/[0.02] border-white/[0.06]">
                        <CardContent className="p-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-zinc-500">Scans used</span>
                                <span className="text-zinc-400">{scansRemaining} remaining</span>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                                <div
                                    className="bg-white h-1.5 rounded-full transition-all"
                                    style={{ width: `${scansPct}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/[0.06]">
                        <CardContent className="p-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-zinc-500">Domains registered</span>
                                <span className="text-zinc-400">{domainsRemaining} available</span>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                                <div
                                    className="bg-white h-1.5 rounded-full transition-all"
                                    style={{ width: `${domainsPct}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Registered Domains */}
            {allowedDomains.length > 0 && (
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm font-medium">Registered Domains</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {allowedDomains.map((domain) => (
                                <span key={domain} className="text-xs text-zinc-400 font-mono px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                                    {domain}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity */}
            <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-white text-sm font-medium">Recent Activity</CardTitle>
                    {recentScans && recentScans.length > 0 && (
                        <Button variant="ghost" size="sm" asChild className="text-zinc-500 hover:text-white h-7 text-xs">
                            <Link href="/dashboard/scans">
                                View all
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!recentScans || recentScans.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-600 text-sm mb-3">No scans yet</p>
                            <Button asChild size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 h-8 text-xs">
                                <Link href="/dashboard/scans/new">Run your first scan</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {recentScans.map((scan) => (
                                <Link
                                    key={scan.id}
                                    href={`/dashboard/scans/${scan.id}`}
                                    className="flex items-center justify-between p-3 -mx-1 rounded-md hover:bg-white/[0.03] transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Globe className="h-4 w-4 text-zinc-600 shrink-0" />
                                        <span className="text-sm text-zinc-300 truncate">{scan.url.replace(/^https?:\/\//, '')}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {scan.status === 'completed' && scan.overall_score != null && (
                                            <span className={`text-sm font-semibold tabular-nums ${getScoreColor(scan.overall_score)}`}>
                                                {scan.overall_score}
                                            </span>
                                        )}
                                        {scan.status !== 'completed' && (
                                            <span className="text-xs text-zinc-500">Scanning...</span>
                                        )}
                                        <span className="text-xs text-zinc-700">
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
