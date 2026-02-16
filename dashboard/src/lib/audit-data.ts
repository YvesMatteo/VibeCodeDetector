/** Shared audit data types and processing — importable from both server and client components */

export interface ScanResultItem {
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
