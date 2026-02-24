'use client';

import Link from 'next/link';
import { Clock, Globe, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    backendType?: string | null;
    monitoringFrequency?: string | null;
}

const FREQ_LABELS: Record<string, string> = {
    every_6h: 'Every 6h',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
};

export function ProjectCard({ id, name, url, faviconUrl, plan, latestScore, issueCount = 0, severity, lastAuditDate, backendType, monitoringFrequency }: ProjectCardProps) {
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

    const platformLabel = backendType ? backendType.charAt(0).toUpperCase() + backendType.slice(1) : hostname.split('.').pop()?.toUpperCase() || 'WEB';

    return (
        <Link href={`/dashboard/projects/${id}`} className="group block h-full">
            <div className="relative h-full rounded-xl border border-[#2b2b2b] bg-[#1c1c1c] hover:border-[#3b3b3b] hover:bg-[#242424] px-5 py-5 flex flex-col transition-all duration-200 shadow-sm">

                {/* 3 dot menu - absolute positioned */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="absolute top-5 right-4 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.preventDefault()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1c1c1c] border-[#2b2b2b]">
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/projects/${id}`} className="text-zinc-300">View Project</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/dashboard/projects/${id}/settings`} className="text-zinc-300">Settings</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Top: Project Name & Subtitle */}
                <div className="mb-4 pr-10">
                    <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                        {name}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate mt-1 tracking-wide">
                        {platformLabel} <span className="mx-1.5 opacity-50">|</span> {hostname}
                    </p>
                </div>

                {/* Score & Issues */}
                {latestScore != null && (
                    <div className="mb-4 flex items-center gap-3">
                        <div className={`text-2xl font-bold ${latestScore >= 80 ? 'text-emerald-400' : latestScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {latestScore}
                        </div>
                        <div className="text-xs text-zinc-500">/ 100</div>
                        {issueCount > 0 && (
                            <div className="ml-auto flex items-center gap-1.5">
                                {severity?.critical ? <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">{severity.critical}C</span> : null}
                                {severity?.high ? <span className="text-[10px] font-medium text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">{severity.high}H</span> : null}
                                {severity?.medium ? <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">{severity.medium}M</span> : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Badges */}
                <div className="mt-auto flex items-center gap-2">
                    <Badge className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-0 font-semibold h-5 text-[9px] uppercase tracking-wider px-1.5 rounded-sm">
                        ACTIVE
                    </Badge>
                    <Badge className="bg-white/5 text-zinc-400 hover:bg-white/10 border-0 font-semibold h-5 text-[9px] uppercase tracking-wider px-1.5 rounded-sm">
                        {plan === 'none' || !plan ? 'FREE' : plan.toUpperCase()}
                    </Badge>
                    {monitoringFrequency && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0 font-semibold h-5 text-[9px] uppercase tracking-wider px-1.5 rounded-sm ml-auto">
                            {FREQ_LABELS[monitoringFrequency] || monitoringFrequency}
                        </Badge>
                    )}
                </div>
            </div>
        </Link>
    );
}

