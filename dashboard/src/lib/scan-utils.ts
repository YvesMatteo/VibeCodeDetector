/**
 * Shared utilities for computing issue counts from scan results.
 *
 * These are used server-side to pre-compute severity breakdowns so that the
 * heavy `results` JSON blob never needs to be sent to the client.
 */
import type { ScanResultItem } from './audit-data';
import { buildFingerprint } from './dismissals';

export interface IssueCounts {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

/**
 * Count non-info findings grouped by severity from a scan results object.
 */
export function countIssuesBySeverity(
    results: Record<string, unknown> | null | undefined
): IssueCounts {
    const counts: IssueCounts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    if (!results || typeof results !== 'object') return counts;

    for (const key of Object.keys(results)) {
        const scanner = results[key] as ScanResultItem | undefined;
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            for (const f of scanner.findings) {
                const sev = (f.severity || '').toLowerCase();
                if (sev === 'info') continue;
                counts.total++;
                if (sev === 'critical') counts.critical++;
                else if (sev === 'high') counts.high++;
                else if (sev === 'medium') counts.medium++;
                else if (sev === 'low') counts.low++;
            }
        }
    }
    return counts;
}

/**
 * Count non-info findings excluding dismissed fingerprints.
 */
export function countIssuesExcludingDismissed(
    results: Record<string, unknown> | null | undefined,
    dismissedFingerprints: Set<string>,
): IssueCounts {
    const counts: IssueCounts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    if (!results || typeof results !== 'object') return counts;

    for (const key of Object.keys(results)) {
        const scanner = results[key] as ScanResultItem | undefined;
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            for (const f of scanner.findings) {
                const sev = (f.severity || '').toLowerCase();
                if (sev === 'info') continue;
                if (dismissedFingerprints.has(buildFingerprint(key, f))) continue;
                counts.total++;
                if (sev === 'critical') counts.critical++;
                else if (sev === 'high') counts.high++;
                else if (sev === 'medium') counts.medium++;
                else if (sev === 'low') counts.low++;
            }
        }
    }
    return counts;
}

/**
 * Compute adjusted security score excluding dismissed findings.
 * Uses same exponential-decay formula as the scan route.
 */
const SEVERITY_PENALTY: Record<string, number> = { critical: 15, high: 8, medium: 4, low: 1.5, info: 0 };
const DECAY_CONSTANT = 120;

export function computeAdjustedScore(
    results: Record<string, unknown> | null | undefined,
    dismissedFingerprints: Set<string>,
): number {
    if (!results || typeof results !== 'object') return 100;

    let totalPenalty = 0;
    for (const key of Object.keys(results)) {
        const scanner = results[key] as ScanResultItem | undefined;
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            for (const f of scanner.findings) {
                const sev = (f.severity || '').toLowerCase();
                if (dismissedFingerprints.has(buildFingerprint(key, f))) continue;
                totalPenalty += SEVERITY_PENALTY[sev] ?? 0;
            }
        }
    }
    if (totalPenalty === 0) return 100;
    const raw = 100 * Math.exp(-totalPenalty / DECAY_CONSTANT);
    return Math.min(100, Math.round(Math.max(5, raw)));
}
