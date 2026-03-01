/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase custom tables & dynamic scanner results */
export interface DiffFinding {
    finding: any;
    scannerKey: string;
}

export interface ScanDiff {
    newIssues: DiffFinding[];
    resolvedIssues: DiffFinding[];
    unchangedIssues: DiffFinding[];
}

/**
 * Compare two scans' findings to produce a diff.
 * Uses fingerprinting: `scannerKey::findingId||title::severity`
 */
export function computeScanDiff(
    currentResults: Record<string, any>,
    previousResults: Record<string, any>,
): ScanDiff {
    const currentFingerprints = new Map<string, DiffFinding>();
    const previousFingerprints = new Map<string, DiffFinding>();

    function collectFingerprints(results: Record<string, any>, target: Map<string, DiffFinding>) {
        for (const [key, result] of Object.entries(results)) {
            if (!result?.findings) continue;
            for (const f of result.findings) {
                if (f.severity === 'info') continue;
                const fp = `${key}::${f.id || f.title}::${f.severity}`;
                target.set(fp, { finding: f, scannerKey: key });
            }
        }
    }

    collectFingerprints(currentResults, currentFingerprints);
    collectFingerprints(previousResults, previousFingerprints);

    const newIssues: DiffFinding[] = [];
    const resolvedIssues: DiffFinding[] = [];
    const unchangedIssues: DiffFinding[] = [];

    for (const [fp, df] of currentFingerprints) {
        if (previousFingerprints.has(fp)) unchangedIssues.push(df);
        else newIssues.push(df);
    }
    for (const [fp, df] of previousFingerprints) {
        if (!currentFingerprints.has(fp)) resolvedIssues.push(df);
    }

    return { newIssues, resolvedIssues, unchangedIssues };
}
