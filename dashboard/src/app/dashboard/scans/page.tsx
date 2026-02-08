import Link from 'next/link';
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
    const { data: scans } = await supabase
        .from('scans')
        .select('*')
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
                    totalFindings += r.findings.length;
                    r.findings.forEach((f: any) => {
                        if (f.severity === 'critical') criticalCount++;
                        if (f.severity === 'high') highCount++;
                    });
                }
            });
        }
    });

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Scans</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage all your website scans
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/scans/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Scan
                    </Link>
                </Button>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Scans</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{scanList.length}</div>
                        <p className="text-sm text-muted-foreground">{completedScans.length} completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Average Score</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${avgScore > 0 ? getScoreColor(avgScore) : ''}`}>
                            {avgScore > 0 ? avgScore : '—'}
                        </div>
                        <p className="text-sm text-muted-foreground">across {completedScans.length} scan{completedScans.length !== 1 ? 's' : ''}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Issues Found</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalFindings}</div>
                        <p className="text-sm text-muted-foreground">
                            {criticalCount} critical, {highCount} high
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Scans Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Scans</CardTitle>
                    <CardDescription>Complete history of all your website scans</CardDescription>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Website</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Issues</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
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
                                                scanFindings += r.findings.length;
                                                r.findings.forEach((f: any) => {
                                                    if (f.severity === 'critical') scanCritical++;
                                                    if (f.severity === 'high') scanHigh++;
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
                                                    <span className={`text-xl font-bold ${getScoreColor(scan.overall_score || 0)}`}>
                                                        {scan.overall_score ?? '—'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
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
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(scan.completed_at || scan.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/dashboard/scans/${scan.id}`}>View Details</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
