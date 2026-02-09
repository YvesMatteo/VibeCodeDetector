'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ManageSubscriptionButton() {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Portal failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Portal error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
            onClick={handleClick}
            disabled={loading}
        >
            {loading ? 'Loading...' : 'Manage Subscription'}
        </Button>
    );
}
