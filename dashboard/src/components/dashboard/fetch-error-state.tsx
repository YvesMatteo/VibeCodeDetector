'use client';

import { Button } from '@/components/ui/button';

interface FetchErrorStateProps {
    message?: string;
}

export function FetchErrorState({ message = 'Something went wrong. Please try again.' }: FetchErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-red-400">{message}</p>
            <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
                className="text-xs"
            >
                Retry
            </Button>
        </div>
    );
}
