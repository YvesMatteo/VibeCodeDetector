'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useScanProgress } from '@/lib/hooks/use-scan-progress';

interface RunAuditButtonProps {
    projectId: string;
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

const SCANNER_NAMES = [
    'Security Headers', 'API Keys', 'SSL/TLS', 'DNS', 'CORS', 'CSRF',
    'Cookies', 'Auth', 'XSS', 'SQLi', 'Redirects', 'Legal',
    'Threat Intel', 'Tech Stack', 'DDoS', 'File Upload', 'Audit Logging', 'Mobile API',
    'Supabase', 'Hosting', 'Dependencies', 'Scorecard',
];

export function RunAuditButton({ projectId, variant = 'default', size = 'default', className }: RunAuditButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanId, setScanId] = useState<string | null>(null);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [currentScanner, setCurrentScanner] = useState('');
    const router = useRouter();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Real-time progress from Supabase Realtime
    const realtimeProgress = useScanProgress(scanId);

    // Compute real progress percentage from realtime data
    const realPct = realtimeProgress.totalScanners > 0
        ? Math.round((realtimeProgress.completedScanners / realtimeProgress.totalScanners) * 100)
        : 0;

    // Merge real-time progress with the simulated fallback.
    // Real-time progress takes priority when available and ahead of the simulated value.
    useEffect(() => {
        if (!loading) return;

        if (realtimeProgress.status === 'completed') {
            setDisplayProgress(100);
            setCurrentScanner('Complete');
        } else if (realPct > 0 && realPct > displayProgress) {
            setDisplayProgress(realPct);
            // Pick a scanner name based on the real count
            const idx = Math.min(realtimeProgress.completedScanners, SCANNER_NAMES.length - 1);
            setCurrentScanner(SCANNER_NAMES[idx] || 'Scanning');
        }
    }, [realPct, realtimeProgress.status, realtimeProgress.completedScanners, loading, displayProgress]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    async function handleRunAudit() {
        setLoading(true);
        setError(null);
        setDisplayProgress(0);
        setScanId(null);
        setCurrentScanner('Initializing');

        // Simulated fallback progress: slowly ticks up in case Realtime
        // is slow or unavailable. Real-time updates override this.
        let step = 0;
        intervalRef.current = setInterval(() => {
            step++;
            setDisplayProgress((prev) => {
                // Only advance simulated if it's still ahead of real progress
                const simulated = Math.min(90, Math.round((step / 50) * 90));
                return Math.max(prev, simulated);
            });
            const idx = Math.floor((step / 50) * SCANNER_NAMES.length) % SCANNER_NAMES.length;
            setCurrentScanner((prev) => prev === 'Complete' ? prev : SCANNER_NAMES[idx]);
        }, 1000);

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });

            if (!response.ok) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                // Non-streaming error response (from early validation failures)
                const errorResult = await response.json().catch(() => ({ error: 'Audit failed' }));
                setError(errorResult.error || 'Audit failed');
                toast.error(errorResult.error || 'Audit failed');
                return;
            }

            // Read NDJSON stream: first line = { type: "started", scanId, totalScanners }
            //                      last line  = { type: "result", ... } or { type: "error", ... }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let finalResult: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                let newlineIdx: number;
                while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIdx).trim();
                    buffer = buffer.slice(newlineIdx + 1);

                    if (!line) continue;

                    try {
                        const chunk = JSON.parse(line);

                        if (chunk.type === 'started' && chunk.scanId) {
                            // Subscribe to real-time progress via the scanId
                            setScanId(chunk.scanId);
                        } else if (chunk.type === 'result') {
                            finalResult = chunk;
                        } else if (chunk.type === 'error') {
                            throw new Error(chunk.error || 'Scan failed');
                        }
                    } catch (parseErr) {
                        // If it's a thrown Error from our code, re-throw
                        if (parseErr instanceof Error && parseErr.message !== 'Unexpected') {
                            throw parseErr;
                        }
                        console.warn('Failed to parse NDJSON chunk:', line);
                    }
                }
            }

            if (intervalRef.current) clearInterval(intervalRef.current);

            if (finalResult) {
                setDisplayProgress(100);
                setCurrentScanner('Complete');
                toast.success(`Audit complete — Score: ${finalResult.overallScore ?? '—'}`);

                // Short delay to show completion state
                await new Promise(r => setTimeout(r, 800));
                router.refresh();
            } else {
                setError('No results received');
                toast.error('Scan completed but no results were received');
            }
        } catch (err) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            toast.error(message || 'An error occurred while running the audit');
        } finally {
            setLoading(false);
            setDisplayProgress(0);
            setCurrentScanner('');
            setScanId(null);
        }
    }

    const progressPct = displayProgress;
    const scannerCount = realtimeProgress.totalScanners > 0
        ? `${realtimeProgress.completedScanners}/${realtimeProgress.totalScanners}`
        : null;

    return (
        <div>
            <Button
                onClick={handleRunAudit}
                disabled={loading}
                variant={variant}
                size={size}
                className={className || 'bg-sky-500 hover:bg-sky-400 text-white border-0'}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {progressPct < 100
                            ? scannerCount
                                ? `Scanning... ${scannerCount}`
                                : `Scanning... ${progressPct}%`
                            : 'Done'}
                    </>
                ) : (
                    <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Audit
                    </>
                )}
            </Button>
            {loading && progressPct > 0 && progressPct < 100 && (
                <div className="mt-2 space-y-1">
                    <Progress
                        value={progressPct}
                        className="h-1.5 bg-white/[0.06]"
                        indicatorClassName="bg-sky-400"
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-zinc-500 truncate">{currentScanner}...</p>
                        {scannerCount && (
                            <p className="text-[11px] text-zinc-500 tabular-nums">{scannerCount} scanners</p>
                        )}
                    </div>
                </div>
            )}
            {loading && progressPct === 100 && (
                <div className="mt-2 flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Audit complete</span>
                </div>
            )}
            {error && !loading && (
                <p role="alert" className="text-sm text-red-400 mt-2">{error}</p>
            )}
        </div>
    );
}
