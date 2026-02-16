'use client';

import { useState, useCallback } from 'react';
import { AuditReport, type AuditReportData } from './audit-report';
import type { ScanDiff } from '@/lib/scan-diff';
import type { Dismissal, DismissalReason, DismissalScope } from '@/lib/dismissals';

interface Props {
    data: AuditReportData;
    diff?: ScanDiff | null;
    previousScanDate?: string | null;
    projectId: string;
    scanId: string;
    initialDismissals: Dismissal[];
}

export function AuditReportWithDismissals({ data, diff, previousScanDate, projectId, scanId, initialDismissals }: Props) {
    const [dismissals, setDismissals] = useState<Dismissal[]>(initialDismissals);

    const dismissedFingerprints = new Set(dismissals.map(d => d.fingerprint));

    const handleDismiss = useCallback(async (
        fingerprint: string,
        scannerKey: string,
        finding: any,
        reason: DismissalReason,
        scope: DismissalScope,
        note?: string,
    ) => {
        try {
            const res = await fetch('/api/dismissals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, scanId, fingerprint, reason, note, scope }),
            });
            if (!res.ok) {
                console.error('Failed to dismiss finding:', await res.text());
                return;
            }
            const { dismissal } = await res.json();
            setDismissals(prev => [...prev.filter(d => d.fingerprint !== fingerprint), dismissal]);
        } catch (err) {
            console.error('Failed to dismiss finding:', err);
        }
    }, [projectId, scanId]);

    const handleRestore = useCallback(async (dismissalId: string) => {
        try {
            const res = await fetch(`/api/dismissals/${dismissalId}`, { method: 'DELETE' });
            if (!res.ok) {
                console.error('Failed to restore finding:', await res.text());
                return;
            }
            setDismissals(prev => prev.filter(d => d.id !== dismissalId));
        } catch (err) {
            console.error('Failed to restore finding:', err);
        }
    }, []);

    return (
        <AuditReport
            data={data}
            diff={diff}
            previousScanDate={previousScanDate}
            dismissedFingerprints={dismissedFingerprints}
            dismissals={dismissals}
            onDismiss={handleDismiss}
            onRestore={handleRestore}
        />
    );
}
