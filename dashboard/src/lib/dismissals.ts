/** Types and helpers for the finding dismissal system. */

export type DismissalReason = 'false_positive' | 'accepted_risk' | 'not_applicable' | 'will_fix_later';
export type DismissalScope = 'project' | 'scan';

export interface Dismissal {
    id: string;
    user_id: string;
    project_id: string | null;
    scan_id: string | null;
    fingerprint: string;
    reason: DismissalReason;
    note: string | null;
    scope: DismissalScope;
    created_at: string;
}

export interface DismissRequest {
    projectId: string;
    scanId: string;
    fingerprint: string;
    reason: DismissalReason;
    note?: string;
    scope: DismissalScope;
}

export const DISMISSAL_REASONS: { value: DismissalReason; label: string }[] = [
    { value: 'false_positive', label: 'False positive' },
    { value: 'accepted_risk', label: 'Accepted risk' },
    { value: 'not_applicable', label: 'Not applicable' },
    { value: 'will_fix_later', label: 'Will fix later' },
];

/**
 * Build a fingerprint for a finding, matching the format used in scan-diff.ts:
 * `scannerKey::findingId||title::severity`
 */
export function buildFingerprint(scannerKey: string, finding: { id?: string; title: string; severity: string }): string {
    return `${scannerKey}::${finding.id || finding.title}::${finding.severity}`;
}
