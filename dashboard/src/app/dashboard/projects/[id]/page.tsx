import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    Shield,
    Clock,
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Activity,
} from 'lucide-react';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { ScoreChart } from '@/components/dashboard/score-chart';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';
import { getScoreColor, getScoreBg } from '@/lib/severity-utils';
import { countIssuesExcludingDismissed, computeAdjustedScore } from '@/lib/scan-utils';
import { buildFingerprint } from '@/lib/dismissals';
import type { Dismissal } from '@/lib/dismissals';

const FREQUENCY_LABELS: Record<string, string> = {
    every_6h: 'Every 6 hours',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
};

function timeAgo(date: string | null): string {
    if (!date) return 'Never';
    return formatDate(date, 'relative');
}

export default async function ProjectOverviewPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!project) redirect('/dashboard');

    // Get monitoring schedule (custom table not in generated types)
    interface ScheduleRow { id: string; frequency: string; enabled: boolean; next_run_at: string | null; hour_utc: number }
    const { data: schedule } = await (supabase
        .from('scheduled_scans' as never)
        .select('id, frequency, enabled, next_run_at, hour_utc')
        .eq('project_id' as never, id)
        .eq('user_id' as never, user.id)
        .maybeSingle()) as unknown as { data: ScheduleRow | null };

    // Get recent scans for chart (with results for score adjustment)
    interface FullScan { id: string; overall_score: number | null; created_at: string; completed_at: string | null; status: string; results: Record<string, unknown> | null }
    const { data: recentScans } = await supabase
        .from('scans')
        .select('id, overall_score, created_at, completed_at, status, results')
        .eq('project_id', id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20) as unknown as { data: FullScan[] | null };

    const latestScan = recentScans?.[0] ?? null;
    const previousScan = recentScans?.[1] ?? null;

    // Fetch dismissed findings for this project
    const { data: dismissalsRaw } = await supabase
        .from('dismissed_findings')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

    const allDismissals = (dismissalsRaw || []) as Dismissal[];
    const activeDismissals = allDismissals.filter(d =>
        d.scope === 'project' || d.scan_id === latestScan?.id
    );
    const dismissedFingerprints = new Set(activeDismissals.map(d => d.fingerprint));
    const hasDismissals = dismissedFingerprints.size > 0;

    // Project-scoped dismissals apply to all scans for chart adjustment
    const projectDismissals = new Set(
        allDismissals.filter(d => d.scope === 'project').map(d => d.fingerprint)
    );

    // Compute score and issues adjusted for dismissals
    const rawScore = latestScan?.overall_score ?? null;
    const score = hasDismissals && latestScan
        ? computeAdjustedScore(latestScan.results as Record<string, unknown>, dismissedFingerprints)
        : rawScore;
    const previousAdjusted = previousScan && projectDismissals.size > 0
        ? computeAdjustedScore(previousScan.results as Record<string, unknown>, projectDismissals)
        : previousScan?.overall_score ?? null;
    const scoreDelta = (score !== null && previousAdjusted !== null) ? score - previousAdjusted : null;

    const issues = latestScan ? countIssuesExcludingDismissed(latestScan.results as Record<string, unknown>, dismissedFingerprints) : null;
    // Chart data (oldest first), adjusted for project-scoped dismissals
    const chartData = (recentScans || [])
        .filter(s => s.overall_score !== null)
        .reverse()
        .map(s => ({
            date: new Date(s.completed_at || s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: projectDismissals.size > 0 && s.results
                ? computeAdjustedScore(s.results as Record<string, unknown>, projectDismissals)
                : s.overall_score!,
        }));

    // Top findings from latest scan (excluding dismissed)
    const topFindings: { scanner: string; finding: string; severity: string }[] = [];
    if (latestScan?.results) {
        const results = latestScan.results as Record<string, { name?: string; findings?: { id?: string; severity?: string; title?: string; description?: string }[] }>;
        for (const key of Object.keys(results)) {
            const scanner = results[key];
            if (scanner?.findings && Array.isArray(scanner.findings)) {
                for (const f of scanner.findings) {
                    const sev = (f.severity || '').toLowerCase();
                    if (sev !== 'critical' && sev !== 'high') continue;
                    if (dismissedFingerprints.has(buildFingerprint(key, { id: f.id, title: f.title || '', severity: f.severity || '' }))) continue;
                    topFindings.push({
                        scanner: scanner.name || key,
                        finding: f.title || f.description || 'Issue found',
                        severity: sev,
                    });
                }
            }
        }
    }

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Centralized CTA for Issues - Moved to top for mobile visibility */}
            {latestScan && (
                (issues && issues.total > 0) ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-lg bg-red-500 shrink-0 shadow-sm shadow-red-500/20">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Security Vulnerabilities Found</p>
                                <p className="text-xs text-red-200/80 mt-0.5">Please review the detailed analysis in the Report tab to see exact issues and fixes.</p>
                            </div>
                        </div>
                        <Button asChild className="w-full sm:w-auto shrink-0 bg-red-500 hover:bg-red-600 text-white border-0 font-medium h-9 text-xs shadow-sm shadow-red-500/20 transition-all">
                            <Link href={`/dashboard/projects/${id}/report`}>
                                View Full Report
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                            <Shield className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-400">No issues detected</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Your project is in good shape. Keep monitoring for new issues.</p>
                        </div>
                    </div>
                )
            )}

            {/* Status cards row - Supabase style */}
            {latestScan ? (
                <>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row md:divide-x divide-y md:divide-y-0 divide-white/[0.06]">
                        {/* Security Score */}
                        <div className="flex-1 p-5 md:p-6 lg:p-8 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Security Score</span>
                                <div className={`p-1.5 rounded-lg ${getScoreBg(score)}`}>
                                    <Shield className={`h-4 w-4 ${getScoreColor(score)}`} />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className={`text-4xl font-bold tracking-tight ${getScoreColor(score)}`}>
                                    {score ?? '—'}
                                </span>
                                <span className="text-zinc-600 text-sm mb-1.5">/100</span>
                                {scoreDelta !== null && scoreDelta !== 0 && (
                                    <span className={`flex items-center text-xs font-medium mb-1.5 ml-auto ${scoreDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        {scoreDelta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                                        {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                                    </span>
                                )}
                                {scoreDelta === 0 && (
                                    <span className="flex items-center text-xs font-medium text-zinc-500 mb-1.5 ml-auto">
                                        <Minus className="h-3 w-3 mr-0.5" />
                                        No change
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Last Scan */}
                        <div className="flex-1 p-5 md:p-6 lg:p-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Last Check</span>
                                <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                                    <Clock className="h-4 w-4 text-sky-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white">
                                {timeAgo(latestScan.completed_at || latestScan.created_at)}
                            </p>
                            <p className="text-xs text-zinc-500 mt-2">
                                {formatDate(latestScan.completed_at || latestScan.created_at, 'datetime')}
                            </p>
                        </div>

                        {/* Issues Found */}
                        <div className="flex-1 p-5 md:p-6 lg:p-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Issues Found</span>
                                <div className={`p-1.5 rounded-lg ${issues && issues.total > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                    <AlertTriangle className={`h-4 w-4 ${issues && issues.total > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white">{issues?.total ?? 0}</p>
                            {issues && issues.total > 0 && (
                                <div className="flex gap-2 mt-2">
                                    {issues.critical > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">{issues.critical} critical</span>
                                    )}
                                    {issues.high > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">{issues.high} high</span>
                                    )}
                                    {issues.medium > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">{issues.medium} med</span>
                                    )}
                                    {issues.low > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 font-medium">{issues.low} low</span>
                                    )}
                                </div>
                            )}
                            {hasDismissals && (
                                <p className="text-[10px] text-zinc-600 mt-1.5">{dismissedFingerprints.size} dismissed</p>
                            )}
                        </div>

                        {/* Monitoring Status */}
                        <div className="flex-1 p-5 md:p-6 lg:p-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Monitoring</span>
                                <div className={`p-1.5 rounded-lg ${schedule?.enabled ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-500/10 border border-zinc-500/20'}`}>
                                    <Activity className={`h-4 w-4 ${schedule?.enabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white">
                                {schedule?.enabled ? FREQUENCY_LABELS[schedule.frequency] || schedule.frequency : schedule ? 'Paused' : 'Off'}
                            </p>
                            {schedule?.enabled && schedule.next_run_at && (
                                <p className="text-xs text-zinc-500 mt-2">
                                    Next check: {formatDate(schedule.next_run_at, 'datetime')}
                                </p>
                            )}
                            {!schedule && (
                                <Link href={`/dashboard/projects/${id}/monitoring`} className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
                                    Set up monitoring →
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Single column: Score trend */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Score Trend */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white">Score Trend</h3>
                                <Link
                                    href={`/dashboard/projects/${id}/history`}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                                >
                                    View history <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <ScoreChart data={chartData} height={220} />
                        </div>
                    </div>


                </>
            ) : (
                /* Empty state */
                <div className="text-center py-20 border border-white/[0.04] border-dashed rounded-xl bg-white/[0.01]">
                    <div className="p-3 rounded-xl bg-white/[0.03] inline-block mb-4">
                        <Shield className="h-8 w-8 text-zinc-600" />
                    </div>
                    <h2 className="text-sm font-medium text-white mb-1.5">No audits yet</h2>
                    <p className="text-zinc-500 text-[13px] mb-6 max-w-sm mx-auto">
                        Run your first security audit to see your project overview with scores, trends, and findings.
                    </p>
                    <RunAuditButton projectId={id} size="sm" />
                </div>
            )}
        </div>
    );
}
