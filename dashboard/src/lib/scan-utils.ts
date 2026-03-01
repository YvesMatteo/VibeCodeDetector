/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase custom tables & dynamic scanner results */
/**
 * Shared utilities for computing issue counts from scan results.
 *
 * These are used server-side to pre-compute severity breakdowns so that the
 * heavy `results` JSON blob never needs to be sent to the client.
 */

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
    results: Record<string, any> | null | undefined
): IssueCounts {
    const counts: IssueCounts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    if (!results || typeof results !== 'object') return counts;

    for (const key of Object.keys(results)) {
        const scanner = results[key];
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
