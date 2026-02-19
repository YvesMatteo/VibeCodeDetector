import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    Shield,
    Clock,
    AlertTriangle,
    Scan,
    ExternalLink,
    ArrowRight,
    GitBranch,
    Server,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import { processAuditData } from '@/lib/audit-data';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { ScoreChart } from '@/components/dashboard/score-chart';
import { CURRENT_SCANNER_KEYS } from '@/lib/audit-data';

function getScoreColor(score: number | null): string {
    if (score === null) return 'text-zinc-500';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function getScoreBg(score: number | null): string {
    if (score === null) return 'bg-zinc-500/10 border-zinc-500/20';
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
}

function timeAgo(date: string | null): string {
    if (!date) return 'Never';
    const now = Date.now();
    const d = new Date(date).getTime();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
}

function countIssuesBySeverity(results: Record<string, any>): { critical: number; high: number; medium: number; low: number; total: number } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    for (const key of Object.keys(results)) {
        const scanner = results[key];
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            for (const f of scanner.findings) {
                const sev = (f.severity || '').toLowerCase();
                if (sev === 'critical') counts.critical++;
                else if (sev === 'high') counts.high++;
                else if (sev === 'medium') counts.medium++;
                else if (sev === 'low') counts.low++;
                if (sev !== 'info') counts.total++;
            }
        }
    }
    return counts;
}

function countScannersCovered(results: Record<string, any>): { ran: number; total: number } {
    let ran = 0;
    for (const key of Object.keys(results)) {
        const scanner = results[key];
        if (scanner && !scanner.skipped) ran++;
    }
    return { ran, total: CURRENT_SCANNER_KEYS.length };
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

    // Get recent scans for chart + overview
    const { data: recentScans } = await supabase
        .from('scans')
        .select('id, overall_score, results, created_at, completed_at, status')
        .eq('project_id', id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

    const latestScan = recentScans?.[0] ?? null;
    const previousScan = recentScans?.[1] ?? null;

    const score = latestScan?.overall_score ?? null;
    const previousScore = previousScan?.overall_score ?? null;
    const scoreDelta = (score !== null && previousScore !== null) ? score - previousScore : null;

    const issues = latestScan ? countIssuesBySeverity(latestScan.results as Record<string, any>) : null;
    const coverage = latestScan ? countScannersCovered(latestScan.results as Record<string, any>) : null;

    // Chart data (oldest first)
    const chartData = (recentScans || [])
        .filter(s => s.overall_score !== null)
        .reverse()
        .map(s => ({
            date: new Date(s.completed_at || s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: s.overall_score!,
        }));

    // Top findings from latest scan
    const topFindings: { scanner: string; finding: string; severity: string }[] = [];
    if (latestScan?.results) {
        const results = latestScan.results as Record<string, any>;
        for (const key of Object.keys(results)) {
            const scanner = results[key];
            if (scanner?.findings && Array.isArray(scanner.findings)) {
                for (const f of scanner.findings) {
                    const sev = (f.severity || '').toLowerCase();
                    if (sev === 'critical' || sev === 'high') {
                        topFindings.push({
                            scanner: scanner.name || key,
                            finding: f.title || f.description || 'Issue found',
                            severity: sev,
                        });
                    }
                }
            }
        }
    }

    const hostname = (() => {
        try { return new URL(project.url).hostname; } catch { return project.url; }
    })();

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Status cards row - Supabase style */}
            {latestScan ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Security Score */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Security Score</span>
                                <div className={`p-1.5 rounded-lg ${getScoreBg(score)}`}>
                                    <Shield className={`h-3.5 w-3.5 ${getScoreColor(score)}`} />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className={`text-3xl font-bold tracking-tight ${getScoreColor(score)}`}>
                                    {score ?? '—'}
                                </span>
                                <span className="text-zinc-600 text-sm mb-1">/100</span>
                                {scoreDelta !== null && scoreDelta !== 0 && (
                                    <span className={`flex items-center text-xs font-medium mb-1 ml-auto ${
                                        scoreDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {scoreDelta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                                        {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                                    </span>
                                )}
                                {scoreDelta === 0 && (
                                    <span className="flex items-center text-xs font-medium text-zinc-500 mb-1 ml-auto">
                                        <Minus className="h-3 w-3 mr-0.5" />
                                        No change
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Last Scan */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Last Scan</span>
                                <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tracking-tight text-white">
                                {timeAgo(latestScan.completed_at || latestScan.created_at)}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                {new Date(latestScan.completed_at || latestScan.created_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                            </p>
                        </div>

                        {/* Issues Found */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Issues Found</span>
                                <div className={`p-1.5 rounded-lg ${issues && issues.total > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                    <AlertTriangle className={`h-3.5 w-3.5 ${issues && issues.total > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white">{issues?.total ?? 0}</p>
                            {issues && issues.total > 0 && (
                                <div className="flex gap-2 mt-2">
                                    {issues.critical > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">{issues.critical} critical</span>
                                    )}
                                    {issues.high > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-medium">{issues.high} high</span>
                                    )}
                                    {issues.medium > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">{issues.medium} med</span>
                                    )}
                                    {issues.low > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-medium">{issues.low} low</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scan Coverage */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Scan Coverage</span>
                                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                    <Scan className="h-3.5 w-3.5 text-violet-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold tracking-tight text-white">
                                {coverage?.ran ?? 0}<span className="text-zinc-600 text-lg">/{coverage?.total ?? CURRENT_SCANNER_KEYS.length}</span>
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">scanners executed</p>
                        </div>
                    </div>

                    {/* Two column: Score trend + Project config */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Score Trend */}
                        <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
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

                        {/* Project Configuration */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white">Project Configuration</h3>
                                <Link
                                    href={`/dashboard/projects/${id}/settings`}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Edit
                                </Link>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Target URL</p>
                                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1 break-all">
                                        {hostname} <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                </div>
                                {project.github_repo && (
                                    <div>
                                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">GitHub</p>
                                        <a
                                            href={`https://github.com/${project.github_repo}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-zinc-300 hover:text-white flex items-center gap-1.5"
                                        >
                                            <GitBranch className="h-3.5 w-3.5 text-zinc-500" />
                                            {project.github_repo}
                                        </a>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Backend</p>
                                    <p className="text-sm text-zinc-300 flex items-center gap-1.5">
                                        <Server className="h-3.5 w-3.5 text-zinc-500" />
                                        {project.backend_type ? project.backend_type.charAt(0).toUpperCase() + project.backend_type.slice(1) : 'Not configured'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Total Scans</p>
                                    <p className="text-sm text-zinc-300">{recentScans?.length ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Findings */}
                    {topFindings.length > 0 && (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white">Critical & High Findings</h3>
                                <Link
                                    href={`/dashboard/projects/${id}/report`}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                                >
                                    View full report <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {topFindings.slice(0, 8).map((f, i) => (
                                    <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0 mt-0.5 ${
                                            f.severity === 'critical'
                                                ? 'bg-red-500/15 text-red-400'
                                                : 'bg-orange-500/15 text-orange-400'
                                        }`}>
                                            {f.severity}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-zinc-200 truncate">{f.finding}</p>
                                            <p className="text-xs text-zinc-600">{f.scanner}</p>
                                        </div>
                                    </div>
                                ))}
                                {topFindings.length > 8 && (
                                    <p className="text-xs text-zinc-500 pt-2">
                                        +{topFindings.length - 8} more findings
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {topFindings.length === 0 && (
                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Shield className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-emerald-400">No critical or high severity findings</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Your project is in good shape. Keep monitoring for new issues.</p>
                            </div>
                        </div>
                    )}
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
