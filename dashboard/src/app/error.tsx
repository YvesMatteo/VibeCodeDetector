'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Application Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center p-4">
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">An unexpected error occurred</h2>
                <p className="text-zinc-400 max-w-md">An unexpected error occurred. Please refresh the page.</p>
                <Button onClick={reset} className="bg-sky-500 hover:bg-sky-400">
                    Try again
                </Button>
            </div>
        </div>
    );
}
