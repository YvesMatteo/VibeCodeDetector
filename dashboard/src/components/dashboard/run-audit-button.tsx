'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

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
];

export function RunAuditButton({ projectId, variant = 'default', size = 'default', className }: RunAuditButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentScanner, setCurrentScanner] = useState('');
    const router = useRouter();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    async function handleRunAudit() {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Simulate progress while waiting for the real scan to complete
        let step = 0;
        intervalRef.current = setInterval(() => {
            step++;
            const pct = Math.min(95, Math.round((step / 40) * 95));
            setProgress(pct);
            const idx = Math.floor((step / 40) * SCANNER_NAMES.length) % SCANNER_NAMES.length;
            setCurrentScanner(SCANNER_NAMES[idx]);
        }, 1200);

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });

            const result = await response.json();

            if (intervalRef.current) clearInterval(intervalRef.current);

            if (!response.ok) {
                setError(result.error || 'Audit failed');
                toast.error(result.error || 'Audit failed');
                return;
            }

            setProgress(100);
            setCurrentScanner('Complete');
            toast.success(`Audit complete — Score: ${result.overallScore ?? '—'}`);

            // Short delay to show completion state
            await new Promise(r => setTimeout(r, 800));
            router.refresh();
        } catch {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setError('An error occurred');
            toast.error('An error occurred while running the audit');
        } finally {
            setLoading(false);
            setProgress(0);
            setCurrentScanner('');
        }
    }

    return (
        <div>
            <Button
                onClick={handleRunAudit}
                disabled={loading}
                variant={variant}
                size={size}
                className={className || 'bg-blue-600 hover:bg-blue-500 text-white border-0'}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {progress < 100 ? `Scanning... ${progress}%` : 'Done'}
                    </>
                ) : (
                    <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Audit
                    </>
                )}
            </Button>
            {loading && progress > 0 && progress < 100 && (
                <div className="mt-2 space-y-1">
                    <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">{currentScanner}...</p>
                </div>
            )}
            {loading && progress === 100 && (
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
