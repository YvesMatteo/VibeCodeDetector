import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ExternalLink,
    Settings,
    History,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { processAuditData, getMissingScannerNames } from '@/lib/audit-data';
import { AuditReportWithDismissals } from '@/components/dashboard/audit-report-with-dismissals';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { ExportButton } from '@/components/dashboard/export-button';
import { ShareButton } from '@/components/dashboard/share-button';
import { computeScanDiff } from '@/lib/scan-diff';
import type { Dismissal } from '@/lib/dismissals';
import { PageHeader } from '@/components/dashboard/page-header';

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
    const userPlan = profile?.plan || 'none';

    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (projectError || !project) {
        return notFound();
    }

    const p = project;

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
        .from('dismissed_findings')
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
        <div>
            {/* Header */}
            <PageHeader
                title={
                    <div className="flex flex-col gap-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
                        >
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                            Back to Projects
                        </Link>
                        <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={p.favicon_url || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                                alt=""
                                className="h-8 w-8 rounded-md object-contain shrink-0 bg-white p-0.5 shadow-sm"
                            />
                            <span className="text-2xl font-semibold tracking-tight text-white">{p.name}</span>
                            <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-white transition-colors shrink-0 ml-1"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                }
                description={
                    <div className="mt-1">
                        <span className="text-sm text-zinc-400">{hostname}</span>
                    </div>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`/dashboard/projects/${params.id}/history`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg border border-transparent hover:border-white/[0.06] transition-all"
                        >
                            <History className="h-3.5 w-3.5" />
                            History
                        </Link>
                        <Link
                            href={`/dashboard/projects/${params.id}/settings`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg border border-transparent hover:border-white/[0.06] transition-all"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            Settings
                        </Link>
                        <div className="w-px h-4 bg-white/[0.1] mx-1" />
                        <RunAuditButton projectId={params.id} size="sm" />
                    </div>
                }
            >
                {latestScan && (
                    <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/[0.04]">
                        <AIFixPrompt url={p.url} findings={auditData!.allFindings} techStack={auditData!.techStack} userPlan={userPlan} />
                        <ExportButton scanId={latestScan.id} userPlan={userPlan} />
                        {userPlan !== 'none' && <ShareButton scanId={latestScan.id} initialPublicId={latestScan.public_id} />}
                    </div>
                )}
            </PageHeader>

            {/* Content */}
            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                {!latestScan ? (
                    <div className="text-center py-20 border border-white/[0.04] border-dashed rounded-xl bg-white/[0.01]">
                        <h2 className="text-sm font-medium text-white mb-1.5">No audits yet</h2>
                        <p className="text-zinc-500 text-[13px] mb-6">
                            Run your first audit to see security findings for this project.
                        </p>
                        <RunAuditButton projectId={params.id} size="sm" />
                    </div>
                ) : (
                    <>
                        {missingScanners.length > 0 && (
                            <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-amber-500 mb-0.5">Outdated scan results</p>
                                    <p className="text-[12px] text-zinc-400">
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

                        <div className="animate-fade-in-up">
                            <AuditReportWithDismissals
                                data={auditData!}
                                diff={scanDiff}
                                previousScanDate={previousScanDate}
                                projectId={params.id}
                                scanId={latestScan.id}
                                initialDismissals={activeDismissals}
                                userPlan={userPlan}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
