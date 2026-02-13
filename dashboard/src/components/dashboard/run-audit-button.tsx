'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

interface RunAuditButtonProps {
    projectId: string;
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

export function RunAuditButton({ projectId, variant = 'default', size = 'default', className }: RunAuditButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleRunAudit() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Audit failed');
                return;
            }

            router.refresh();
        } catch {
            setError('An error occurred');
        } finally {
            setLoading(false);
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
                        Running Audit...
                    </>
                ) : (
                    <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Audit
                    </>
                )}
            </Button>
            {error && (
                <p className="text-sm text-red-400 mt-2">{error}</p>
            )}
        </div>
    );
}
