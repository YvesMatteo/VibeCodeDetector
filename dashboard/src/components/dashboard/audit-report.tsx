'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flag, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const ScannerAccordion = dynamic(
    () => import('@/components/dashboard/scanner-accordion').then(m => m.ScannerAccordion),
    { ssr: false, loading: () => <div className="animate-pulse space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.03]" />)}</div> }
);
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { ScanDiff } from '@/lib/scan-diff';
import { buildFingerprint, DISMISSAL_REASONS, type Dismissal, type DismissalReason, type DismissalScope } from '@/lib/dismissals';
import type { AuditReportData, ScanResultItem } from '@/lib/audit-data';

export type { AuditReportData } from '@/lib/audit-data';
export { processAuditData } from '@/lib/audit-data';

function getIssueCountColor(count: number) {
    if (count === 0) return 'text-emerald-400';
    if (count <= 5) return 'text-white';
    if (count <= 15) return 'text-white';
    return 'text-white';
}

/** Compute adjusted counts by subtracting dismissed fingerprints */
function computeAdjustedCounts(
    results: Record<string, ScanResultItem>,
    dismissed: Set<string>,
): { critical: number; high: number; medium: number; low: number; total: number } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    for (const [key, result] of Object.entries(results)) {
        if ('skipped' in result && result.skipped) continue;
        if (!result.findings || !Array.isArray(result.findings)) continue;
        for (const f of result.findings) {
            const sev = f.severity?.toLowerCase();
            if (sev === 'info') continue;
            if (dismissed.has(buildFingerprint(key, f))) continue;
            if (sev === 'critical') counts.critical++;
            else if (sev === 'high') counts.high++;
            else if (sev === 'medium') counts.medium++;
            else counts.low++;
            counts.total++;
        }
    }
    return counts;
}

const REASON_LABELS: Record<string, string> = {
    false_positive: 'False positive',
    accepted_risk: 'Accepted risk',
    not_applicable: 'Not applicable',
    will_fix_later: 'Will fix later',
};

const SCANNER_NAMES: Record<string, string> = {
    security: 'Security Headers', api_keys: 'API Keys', legal: 'Legal', threat_intelligence: 'Threat Intel',
    sqli: 'SQL Injection', github_secrets: 'GitHub Secrets', tech_stack: 'Tech Stack', cors: 'CORS',
    csrf: 'CSRF', cookies: 'Cookies', auth: 'Auth', supabase_backend: 'Supabase', firebase_backend: 'Firebase',
    scorecard: 'Scorecard', github_security: 'GitHub Security', supabase_mgmt: 'Supabase Mgmt',
    dependencies: 'Dependencies', ssl_tls: 'SSL/TLS', dns_email: 'DNS', xss: 'XSS',
    open_redirect: 'Redirects', vercel_hosting: 'Vercel', netlify_hosting: 'Netlify',
    cloudflare_hosting: 'Cloudflare', railway_hosting: 'Railway', convex_backend: 'Convex',
    ddos_protection: 'DDoS', file_upload: 'File Upload',
    audit_logging: 'Audit Logging', mobile_api: 'Mobile API',
    domain_hijacking: 'Domain Hijacking', debug_endpoints: 'Debug Endpoints',
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
};

interface AuditReportProps {
    data: AuditReportData;
    diff?: ScanDiff | null;
    previousScanDate?: string | null;
    dismissedFingerprints?: Set<string>;
    dismissals?: Dismissal[];
    onDismiss?: (fingerprint: string, scannerKey: string, finding: any, reason: DismissalReason, scope: DismissalScope, note?: string) => void;
    onRestore?: (dismissalId: string) => void;
    userPlan?: string;
}

export function AuditReport({ data, diff, previousScanDate, dismissedFingerprints, dismissals, onDismiss, onRestore, userPlan }: AuditReportProps) {
    const { totalFindings, issueCount, passingCheckCount, visibleScannerCount, techStack, techStackCveFindings, scannerResults } = data;
    const [showDismissed, setShowDismissed] = useState(false);
    const [showResolved, setShowResolved] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const dismissed = dismissedFingerprints ?? new Set<string>();
    const dismissalCount = dismissed.size;
    const hasDismissals = dismissalCount > 0;

    // Compute adjusted counts
    const adjusted = hasDismissals
        ? computeAdjustedCounts(data.results, dismissed)
        : { critical: totalFindings.critical, high: totalFindings.high, medium: totalFindings.medium, low: totalFindings.low, total: issueCount };

    const hasResolvedIssues = diff && diff.resolvedIssues.length > 0;
    const hasNewIssues = diff && diff.newIssues.length > 0;

    // Severity bar proportions
    const barTotal = adjusted.total || 1;
    const severities = [
        { key: 'critical', count: adjusted.critical, color: 'bg-red-500', label: 'Critical' },
        { key: 'high', count: adjusted.high, color: 'bg-orange-500', label: 'High' },
        { key: 'medium', count: adjusted.medium, color: 'bg-amber-500', label: 'Medium' },
        { key: 'low', count: adjusted.low, color: 'bg-sky-400', label: 'Low' },
    ];

    return (
        <>
            {/* Findings Overview */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
                {/* Issue Count */}
                <div className="flex flex-col items-center sm:items-start justify-center sm:pr-8 sm:border-r sm:border-white/[0.06]">
                    <span className={`text-4xl sm:text-5xl font-bold tracking-tight tabular-nums ${getIssueCountColor(adjusted.total)}`}>
                        {adjusted.total}
                    </span>
                    <span className="text-[13px] text-zinc-500 mt-1">
                        {adjusted.total === 1 ? 'issue' : 'issues'} found
                    </span>
                    <span className="text-[12px] text-zinc-600 mt-0.5">
                        {visibleScannerCount} scanners
                    </span>
                </div>

                {/* Severity Breakdown */}
                <div className="flex flex-col gap-4">
                    {/* Severity bar */}
                    {adjusted.total > 0 && (
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]" role="img" aria-label={`Severity breakdown: ${severities.map(s => `${s.count} ${s.label}`).join(', ')}`}>
                            {severities.map(s => s.count > 0 && (
                                <div
                                    key={s.key}
                                    className={`${s.color} transition-all duration-500`}
                                    style={{ width: `${(s.count / barTotal) * 100}%` }}
                                    title={`${s.count} ${s.label}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Severity counts */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="list" aria-label="Issue severity counts">
                        {severities.map(s => (
                            <div key={s.key} role="listitem" className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
                                <div className={`w-2 h-2 rounded-full ${s.color} shrink-0`} aria-hidden="true" />
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                    <span className="text-sm font-semibold text-white tabular-nums">{s.count}</span>
                                    <span className="text-xs text-zinc-500">{s.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Diff + Dismissals */}
                    <div className="flex flex-wrap items-center gap-3">
                        {diff && (hasResolvedIssues || hasNewIssues) && (
                            <>
                                {hasResolvedIssues && (
                                    <button
                                        onClick={() => setShowResolved(v => !v)}
                                        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                                    >
                                        <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="font-medium text-emerald-400">{diff.resolvedIssues.length} resolved</span>
                                        <span className="text-zinc-600">since last scan</span>
                                        <ChevronRight className={`h-3 w-3 text-zinc-600 transition-transform duration-200 ${showResolved ? 'rotate-90' : ''}`} />
                                    </button>
                                )}
                                {hasNewIssues && (
                                    <button
                                        onClick={() => setShowNew(v => !v)}
                                        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                                    >
                                        <ArrowUpCircle className="h-3.5 w-3.5 text-red-400" />
                                        <span className="font-medium text-red-400">{diff.newIssues.length} new</span>
                                        <ChevronRight className={`h-3 w-3 text-zinc-600 transition-transform duration-200 ${showNew ? 'rotate-90' : ''}`} />
                                    </button>
                                )}
                            </>
                        )}
                        {hasDismissals && (
                            <button
                                onClick={() => setShowDismissed(v => !v)}
                                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Flag className="h-3 w-3" />
                                {dismissalCount} dismissed
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Resolved Issues Detail */}
            {showResolved && diff && diff.resolvedIssues.length > 0 && (
                <div className="mb-6 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] overflow-hidden">
                    <button
                        onClick={() => setShowResolved(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-emerald-500/[0.03] transition-colors"
                    >
                        <ArrowDownCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-sm font-medium text-emerald-400">{diff.resolvedIssues.length} resolved since last scan</span>
                        <ChevronDown className="h-3.5 w-3.5 text-emerald-400/50 ml-auto" />
                    </button>
                    <div className="px-4 pb-3 space-y-1.5">
                        {diff.resolvedIssues.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                                <Badge variant="outline" className={`text-[10px] capitalize shrink-0 border-0 ${SEVERITY_COLORS[item.finding.severity?.toLowerCase()] || 'text-zinc-400 bg-zinc-500/10'}`}>
                                    {item.finding.severity}
                                </Badge>
                                <span className="text-[13px] text-zinc-300 truncate flex-1">{item.finding.title || item.finding.id}</span>
                                <span className="text-[11px] text-zinc-600 shrink-0">{SCANNER_NAMES[item.scannerKey] || item.scannerKey}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Issues Detail */}
            {showNew && diff && diff.newIssues.length > 0 && (
                <div className="mb-6 rounded-xl border border-red-500/10 bg-red-500/[0.03] overflow-hidden">
                    <button
                        onClick={() => setShowNew(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-red-500/[0.03] transition-colors"
                    >
                        <ArrowUpCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="text-sm font-medium text-red-400">{diff.newIssues.length} new issues</span>
                        <ChevronDown className="h-3.5 w-3.5 text-red-400/50 ml-auto" />
                    </button>
                    <div className="px-4 pb-3 space-y-1.5">
                        {diff.newIssues.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                                <Badge variant="outline" className={`text-[10px] capitalize shrink-0 border-0 ${SEVERITY_COLORS[item.finding.severity?.toLowerCase()] || 'text-zinc-400 bg-zinc-500/10'}`}>
                                    {item.finding.severity}
                                </Badge>
                                <span className="text-[13px] text-zinc-300 truncate flex-1">{item.finding.title || item.finding.id}</span>
                                <span className="text-[11px] text-zinc-600 shrink-0">{SCANNER_NAMES[item.scannerKey] || item.scannerKey}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dismissed Findings Section */}
            {hasDismissals && showDismissed && dismissals && (
                <Card className="bg-white/[0.02] border-white/[0.06] mb-8">
                    <button
                        onClick={() => setShowDismissed(false)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-zinc-500" />
                            <span className="text-sm font-medium text-zinc-400">Dismissed findings ({dismissalCount})</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-500 rotate-180" />
                    </button>
                    <CardContent className="pt-0 pb-4">
                        <div className="space-y-2">
                            {dismissals.map(d => {
                                const parts = d.fingerprint.split('::');
                                const scanner = parts[0] || '';
                                const severity = parts[2] || '';
                                const findingId = parts[1] || '';

                                return (
                                    <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <Badge variant="outline" className={`text-[10px] capitalize shrink-0 border-0 ${SEVERITY_COLORS[severity] || 'text-zinc-400 bg-zinc-500/10'}`}>
                                                {severity || '?'}
                                            </Badge>
                                            <span className="text-sm text-zinc-300 truncate">{findingId}</span>
                                            <span className="text-xs text-zinc-600 shrink-0">{scanner}</span>
                                            <span className="text-xs text-zinc-600 shrink-0 bg-white/[0.04] rounded px-1.5 py-0.5">
                                                {REASON_LABELS[d.reason] || d.reason}
                                            </span>
                                            {d.note && (
                                                <span className="text-xs text-zinc-600 italic truncate">{d.note}</span>
                                            )}
                                        </div>
                                        {onRestore && (
                                            <button
                                                onClick={() => onRestore(d.id)}
                                                className="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-white/5"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Restore
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tech Stack CVE findings only (detected stack tags removed to reduce clutter) */}
            {techStackCveFindings.length > 0 && (
                <div className="mb-8 space-y-2">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Known Vulnerabilities</h4>
                    {techStackCveFindings.map((finding: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border bg-red-500/5 border-red-500/15">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                <span className="font-medium text-[13px] text-zinc-200">{finding.title}</span>
                                <Badge variant="outline" className="text-[10px] capitalize bg-red-500/10 text-red-400 border-0">
                                    {finding.severity}
                                </Badge>
                            </div>
                            <p className="text-[13px] text-zinc-500 pl-5.5">{finding.description}</p>
                            {finding.recommendation && (
                                <p className="text-[13px] mt-1 text-zinc-500 pl-5.5">
                                    <span className="text-zinc-400">Fix:</span> {finding.recommendation}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Detailed Results by Scanner */}
            <ScannerAccordion
                results={scannerResults}
                dismissedFingerprints={dismissed}
                onDismiss={onDismiss}
                userPlan={userPlan}
            />
        </>
    );
}
