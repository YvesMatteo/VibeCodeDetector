import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Key,
    Search,
    Plus,
    ArrowRight,
    Clock,
    AlertTriangle,
    Crown,
    Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function getScoreRingColor(score: number) {
    if (score >= 80) return 'stroke-green-500';
    if (score >= 60) return 'stroke-amber-500';
    if (score >= 40) return 'stroke-orange-500';
    return 'stroke-red-500';
}

function ScoreRing({ score }: { score: number }) {
    const circumference = 2 * Math.PI * 20;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="relative h-12 w-12 flex items-center justify-center">
            <svg className="absolute h-12 w-12 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                <circle cx="22" cy="22" r="20" fill="none" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${getScoreRingColor(score)} transition-all duration-1000`} />
            </svg>
            <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
    );
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

    let plan = 'none';
    let planScansUsed = 0;
    let planScansLimit = 0;
    let domainsUsed = 0;
    let domainsLimit = 0;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, plan_scans_used, plan_scans_limit, plan_domains, allowed_domains')
            .eq('id', user.id)
            .single();
        if (profile) {
            plan = profile.plan || 'none';
            planScansUsed = profile.plan_scans_used || 0;
            planScansLimit = profile.plan_scans_limit || 0;
            domainsUsed = profile.allowed_domains?.length || 0;
            domainsLimit = profile.plan_domains || 0;
        }
    }

    // Fetch real scans
    const { data: scans } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

    const scanList = scans || [];
    const recentScans = scanList.slice(0, 5);
    const completedScans = scanList.filter(s => s.status === 'completed');

    // Compute real stats
    const avgScore = completedScans.length > 0
        ? Math.round(completedScans.reduce((sum, s) => sum + (s.overall_score || 0), 0) / completedScans.length)
        : 0;

    let totalIssues = 0;
    let criticalCount = 0;
    let highCount = 0;
    completedScans.forEach(scan => {
        const results = scan.results as Record<string, any> | null;
        if (results) {
            Object.values(results).forEach((r: any) => {
                if (r.findings && Array.isArray(r.findings)) {
                    totalIssues += r.findings.length;
                    r.findings.forEach((f: any) => {
                        if (f.severity === 'critical') criticalCount++;
                        if (f.severity === 'high') highCount++;
                    });
                }
            });
        }
    });

    const planLabel = plan === 'none' ? 'No Plan' : plan.charAt(0).toUpperCase() + plan.slice(1);

    const displayStats = [
        {
            label: 'Current Plan',
            value: planLabel,
            sub: plan === 'none' ? 'Subscribe to start scanning' : 'Active subscription',
            icon: Crown,
            color: 'blue',
            href: '/dashboard/credits',
        },
        {
            label: 'Scans This Month',
            value: plan === 'none' ? '—' : `${planScansUsed}/${planScansLimit}`,
            sub: plan === 'none' ? 'No active plan' : `${planScansLimit - planScansUsed} remaining`,
            icon: Activity,
            color: 'purple',
        },
        {
            label: 'Domains',
            value: plan === 'none' ? '—' : `${domainsUsed}/${domainsLimit}`,
            sub: plan === 'none' ? 'No active plan' : `${domainsLimit - domainsUsed} slot${domainsLimit - domainsUsed !== 1 ? 's' : ''} available`,
            icon: Globe,
            color: 'green',
        },
        {
            label: 'Issues Found',
            value: totalIssues.toString(),
            sub: criticalCount > 0 || highCount > 0 ? `${criticalCount} critical, ${highCount} high` : 'No critical issues',
            icon: Shield,
            color: criticalCount > 0 ? 'red' : 'green',
            alert: criticalCount > 0,
        },
    ];

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Overview of your website security and performance
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
                        <Link href="/dashboard/credits">
                            <Crown className="mr-2 h-4 w-4" />
                            {plan === 'none' ? 'Subscribe' : 'Upgrade'}
                        </Link>
                    </Button>
                    <Button asChild className="bg-white text-black hover:bg-zinc-200 border-0 font-medium shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                        <Link href="/dashboard/scans/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Scan
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-children">
                {displayStats.map((stat, index) => (
                    <Card
                        key={stat.label}
                        className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-colors"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {stat.href && (
                            <Link href={stat.href} className="absolute inset-0 z-10" />
                        )}
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">
                                {stat.label}
                            </CardTitle>
                            <div className={`p-2 rounded-lg bg-white/5 ${stat.alert ? 'text-orange-400' : `text-${stat.color}-400`}`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className={`text-xs mt-1 ${stat.alert ? 'text-orange-400' : 'text-zinc-500'}`}>
                                {stat.sub}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Scans */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                    <div>
                        <CardTitle className="font-heading text-xl font-medium text-white">Recent Scans</CardTitle>
                        <CardDescription className="text-zinc-400">Your latest website scans and their results</CardDescription>
                    </div>
                    {scanList.length > 0 && (
                        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-white hover:bg-white/5">
                            <Link href="/dashboard/scans">
                                View all
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {recentScans.length === 0 ? (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No scans yet</p>
                            <p className="text-muted-foreground mb-6">Run your first scan to see results here</p>
                            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">
                                <Link href="/dashboard/scans/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Start Your First Scan
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentScans.map((scan, index) => {
                                const results = scan.results as Record<string, any> | null;
                                let scanCritical = 0;
                                let scanHigh = 0;
                                let scanMedium = 0;
                                if (results) {
                                    Object.values(results).forEach((r: any) => {
                                        if (r.findings && Array.isArray(r.findings)) {
                                            r.findings.forEach((f: any) => {
                                                if (f.severity === 'critical') scanCritical++;
                                                else if (f.severity === 'high') scanHigh++;
                                                else if (f.severity === 'medium') scanMedium++;
                                            });
                                        }
                                    });
                                }

                                return (
                                    <div
                                        key={scan.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-200 animate-fade-in-up"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
                                                {scan.status !== 'completed' ? (
                                                    <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <ScoreRing score={scan.overall_score || 0} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{scan.url.replace(/^https?:\/\//, '')}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(scan.completed_at || scan.created_at)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {scan.status === 'completed' && (
                                                <div className="flex gap-2">
                                                    {scanCritical > 0 && (
                                                        <Badge variant="destructive" className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {scanCritical}
                                                        </Badge>
                                                    )}
                                                    {scanHigh > 0 && (
                                                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                            {scanHigh} high
                                                        </Badge>
                                                    )}
                                                    {scanCritical === 0 && scanHigh === 0 && (
                                                        <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-white/10">
                                                            {scanMedium} medium
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {scan.status !== 'completed' && (
                                                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                    Scanning...
                                                </Badge>
                                            )}

                                            <Button variant="ghost" size="sm" asChild className="hover:bg-white/5">
                                                <Link href={`/dashboard/scans/${scan.id}`}>
                                                    View
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 stagger-children">
                <Card className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-colors group" style={{ animationDelay: '0ms' }}>
                    <CardContent className="pt-6">
                        <div className="p-3 rounded-lg bg-blue-500/10 w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Shield className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="font-heading font-medium text-lg text-white mb-2">Security Deep Dive</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Run a comprehensive security audit on your website
                        </p>
                        <Button variant="outline" size="sm" asChild className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-colors group" style={{ animationDelay: '100ms' }}>
                    <CardContent className="pt-6">
                        <div className="p-3 rounded-lg bg-amber-500/10 w-fit mb-4 group-hover:bg-amber-500/20 transition-colors">
                            <Key className="h-6 w-6 text-amber-400" />
                        </div>
                        <h3 className="font-heading font-medium text-lg text-white mb-2">API Key Check</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Scan for exposed API keys and credentials
                        </p>
                        <Button variant="outline" size="sm" asChild className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-white/5 hover:border-white/10 transition-colors group" style={{ animationDelay: '200ms' }}>
                    <CardContent className="pt-6">
                        <div className="p-3 rounded-lg bg-green-500/10 w-fit mb-4 group-hover:bg-green-500/20 transition-colors">
                            <Search className="h-6 w-6 text-green-400" />
                        </div>
                        <h3 className="font-heading font-medium text-lg text-white mb-2">SEO Analysis</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Check your site&apos;s SEO health and get recommendations
                        </p>
                        <Button variant="outline" size="sm" asChild className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
