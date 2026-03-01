'use client';

import { useState, useCallback, useMemo } from 'react';
import { AuditReport, type AuditReportData } from './audit-report';
import type { ScanDiff } from '@/lib/scan-diff';
import { buildFingerprint, type Dismissal, type DismissalReason, type DismissalScope } from '@/lib/dismissals';
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
        _scannerKey: string,
        _finding: { id?: string; title: string; severity: string; description?: string; recommendation?: string },
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

    const handleDismissAll = useCallback(async () => {
        // Collect all undismissed, non-info findings
        const toDismiss: { fingerprint: string; scannerKey: string; finding: { id?: string; title: string; severity: string } }[] = [];
        for (const [key, result] of Object.entries(data.results)) {
            if ('skipped' in result && result.skipped) continue;
            if (!result.findings || !Array.isArray(result.findings)) continue;
            for (const f of result.findings) {
                const sev = f.severity?.toLowerCase();
                if (sev === 'info') continue;
                const fp = buildFingerprint(key, f);
                if (dismissedFingerprints.has(fp)) continue;
                toDismiss.push({ fingerprint: fp, scannerKey: key, finding: f });
            }
        }

        if (toDismiss.length === 0) return;

        // Optimistically add all dismissals
        const optimistics: Dismissal[] = toDismiss.map((item, i) => ({
            id: `optimistic-all-${Date.now()}-${i}`,
            user_id: '',
            project_id: projectId,
            scan_id: scanId,
            fingerprint: item.fingerprint,
            reason: 'not_applicable' as const,
            note: null,
            scope: 'project' as const,
            created_at: new Date().toISOString(),
        }));

        setDismissals(prev => {
            const existing = new Set(prev.map(d => d.fingerprint));
            return [...prev, ...optimistics.filter(o => !existing.has(o.fingerprint))];
        });
        toast.success(`${toDismiss.length} findings dismissed`);

        // Fire all API calls in parallel
        const results = await Promise.allSettled(
            toDismiss.map(item =>
                fetch('/api/dismissals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        scanId,
                        fingerprint: item.fingerprint,
                        reason: 'not_applicable',
                        scope: 'project',
                    }),
                }).then(async res => {
                    if (!res.ok) throw new Error(await res.text());
                    return res.json();
                })
            )
        );

        // Replace optimistic entries with real ones where successful
        setDismissals(prev => {
            const updated = [...prev];
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                if (r.status === 'fulfilled') {
                    const idx = updated.findIndex(d => d.id === optimistics[i].id);
                    if (idx !== -1) updated[idx] = r.value.dismissal;
                } else {
                    // Remove failed optimistic entries
                    const idx = updated.findIndex(d => d.id === optimistics[i].id);
                    if (idx !== -1) updated.splice(idx, 1);
                }
            }
            return updated;
        });

        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            toast.error(`${failed} dismissals failed. Try again.`);
        }
    }, [data.results, dismissedFingerprints, projectId, scanId]);

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
            onDismissAll={handleDismissAll}
            onRestore={handleRestore}
            userPlan={userPlan}
        />
    );
}
