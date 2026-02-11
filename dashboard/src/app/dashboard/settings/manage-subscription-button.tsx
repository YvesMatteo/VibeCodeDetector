'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ManageSubscriptionButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Portal failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Portal error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
            <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
                onClick={handleClick}
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Manage Subscription'}
            </Button>
        </div>
    );
}
