'use client';

import Link from 'next/link';
import { Clock, Globe, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

function timeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface ProjectCardProps {
    id: string;
    name: string;
    url: string;
    faviconUrl?: string | null;
    latestScore?: number | null;
    issueCount?: number;
    severity?: { critical: number; high: number; medium: number; low: number };
    lastAuditDate?: string | null;
    plan?: string;
}

export function ProjectCard({ id, name, url, faviconUrl, plan, issueCount = 0, severity, lastAuditDate }: ProjectCardProps) {
    const [imgError, setImgError] = useState(false);
    const hostname = (() => {
        try { return new URL(url).hostname; } catch { return url; }
    })();

    const hasAudit = lastAuditDate != null;

    // Cache-bust favicon so it refreshes after each scan
    const cacheBuster = lastAuditDate ? `?v=${new Date(lastAuditDate).getTime()}` : '';
    const faviconSrc = faviconUrl
        ? `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${lastAuditDate ? new Date(lastAuditDate).getTime() : '0'}`
        : `/api/favicon?domain=${hostname}&sz=64${cacheBuster ? `&_=${new Date(lastAuditDate!).getTime()}` : ''}`;

    return (
        <Link href={`/dashboard/projects/${id}`} className="group block h-full">
            <div className="relative h-full rounded-xl border border-[#2b2b2b] bg-[#1c1c1c] hover:border-[#3b3b3b] hover:bg-[#242424] px-5 py-5 flex flex-col transition-all duration-200 shadow-sm">

                {/* 3 dot menu - absolute positioned */}
                <button className="absolute top-5 right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                </button>

                {/* Top: Project Name & Subtitle */}
                <div className="mb-8 pr-10">
                    <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                        {name}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate mt-1 tracking-wide">
                        AWS <span className="mx-1.5 opacity-50">|</span> {hostname}
                    </p>
                </div>

                {/* Bottom Badges */}
                <div className="mt-auto flex items-center gap-2">
                    <Badge className="bg-[#24b47e]/10 text-[#24b47e] hover:bg-[#24b47e]/20 border-0 font-semibold h-5 text-[9px] uppercase tracking-wider px-1.5 rounded-sm">
                        ACTIVE
                    </Badge>
                    <Badge className="bg-white/5 text-zinc-400 hover:bg-white/10 border-0 font-semibold h-5 text-[9px] uppercase tracking-wider px-1.5 rounded-sm">
                        {plan === 'none' || !plan ? 'FREE' : plan.toUpperCase()}
                    </Badge>
                </div>
            </div>
        </Link>
    );
}

