/**
 * Shared color/style utilities for severity, scores, and issue counts.
 * Consolidates duplicated helpers from scanner-accordion, audit-report, and project overview.
 */

// ── Issue count colors ──────────────────────────────────────────────

/** Color class based on raw issue count (scanner accordion, tables). */
export function getIssueCountColor(count: number): string {
    if (count === 0) return 'text-green-400';
    if (count <= 3) return 'text-amber-400';
    if (count <= 7) return 'text-orange-400';
    return 'text-red-400';
}

/** Muted variant for the audit-report summary (large hero number). */
export function getIssueCountColorMuted(count: number): string {
    if (count === 0) return 'text-emerald-400';
    return 'text-white';
}

// ── Score colors ────────────────────────────────────────────────────

/** Text color based on 0-100 score (project overview, score badges). */
export function getScoreColor(score: number | null): string {
    if (score === null) return 'text-zinc-500';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

/** Background + border classes based on 0-100 score (project overview cards). */
export function getScoreBg(score: number | null): string {
    if (score === null) return 'bg-zinc-500/10 border-zinc-500/20';
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/20';
    if (score >= 40) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
}
