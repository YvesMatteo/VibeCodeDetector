import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ScansTable } from '@/components/dashboard/scans-table';

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
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">Scans</h1>
                    <p className="text-zinc-400 mt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card className="bg-slate-900/50 border-slate-700/20">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Scans</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold tabular-nums text-white">{scanList.length}</span>
                            <span className="text-xs text-zinc-500">{completedScans.length} completed</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/20">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Issues Found</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold tabular-nums text-white">{totalFindings}</span>
                            {(criticalCount > 0 || highCount > 0) && (
                                <span className="text-xs text-zinc-500">{criticalCount} critical, {highCount} high</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-700/20">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Avg per Scan</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-semibold tabular-nums text-white">
                                {completedScans.length > 0 ? Math.round(totalFindings / completedScans.length) : '—'}
                            </span>
                            <span className="text-xs text-zinc-500">issues / scan</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Scans Table */}
            <Card className="bg-slate-900/50 border-slate-700/20">
                <CardHeader className="border-b border-slate-700/20 pb-4">
                    <CardTitle className="font-heading text-xl font-medium text-white">All Scans</CardTitle>
                    <CardDescription className="text-zinc-400">Complete history of all your website scans</CardDescription>
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
                        <ScansTable scans={scanList} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
