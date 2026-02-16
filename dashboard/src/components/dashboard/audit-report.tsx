'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Layers, Flag, RotateCcw, ChevronDown } from 'lucide-react';
import { ScannerAccordion } from '@/components/dashboard/scanner-accordion';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { ScanDiff } from '@/lib/scan-diff';
import { buildFingerprint, DISMISSAL_REASONS, type Dismissal, type DismissalReason, type DismissalScope } from '@/lib/dismissals';

function getIssueCountColor(count: number) {
    if (count === 0) return 'text-emerald-400';
    if (count <= 3) return 'text-amber-400';
    if (count <= 7) return 'text-orange-400';
    return 'text-red-400';
}

function getVibeRating(issues: number): { label: string; color: string; bg: string } {
    if (issues === 0) return { label: 'Clean', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (issues <= 3) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (issues <= 7) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (issues <= 15) return { label: 'Needs Work', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (issues <= 25) return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' };
}

interface ScanResultItem {
    score: number;
    findings: { severity: string; title: string; description: string;[key: string]: any }[];
}

export interface AuditReportData {
    results: Record<string, ScanResultItem>;
    allFindings: any[];
    totalFindings: { critical: number; high: number; medium: number; low: number };
    issueCount: number;
    passingCheckCount: number;
    visibleScannerCount: number;
    techStack: any;
    techStackCveFindings: any[];
    scannerResults: Record<string, ScanResultItem>;
}

/** Pre-process scan results into the shape needed by AuditReport */
export function processAuditData(results: Record<string, ScanResultItem>): AuditReportData {
    const techStack = (results as any).tech_stack;
    const techStackCveFindings = techStack?.findings?.filter(
        (f: any) => f.severity?.toLowerCase() !== 'info'
    ) || [];

    const scannerResults = Object.fromEntries(
        Object.entries(results).filter(([key]) => key !== 'tech_stack')
    ) as Record<string, ScanResultItem>;

    const visibleScannerCount = Object.entries(scannerResults).filter(([key, result]: [string, any]) => {
        if (result.skipped) return false;
        if (key.endsWith('_hosting') && result.score === 100 && !result.error) {
            const allInfo = !result.findings?.length || result.findings.every((f: any) => f.severity?.toLowerCase() === 'info');
            if (allInfo) return false;
        }
        return true;
    }).length;

    const totalFindings = { critical: 0, high: 0, medium: 0, low: 0 };
    const allFindings: any[] = [];

    Object.values(results).forEach((result: any) => {
        if (result.skipped) return;
        if (result.findings && Array.isArray(result.findings)) {
            allFindings.push(...result.findings);
            result.findings.forEach((f: any) => {
                const sev = f.severity?.toLowerCase();
                if (sev === 'info') return;
                if (sev === 'critical') totalFindings.critical++;
                else if (sev === 'high') totalFindings.high++;
                else if (sev === 'medium') totalFindings.medium++;
                else totalFindings.low++;
            });
        }
    });

    const issueCount = totalFindings.critical + totalFindings.high + totalFindings.medium + totalFindings.low;

    let passingCheckCount = 0;
    Object.values(results).forEach((result: any) => {
        if (result.skipped) return;
        if (result.findings && Array.isArray(result.findings)) {
            result.findings.forEach((f: any) => {
                if (f.severity?.toLowerCase() === 'info') passingCheckCount++;
            });
        }
    });

    return { results, allFindings, totalFindings, issueCount, passingCheckCount, visibleScannerCount, techStack, techStackCveFindings, scannerResults };
}

/** Compute adjusted counts by subtracting dismissed fingerprints */
function computeAdjustedCounts(
    results: Record<string, ScanResultItem>,
    dismissed: Set<string>,
): { critical: number; high: number; medium: number; low: number; total: number } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    for (const [key, result] of Object.entries(results)) {
        if ((result as any).skipped) continue;
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

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

interface AuditReportProps {
    data: AuditReportData;
    diff?: ScanDiff | null;
    previousScanDate?: string | null;
    dismissedFingerprints?: Set<string>;
    dismissals?: Dismissal[];
    onDismiss?: (fingerprint: string, scannerKey: string, finding: any, reason: DismissalReason, scope: DismissalScope, note?: string) => void;
    onRestore?: (dismissalId: string) => void;
}

export function AuditReport({ data, diff, previousScanDate, dismissedFingerprints, dismissals, onDismiss, onRestore }: AuditReportProps) {
    const { totalFindings, issueCount, passingCheckCount, visibleScannerCount, techStack, techStackCveFindings, scannerResults } = data;
    const [showDismissed, setShowDismissed] = useState(false);

    const dismissed = dismissedFingerprints ?? new Set<string>();
    const dismissalCount = dismissed.size;
    const hasDismissals = dismissalCount > 0;

    // Compute adjusted counts
    const adjusted = hasDismissals
        ? computeAdjustedCounts(data.results, dismissed)
        : { critical: totalFindings.critical, high: totalFindings.high, medium: totalFindings.medium, low: totalFindings.low, total: issueCount };

    const hasResolvedIssues = diff && diff.resolvedIssues.length > 0;
    const hasNewIssues = diff && diff.newIssues.length > 0;

    return (
        <>
            {/* Findings Overview */}
            <Card className="bg-slate-900/50 border-slate-700/20 mb-8">
                <CardContent className="py-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                        <div className="flex flex-col items-center justify-center w-24 h-24 sm:w-[120px] sm:h-[120px]">
                            <span className={`text-4xl sm:text-5xl font-bold ${getIssueCountColor(adjusted.total)}`}>{adjusted.total}</span>
                            <span className="text-xs text-zinc-500 mt-1">{adjusted.total === 1 ? 'issue' : 'issues'}</span>
                            {passingCheckCount > 0 && (
                                <span className="text-[11px] text-emerald-500/70 mt-0.5">+ {passingCheckCount} passing</span>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col items-center sm:items-start gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {(() => {
                                    const vibe = getVibeRating(adjusted.total);
                                    return (
                                        <div className={`px-2.5 py-1 rounded-md border ${vibe.bg}`}>
                                            <span className={`text-xs font-medium ${vibe.color}`}>{vibe.label}</span>
                                        </div>
                                    );
                                })()}
                                <span className="text-sm text-zinc-400">
                                    across {visibleScannerCount} scanners
                                </span>
                                {hasDismissals && (
                                    <button
                                        onClick={() => setShowDismissed(v => !v)}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 bg-white/5 border border-white/10 hover:border-white/20 rounded-full px-2.5 py-1 transition-colors"
                                    >
                                        <Flag className="h-3 w-3" />
                                        {dismissalCount} dismissed
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                                    <span className="text-sm font-medium text-white">{adjusted.critical}</span>
                                    <span className="text-sm text-zinc-500">Critical</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                                    <span className="text-sm font-medium text-white">{adjusted.high}</span>
                                    <span className="text-sm text-zinc-500">High</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                                    <span className="text-sm font-medium text-white">{adjusted.medium}</span>
                                    <span className="text-sm text-zinc-500">Medium</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                                    <span className="text-sm font-medium text-white">{adjusted.low}</span>
                                    <span className="text-sm text-zinc-500">Low</span>
                                </div>
                            </div>
                            {/* Diff from previous scan */}
                            {diff && (hasResolvedIssues || hasNewIssues) && (
                                <div className="flex flex-wrap items-center gap-4 pt-1">
                                    {hasResolvedIssues && (
                                        <div className="flex items-center gap-1.5">
                                            <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-400" />
                                            <span className="text-sm font-medium text-emerald-400">{diff.resolvedIssues.length} resolved</span>
                                            <span className="text-xs text-zinc-500">since last scan</span>
                                        </div>
                                    )}
                                    {hasNewIssues && (
                                        <div className="flex items-center gap-1.5">
                                            <ArrowUpCircle className="h-3.5 w-3.5 text-red-400" />
                                            <span className="text-sm font-medium text-red-400">{diff.newIssues.length} new</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dismissed Findings Section */}
            {hasDismissals && showDismissed && dismissals && (
                <Card className="bg-slate-900/30 border-zinc-800/50 mb-8">
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
                                // Extract scanner + severity from fingerprint
                                const parts = d.fingerprint.split('::');
                                const scanner = parts[0] || '';
                                const severity = parts[2] || '';
                                const findingId = parts[1] || '';

                                return (
                                    <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-900/50 border border-white/5 rounded-lg">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <Badge variant="outline" className={`text-[10px] capitalize shrink-0 border-0 ${SEVERITY_COLORS[severity] || 'text-zinc-400 bg-zinc-500/10'}`}>
                                                {severity || '?'}
                                            </Badge>
                                            <span className="text-sm text-zinc-300 truncate">{findingId}</span>
                                            <span className="text-xs text-zinc-600 shrink-0">{scanner}</span>
                                            <span className="text-xs text-zinc-600 shrink-0 bg-zinc-800/50 rounded px-1.5 py-0.5">
                                                {REASON_LABELS[d.reason] || d.reason}
                                            </span>
                                            {d.note && (
                                                <span className="text-xs text-zinc-600 italic truncate">{d.note}</span>
                                            )}
                                        </div>
                                        {onRestore && (
                                            <button
                                                onClick={() => onRestore(d.id)}
                                                className="text-xs font-medium text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-white/5"
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

            {/* Detected Stack */}
            {techStack && (techStack.technologies?.length > 0 || techStackCveFindings.length > 0) && (
                <Card className="mb-8 bg-slate-900/50 border-slate-700/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Layers className="h-5 w-5 text-indigo-400" />
                            <div>
                                <CardTitle className="text-white">Detected Stack</CardTitle>
                                <CardDescription className="text-zinc-400">Technologies and frameworks detected on this site</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {techStack.technologies?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {techStack.technologies.map((tech: any, i: number) => (
                                    <Badge key={i} variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-sm px-3 py-1">
                                        {tech.name}{tech.version ? ` ${tech.version}` : ''}
                                        {tech.category && <span className="ml-1.5 text-zinc-500 text-xs">({tech.category})</span>}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {techStackCveFindings.length > 0 && (
                            <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Known Vulnerabilities (CVEs)</h4>
                                {techStackCveFindings.map((finding: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg border bg-red-500/10 border-red-500/30">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="h-4 w-4 text-red-400" />
                                            <span className="font-medium text-sm">{finding.title}</span>
                                            <Badge variant="outline" className="text-xs capitalize bg-red-500/10 text-red-400 border-0">
                                                {finding.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                                        {finding.recommendation && (
                                            <p className="text-sm mt-1 text-muted-foreground">
                                                <span className="font-medium text-blue-400">Fix:</span> {finding.recommendation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Detailed Results by Scanner */}
            <ScannerAccordion
                results={scannerResults}
                dismissedFingerprints={dismissed}
                onDismiss={onDismiss}
            />
        </>
    );
}
