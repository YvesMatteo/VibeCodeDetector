import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ExternalLink, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default async function ScansPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: scans } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const scanList = scans || [];

    // Compute stats from real data
    const completedScans = scanList.filter(s => s.status === 'completed');
    const avgScore = completedScans.length > 0
        ? Math.round(completedScans.reduce((sum, s) => sum + (s.overall_score || 0), 0) / completedScans.length)
        : 0;

    let totalFindings = 0;
    let criticalCount = 0;
    let highCount = 0;
    completedScans.forEach(scan => {
        const results = scan.results as Record<string, any> | null;
        if (results) {
            Object.values(results).forEach((r: any) => {
                if (r.findings && Array.isArray(r.findings)) {
                    r.findings.forEach((f: any) => {
                        const sev = f.severity?.toLowerCase();
                        if (sev === 'info') return;
                        totalFindings++;
                        if (sev === 'critical') criticalCount++;
                        if (sev === 'high') highCount++;
                    });
                }
            });
        }
    });

    return (
        <div className="p-4 md:p-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Scans</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        View and manage all your website scans
                    </p>
                </div>
                <Button asChild size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium h-8 text-xs">
                    <Link href="/dashboard/scans/new">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        New Scan
                    </Link>
                </Button>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Total Scans</p>
                        <p className="text-2xl font-semibold text-white">{scanList.length}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{completedScans.length} completed</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Average Score</p>
                        <p className={`text-2xl font-semibold ${avgScore > 0 ? getScoreColor(avgScore) : 'text-zinc-600'}`}>
                            {avgScore > 0 ? avgScore : '---'}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">across {completedScans.length} scan{completedScans.length !== 1 ? 's' : ''}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                        <p className="text-xs text-zinc-600 mb-1">Issues Found</p>
                        <p className="text-2xl font-semibold text-white">{totalFindings}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{criticalCount} critical, {highCount} high</p>
                    </CardContent>
                </Card>
            </div>

            {/* Scans Table */}
            <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="border-b border-white/[0.06] pb-4">
                    <CardTitle className="text-sm font-medium text-white">All Scans</CardTitle>
                </CardHeader>
                <CardContent>
                    {scanList.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-lg mb-2">No scans yet</p>
                            <p className="text-sm mb-4">Run your first scan to see results here</p>
                            <Button asChild>
                                <Link href="/dashboard/scans/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Scan
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Website</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead className="hidden sm:table-cell">Issues</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scanList.map((scan) => {
                                    const results = scan.results as Record<string, any> | null;
                                    let scanFindings = 0;
                                    let scanCritical = 0;
                                    let scanHigh = 0;
                                    if (results) {
                                        Object.values(results).forEach((r: any) => {
                                            if (r.findings && Array.isArray(r.findings)) {
                                                r.findings.forEach((f: any) => {
                                                    const sev = f.severity?.toLowerCase();
                                                    if (sev === 'info') return;
                                                    scanFindings++;
                                                    if (sev === 'critical') scanCritical++;
                                                    if (sev === 'high') scanHigh++;
                                                });
                                            }
                                        });
                                    }

                                    return (
                                        <TableRow key={scan.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {scan.url.replace(/^https?:\/\//, '')}
                                                    </span>
                                                    <a
                                                        href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {scan.status === 'running' || scan.status === 'pending' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        <span className="text-muted-foreground">Scanning</span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-lg font-semibold tabular-nums ${getScoreColor(scan.overall_score || 0)}`}>
                                                        {scan.overall_score ?? '—'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {scan.status === 'completed' ? (
                                                    <div className="flex gap-1.5">
                                                        {scanCritical > 0 && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                {scanCritical} critical
                                                            </Badge>
                                                        )}
                                                        {scanHigh > 0 && (
                                                            <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500">
                                                                {scanHigh} high
                                                            </Badge>
                                                        )}
                                                        {scanCritical === 0 && scanHigh === 0 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {scanFindings} issues
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs capitalize">
                                                    {scan.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(scan.completed_at || scan.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild className="min-h-[44px] min-w-[44px]">
                                                    <Link href={`/dashboard/scans/${scan.id}`}>View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
