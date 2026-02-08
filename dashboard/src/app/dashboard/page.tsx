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
    TrendingUp,
    Clock,
    AlertTriangle,
} from 'lucide-react';

// Placeholder data - would come from Supabase
const stats = [
    { label: 'Total Scans', value: '12', change: '+3 this month', icon: Search, color: 'purple' },
    { label: 'Security Issues', value: '5', change: '2 critical', icon: Shield, alert: true, color: 'red' },
    { label: 'Leaked Keys Found', value: '1', change: 'AWS key detected', icon: Key, alert: true, color: 'amber' },
    { label: 'SEO Score Avg', value: '76', change: '+12 improvement', icon: TrendingUp, color: 'green' },
];

const recentScans = [
    {
        id: '1',
        url: 'myapp.vercel.app',
        status: 'completed',
        score: 72,
        scannedAt: '2 hours ago',
        issues: { critical: 1, high: 2, medium: 5 },
    },
    {
        id: '2',
        url: 'startup-landing.com',
        status: 'completed',
        score: 85,
        scannedAt: '1 day ago',
        issues: { critical: 0, high: 1, medium: 3 },
    },
    {
        id: '3',
        url: 'side-project.dev',
        status: 'running',
        score: null,
        scannedAt: 'Just now',
        issues: null,
    },
];

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

// Animated score ring component
function ScoreRing({ score }: { score: number }) {
    const circumference = 2 * Math.PI * 20;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="relative h-12 w-12 flex items-center justify-center">
            <svg className="absolute h-12 w-12 -rotate-90" viewBox="0 0 44 44">
                <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-white/10"
                />
                <circle
                    cx="22"
                    cy="22"
                    r="20"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${getScoreRingColor(score)} transition-all duration-1000`}
                    style={{
                        animation: 'score-fill 1s ease-out forwards',
                    }}
                />
            </svg>
            <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
    );
}

export default function DashboardPage() {
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
                <Button asChild className="shimmer-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0">
                    <Link href="/dashboard/scans/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Scan
                    </Link>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-children">
                {stats.map((stat, index) => (
                    <Card
                        key={stat.label}
                        className="glass-card border-white/5 hover-lift group"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <div className="relative">
                                <stat.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${stat.alert ? 'text-orange-400' : `text-${stat.color}-400`
                                    }`} />
                                {stat.alert && (
                                    <div className="absolute inset-0 bg-orange-500/30 blur-xl" />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                            <p className={`text-sm mt-1 ${stat.alert ? 'text-orange-400' : 'text-muted-foreground'}`}>
                                {stat.change}
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
                    <Button variant="ghost" size="sm" asChild className="hover:bg-white/5">
                        <Link href="/dashboard/scans">
                            View all
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentScans.map((scan, index) => (
                            <div
                                key={scan.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-200 animate-fade-in-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
                                        {scan.status === 'running' ? (
                                            <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <ScoreRing score={scan.score!} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{scan.url}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {scan.scannedAt}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {scan.status === 'completed' && scan.issues && (
                                        <div className="flex gap-2">
                                            {scan.issues.critical > 0 && (
                                                <Badge variant="destructive" className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {scan.issues.critical}
                                                </Badge>
                                            )}
                                            {scan.issues.high > 0 && (
                                                <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                    {scan.issues.high} high
                                                </Badge>
                                            )}
                                            {scan.issues.medium > 0 && (
                                                <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-white/10">
                                                    {scan.issues.medium} medium
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {scan.status === 'running' && (
                                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
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
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 stagger-children">
                <Card className="glass-card border-purple-500/20 hover-lift group" style={{ animationDelay: '0ms' }}>
                    <CardContent className="pt-6">
                        <div className="relative inline-block mb-4">
                            <Shield className="h-10 w-10 text-purple-400 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Security Deep Dive</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Run a comprehensive security audit on your website
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20">
                            <Link href="/dashboard/scans/new?type=security">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card border-amber-500/20 hover-lift group" style={{ animationDelay: '100ms' }}>
                    <CardContent className="pt-6">
                        <div className="relative inline-block mb-4">
                            <Key className="h-10 w-10 text-amber-400 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-amber-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">API Key Check</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Scan for exposed API keys and credentials
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20">
                            <Link href="/dashboard/scans/new?type=api_keys">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card border-green-500/20 hover-lift group" style={{ animationDelay: '200ms' }}>
                    <CardContent className="pt-6">
                        <div className="relative inline-block mb-4">
                            <Search className="h-10 w-10 text-green-400 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-green-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">SEO Analysis</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Check your site&apos;s SEO health and get recommendations
                        </p>
                        <Button variant="secondary" size="sm" asChild className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20">
                            <Link href="/dashboard/scans/new?type=seo">Start Scan</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
