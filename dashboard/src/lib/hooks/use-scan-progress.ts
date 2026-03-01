'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ScanProgress {
  /** Current scan status */
  status: 'pending' | 'running' | 'completed' | 'failed' | null;
  /** Number of scanners that have finished */
  completedScanners: number;
  /** Total number of scanners launched */
  totalScanners: number;
  /** Overall security score (available once completed) */
  overallScore: number | null;
  /** Whether we are actively subscribed */
  isSubscribed: boolean;
}

const INITIAL_STATE: ScanProgress = {
  status: null,
  completedScanners: 0,
  totalScanners: 0,
  overallScore: null,
  isSubscribed: false,
};

/**
 * Subscribe to real-time scan progress updates via Supabase Realtime.
 *
 * Pass `scanId` once it is known (after POST /api/scan returns it).
 * Pass `null` to not subscribe.
 *
 * The hook automatically cleans up the subscription on unmount or when
 * `scanId` changes.
 */
export function useScanProgress(scanId: string | null): ScanProgress {
  const [progress, setProgress] = useState<ScanProgress>(INITIAL_STATE);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setProgress(INITIAL_STATE);
  }, []);

  useEffect(() => {
    if (!scanId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset
      cleanup();
      return;
    }

    const supabase = supabaseRef.current;

    // Create a channel that listens for UPDATE events on the specific scan row
    const channel = supabase
      .channel(`scan-progress-${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- realtime payload
          const row = payload.new as Record<string, any>;
          setProgress({
            status: row.status ?? null,
            completedScanners: row.scanners_completed ?? 0,
            totalScanners: row.scanners_total ?? 0,
            overallScore: row.overall_score ?? null,
            isSubscribed: true,
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setProgress((prev) => ({ ...prev, isSubscribed: true }));
        }
      });

    channelRef.current = channel;

    // Also do an initial fetch of the scan row to catch updates that
    // happened before we subscribed (race condition guard).
    // Note: scanners_completed/scanners_total are new columns not in generated types,
    // so we select all and cast to any.
    supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
      .then(({ data }: { data: any }) => {
        if (data) {
          setProgress((prev) => ({
            ...prev,
            status: data.status ?? prev.status,
            completedScanners: data.scanners_completed ?? prev.completedScanners,
            totalScanners: data.scanners_total ?? prev.totalScanners,
            overallScore: data.overall_score ?? prev.overallScore,
          }));
        }
      });

    return cleanup;
  }, [scanId, cleanup]);

  return progress;
}
