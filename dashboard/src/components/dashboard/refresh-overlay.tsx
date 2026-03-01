'use client';

import { useEffect, useState } from 'react';

/**
 * Listens for a custom "scan-refresh-start" / "scan-refresh-end" event
 * dispatched by RunAuditButton, and adds a pulsing overlay to its children
 * to indicate scores are being updated.
 */
export function RefreshOverlay({ children }: { children: React.ReactNode }) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const onStart = () => setIsRefreshing(true);
        const onEnd = () => setIsRefreshing(false);
        window.addEventListener('scan-refresh-start', onStart);
        window.addEventListener('scan-refresh-end', onEnd);
        return () => {
            window.removeEventListener('scan-refresh-start', onStart);
            window.removeEventListener('scan-refresh-end', onEnd);
        };
    }, []);

    return (
        <div className="relative">
            {isRefreshing && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none animate-fade-in">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <div className="h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                        Updating scores...
                    </div>
                </div>
            )}
            <div className={isRefreshing ? 'opacity-50 transition-opacity duration-300' : 'transition-opacity duration-300'}>
                {children}
            </div>
        </div>
    );
}
