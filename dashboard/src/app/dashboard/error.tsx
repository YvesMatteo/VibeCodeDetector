'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Dashboard Error:', error);
    }, [error]);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center p-8">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">An unexpected error occurred</h2>
                <p className="text-muted-foreground max-w-[500px]">
                    An unexpected error occurred while loading this page. Please refresh the page or try again.
                </p>
            </div>
            <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Go Home
                </Button>
                <Button onClick={() => reset()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
            </div>
        </div>
    );
}
