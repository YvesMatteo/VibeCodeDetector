'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Link2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
    scanId: string;
    initialPublicId?: string | null;
    className?: string;
}

export function ShareButton({ scanId, initialPublicId, className }: ShareButtonProps) {
    const [publicId, setPublicId] = useState<string | null>(initialPublicId ?? null);
    const [loading, setLoading] = useState(false);
    const [showLink, setShowLink] = useState(false);

    async function handleShare() {
        if (publicId) {
            // Already shared — copy link
            const url = `${window.location.origin}/report/${publicId}`;
            await navigator.clipboard.writeText(url);
            toast.success('Public link copied to clipboard');
            setShowLink(true);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/scan/${scanId}/share`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to create public link. Please try again.');
                return;
            }
            setPublicId(data.publicId);
            const url = `${window.location.origin}/report/${data.publicId}`;
            await navigator.clipboard.writeText(url);
            toast.success('Public link created and copied to clipboard');
            setShowLink(true);
        } catch {
            toast.error('Failed to create public link. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleUnshare() {
        setLoading(true);
        try {
            const res = await fetch(`/api/scan/${scanId}/share`, { method: 'DELETE' });
            if (res.ok) {
                setPublicId(null);
                setShowLink(false);
                toast.success('Public link removed');
            }
        } catch {
            toast.error('Failed to remove public link. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`flex items-center gap-2 ${className ?? ''}`}>
            <Button
                variant="outline"
                onClick={handleShare}
                disabled={loading}
                className="bg-white/5 border-white/10"
            >
                {publicId ? <Link2 className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                {publicId ? 'Copy Link' : 'Share'}
            </Button>
            {publicId && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnshare}
                    disabled={loading}
                    className="text-zinc-500 hover:text-red-400 px-2"
                    title="Remove public link"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
