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
    CreditCard,
    BarChart3,
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

    let credits = 0;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();
        if (profile) credits = profile.credits;
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

    const displayStats = [
        {
            label: 'Credits Available',
            value: credits.toString(),
            sub: credits === 0 ? 'Buy credits to scan' : `${credits} scan${credits !== 1 ? 's' : ''} remaining`,
            icon: CreditCard,
            color: 'blue',
            href: '/dashboard/credits',
        },
        {
            label: 'Total Scans',
            value: scanList.length.toString(),
            sub: `${completedScans.length} completed`,
            icon: Activity,
            color: 'purple',
        },
        {
            label: 'Average Score',
            value: avgScore > 0 ? avgScore.toString() : '—',
            sub: completedScans.length > 0 ? `across ${completedScans.length} scan${completedScans.length !== 1 ? 's' : ''}` : 'No scans yet',
            icon: BarChart3,
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
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold">
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Overview of your website security and performance
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                        <Link href="/dashboard/credits">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Buy Credits
                        </Link>
                    </Button>
                    <Button asChild className="shimmer-button bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0">
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
                        className="glass-card border-white/5 hover-lift group relative overflow-hidden"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {stat.href && (
                            <Link href={stat.href} className="absolute inset-0 z-10" />
                        )}
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className="relative">
                                <stat.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${stat.alert ? 'text-orange-400' : `text-${stat.color}-400`}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                            <p className={`text-sm mt-1 ${stat.alert ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                {stat.sub}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Scans */}
            <Card className="glass-card border-white/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Scans</CardTitle>
                        <CardDescription>Your latest website scans and their results</CardDescription>
                    </div>
                    {scanList.length > 0 && (
                        <Button variant="ghost" size="sm" asChild className="hover:bg-white/5">
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
                <Card className="glass-card border-blue-500/20 hover-lift group" style={{ animationDelay: '0ms' }}>
                    <CardContent className="pt-6">
                        <Shield className="h-10 w-10 text-blue-400 mb-4 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold text-lg mb-2">Security Deep Dive</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Run a comprehensive security audit on your website
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card border-amber-500/20 hover-lift group" style={{ animationDelay: '100ms' }}>
                    <CardContent className="pt-6">
                        <Key className="h-10 w-10 text-amber-400 mb-4 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold text-lg mb-2">API Key Check</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Scan for exposed API keys and credentials
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card border-green-500/20 hover-lift group" style={{ animationDelay: '200ms' }}>
                    <CardContent className="pt-6">
                        <Search className="h-10 w-10 text-green-400 mb-4 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold text-lg mb-2">SEO Analysis</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Check your site&apos;s SEO health and get recommendations
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20">
                            <Link href="/dashboard/scans/new">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
