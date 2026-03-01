import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { processAuditData, getMissingScannerNames, type ScanResultItem } from '@/lib/audit-data';
import { AuditReportWithDismissals } from '@/components/dashboard/audit-report-with-dismissals';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { ExportButton } from '@/components/dashboard/export-button';
import { OutreachEmailModal } from '@/components/dashboard/outreach-email-modal';
import { computeScanDiff } from '@/lib/scan-diff';
import type { Dismissal } from '@/lib/dismissals';
import { OWNER_EMAIL_CLIENT } from '@/lib/constants';

export default async function ProjectReportPage(props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ scanId?: string }>;
}) {
    const { id } = (await props.params);
    const { scanId } = (await props.searchParams);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: project } = await supabase
        .from('projects')
        .select('url')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!project) redirect('/dashboard');

    const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

    const userPlan = profile?.plan || 'none';

    interface ScanRow { id: string; overall_score: number | null; created_at: string; completed_at: string | null; status: string; results: Record<string, unknown> | null; public_id: string | null; user_id: string; project_id: string }
    let latestScan: ScanRow | null = null;
    let previousScan: ScanRow | null = null;

    if (scanId) {
        // Fetch the specific scan requested via query param
        const { data: specificScan } = await supabase
            .from('scans')
            .select('*')
            .eq('id', scanId)
            .eq('project_id', id)
            .eq('user_id', user.id)
            .single();

        latestScan = (specificScan as unknown as ScanRow) ?? null;

        // Fetch the previous scan before this one for diff
        if (latestScan) {
            const { data: prevScans } = await supabase
                .from('scans')
                .select('*')
                .eq('project_id', id)
                .eq('status', 'completed')
                .lt('completed_at', latestScan.completed_at ?? latestScan.created_at)
                .order('completed_at', { ascending: false })
                .limit(1);

            previousScan = (prevScans?.[0] as unknown as ScanRow) ?? null;
        }
    } else {
        // Fallback: get latest 2 completed scans (current + previous for diff)
        const { data: recentScans } = await supabase
            .from('scans')
            .select('*')
            .eq('project_id', id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(2);

        latestScan = (recentScans?.[0] as unknown as ScanRow) ?? null;
        previousScan = (recentScans?.[1] as unknown as ScanRow) ?? null;
    }

    // Fetch dismissed findings for this project
    const { data: dismissalsRaw } = await supabase
        .from('dismissed_findings')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

    const dismissals = (dismissalsRaw || []) as Dismissal[];

    const activeDismissals = dismissals.filter(d =>
        d.scope === 'project' || d.scan_id === latestScan?.id
    );

    const auditData = latestScan ? processAuditData(latestScan.results as unknown as Record<string, ScanResultItem>) : null;
    const missingScanners = latestScan
        ? getMissingScannerNames(latestScan.results as Record<string, unknown>)
        : [];
    const scanDiff = (latestScan && previousScan)
        ? computeScanDiff(latestScan.results as Record<string, unknown>, previousScan.results as Record<string, unknown>)
        : null;
    const previousScanDate = previousScan?.completed_at ?? previousScan?.created_at ?? null;

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
            {!latestScan ? (
                <div className="text-center py-20 border border-white/[0.04] border-dashed rounded-xl bg-white/[0.01]">
                    <h2 className="text-sm font-medium text-white mb-1.5">No audits yet</h2>
                    <p className="text-zinc-500 text-[13px] mb-6">
                        Run your first audit to see security findings for this project.
                    </p>
                    <RunAuditButton projectId={id} size="sm" />
                </div>
            ) : (
                <>
                    {/* Action bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <AIFixPrompt url={project.url} findings={auditData!.allFindings} techStack={auditData!.techStack} userPlan={userPlan} />
                        <ExportButton scanId={latestScan.id} userPlan={userPlan} />
                        {/* Temporary outreach feature — owner only */}
                        {user.email === OWNER_EMAIL_CLIENT && (
                            <OutreachEmailModal
                                scanResults={latestScan.results as Record<string, unknown>}
                                projectUrl={project.url}
                                issueCount={auditData!.issueCount}
                                severityBreakdown={auditData!.totalFindings}
                            />
                        )}
                    </div>

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
                                <RunAuditButton projectId={id} size="sm" />
                            </div>
                        </div>
                    )}

                    <AuditReportWithDismissals
                        data={auditData!}
                        diff={scanDiff}
                        previousScanDate={previousScanDate}
                        projectId={id}
                        scanId={latestScan.id}
                        initialDismissals={activeDismissals}
                        originalScore={latestScan.overall_score}
                        userPlan={userPlan}
                    />
                </>
            )}
        </div>
    );
}
