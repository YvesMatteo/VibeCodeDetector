'use client';

import { useState, useCallback, useMemo } from 'react';
import { AuditReport, type AuditReportData } from './audit-report';
import type { ScanDiff } from '@/lib/scan-diff';
import type { Dismissal, DismissalReason, DismissalScope } from '@/lib/dismissals';
import { toast } from 'sonner';

interface Props {
    data: AuditReportData;
    diff?: ScanDiff | null;
    previousScanDate?: string | null;
    projectId: string;
    scanId: string;
    initialDismissals: Dismissal[];
    userPlan?: string;
}

export function AuditReportWithDismissals({ data, diff, previousScanDate, projectId, scanId, initialDismissals, userPlan }: Props) {
    const [dismissals, setDismissals] = useState<Dismissal[]>(initialDismissals);

    const dismissedFingerprints = useMemo(
        () => new Set(dismissals.map(d => d.fingerprint)),
        [dismissals],
    );

    const handleDismiss = useCallback(async (
        fingerprint: string,
        scannerKey: string,
        finding: any,
        reason: DismissalReason,
        scope: DismissalScope,
        note?: string,
    ) => {
        // Build an optimistic dismissal object so the UI updates immediately
        const optimisticId = `optimistic-${Date.now()}`;
        const optimistic: Dismissal = {
            id: optimisticId,
            user_id: '',
            project_id: projectId,
            scan_id: scanId,
            fingerprint,
            reason,
            note: note ?? null,
            scope,
            created_at: new Date().toISOString(),
        };

        // Optimistically add the dismissal
        setDismissals(prev => [...prev.filter(d => d.fingerprint !== fingerprint), optimistic]);
        toast.success('Finding dismissed');

        // Fire the API call in the background
        try {
            const res = await fetch('/api/dismissals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, scanId, fingerprint, reason, note, scope }),
            });
            if (!res.ok) {
                // Revert: remove the optimistic dismissal
                setDismissals(prev => prev.filter(d => d.id !== optimisticId));
                toast.error('Failed to dismiss finding. Please try again.');
                console.error('Failed to dismiss finding:', await res.text());
                return;
            }
            // Replace the optimistic entry with the real server dismissal
            const { dismissal } = await res.json();
            setDismissals(prev => prev.map(d => d.id === optimisticId ? dismissal : d));
        } catch (err) {
            // Revert: remove the optimistic dismissal
            setDismissals(prev => prev.filter(d => d.id !== optimisticId));
            toast.error('Failed to dismiss finding. Please check your connection and try again.');
            console.error('Failed to dismiss finding:', err);
        }
    }, [projectId, scanId]);

    const handleRestore = useCallback(async (dismissalId: string) => {
        // Capture the dismissal being removed so we can revert if needed
        let removed: Dismissal | undefined;

        // Optimistically remove the dismissal
        setDismissals(prev => {
            removed = prev.find(d => d.id === dismissalId);
            return prev.filter(d => d.id !== dismissalId);
        });
        toast.success('Finding restored');

        // Fire the API call in the background
        try {
            const res = await fetch(`/api/dismissals/${dismissalId}`, { method: 'DELETE' });
            if (!res.ok) {
                // Revert: add the dismissal back
                if (removed) {
                    setDismissals(prev => [...prev, removed!]);
                }
                toast.error('Failed to restore finding. Please try again.');
                console.error('Failed to restore finding:', await res.text());
                return;
            }
        } catch (err) {
            // Revert: add the dismissal back
            if (removed) {
                setDismissals(prev => [...prev, removed!]);
            }
            toast.error('Failed to restore finding. Please check your connection and try again.');
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
            userPlan={userPlan}
        />
    );
}
