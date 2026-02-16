import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ExternalLink,
    Settings,
    History,
    Download,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { processAuditData, getMissingScannerNames } from '@/lib/audit-data';
import { AuditReportWithDismissals } from '@/components/dashboard/audit-report-with-dismissals';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { computeScanDiff } from '@/lib/scan-diff';
import type { Dismissal } from '@/lib/dismissals';

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
    const userPlan = (profile as any)?.plan || 'none';

    const { data: project, error: projectError } = await supabase
        .from('projects' as any)
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (projectError || !project) {
        return notFound();
    }

    const p = project as any;

    // Get latest 2 completed scans (current + previous for diff)
    const { data: recentScans } = await supabase
        .from('scans')
        .select('*')
        .eq('project_id', params.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(2);

    const latestScan = recentScans?.[0] ?? null;
    const previousScan = recentScans?.[1] ?? null;

    // Fetch dismissed findings for this project
    const { data: dismissalsRaw } = await supabase
        .from('dismissed_findings' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false });

    const dismissals = (dismissalsRaw || []) as Dismissal[];

    // For scan-scoped dismissals, filter to only the current scan
    const activeDismissals = dismissals.filter(d =>
        d.scope === 'project' || d.scan_id === latestScan?.id
    );

    const hostname = (() => {
        try { return new URL(p.url).hostname; } catch { return p.url; }
    })();

    const auditData = latestScan ? processAuditData(latestScan.results as Record<string, any>) : null;
    const missingScanners = latestScan
        ? getMissingScannerNames(latestScan.results as Record<string, unknown>)
        : [];
    const scanDiff = (latestScan && previousScan)
        ? computeScanDiff(latestScan.results as Record<string, any>, previousScan.results as Record<string, any>)
        : null;
    const previousScanDate = previousScan?.completed_at ?? previousScan?.created_at ?? null;

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Projects
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={p.favicon_url || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                            alt=""
                            className="h-10 w-10 rounded-lg object-contain mt-0.5 shrink-0"
                        />
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                                    {p.name}
                                </h1>
                                <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </a>
                            </div>
                            <p className="text-sm text-zinc-500">{hostname}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
                        <RunAuditButton projectId={params.id} />
                        <Link
                            href={`/dashboard/projects/${params.id}/history`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <History className="h-4 w-4" />
                            History
                        </Link>
                        <Link
                            href={`/dashboard/projects/${params.id}/settings`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            {!latestScan ? (
                <div className="text-center py-20">
                    <h2 className="text-lg font-medium text-white mb-2">No audits yet</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                        Run your first audit to see security findings for this project.
                    </p>
                    <RunAuditButton projectId={params.id} size="lg" />
                </div>
            ) : (
                <>
                    {/* Action bar for latest audit */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <AIFixPrompt url={p.url} findings={auditData!.allFindings} techStack={auditData!.techStack} />
                        <Button variant="outline" asChild className="bg-white/5 border-white/10">
                            <a href={`/api/scan/${latestScan.id}/export`} download>
                                <Download className="mr-2 h-4 w-4" />
                                Export .md
                            </a>
                        </Button>
                    </div>

                    {missingScanners.length > 0 && (
                        <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-400">Outdated scan results</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {missingScanners.length} new scanner{missingScanners.length > 1 ? 's' : ''} added since this audit:{' '}
                                    <span className="text-zinc-300">{missingScanners.join(', ')}</span>.
                                    Re-run the audit to get full coverage.
                                </p>
                            </div>
                            <div className="shrink-0">
                                <RunAuditButton projectId={params.id} size="sm" />
                            </div>
                        </div>
                    )}

                    <AuditReportWithDismissals
                        data={auditData!}
                        diff={scanDiff}
                        previousScanDate={previousScanDate}
                        projectId={params.id}
                        scanId={latestScan.id}
                        initialDismissals={activeDismissals}
                        userPlan={userPlan}
                    />
                </>
            )}
        </div>
    );
}
