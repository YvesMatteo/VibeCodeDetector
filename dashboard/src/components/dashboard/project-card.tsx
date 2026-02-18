'use client';

import Link from 'next/link';
import { Clock, Globe } from 'lucide-react';
import { useState } from 'react';

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
}

export function ProjectCard({ id, name, url, faviconUrl, issueCount = 0, severity, lastAuditDate }: ProjectCardProps) {
    const [imgError, setImgError] = useState(false);
    const hostname = (() => {
        try { return new URL(url).hostname; } catch { return url; }
    })();

    const hasAudit = lastAuditDate != null;
    const sev = severity || { critical: 0, high: 0, medium: 0, low: 0 };
    const barTotal = issueCount || 1;

    // Cache-bust favicon so it refreshes after each scan
    const cacheBuster = lastAuditDate ? `?v=${new Date(lastAuditDate).getTime()}` : '';
    const faviconSrc = faviconUrl
        ? `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${lastAuditDate ? new Date(lastAuditDate).getTime() : '0'}`
        : `https://www.google.com/s2/favicons?domain=${hostname}&sz=64${cacheBuster ? `&_=${new Date(lastAuditDate!).getTime()}` : ''}`;

    return (
        <Link href={`/dashboard/projects/${id}`} className="group block h-full">
            <div className="relative h-full rounded-xl border border-zinc-800 bg-[#1C1C1C] px-5 py-5 flex flex-col transition-all duration-200 hover:border-zinc-700 hover:bg-[#232323]">
                {/* Top: favicon + name + time */}
                <div className="flex items-start gap-3 mb-6">
                    {imgError ? (
                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/50">
                            <Globe className="h-5 w-5 text-zinc-400" />
                        </div>
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={faviconSrc}
                            alt=""
                            className="h-10 w-10 rounded-lg object-contain shrink-0 bg-white p-1"
                            onError={() => setImgError(true)}
                        />
                    )}
                    <div className="min-w-0 flex-1 py-0.5">
                        <h3 className="text-[15px] font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
                            {name}
                        </h3>
                        <p className="text-[13px] text-zinc-500 truncate mt-0.5">{hostname}</p>
                    </div>
                    {hasAudit && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 mt-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(lastAuditDate!)}
                        </div>
                    )}
                </div>

                <div className="mt-auto">
                    {hasAudit ? (
                        <>
                            {/* Severity mini-bar */}
                            {issueCount > 0 && (
                                <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800 mb-4">
                                    {sev.critical > 0 && <div className="bg-red-500" style={{ width: `${(sev.critical / barTotal) * 100}%` }} />}
                                    {sev.high > 0 && <div className="bg-orange-500" style={{ width: `${(sev.high / barTotal) * 100}%` }} />}
                                    {sev.medium > 0 && <div className="bg-amber-500" style={{ width: `${(sev.medium / barTotal) * 100}%` }} />}
                                    {sev.low > 0 && <div className="bg-sky-500" style={{ width: `${(sev.low / barTotal) * 100}%` }} />}
                                </div>
                            )}

                            {/* Bottom: severity breakdown */}
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold text-zinc-200 tabular-nums">{issueCount}</span>
                                <span className="text-[13px] text-zinc-500">{issueCount === 1 ? 'Issues' : 'Issues'}</span>
                                {issueCount > 0 && (
                                    <div className="flex items-center gap-2 ml-auto">
                                        {sev.critical > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className="text-[11px] text-zinc-400 tabular-nums">{sev.critical}</span>
                                            </div>
                                        )}
                                        {sev.high > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                <span className="text-[11px] text-zinc-400 tabular-nums">{sev.high}</span>
                                            </div>
                                        )}
                                        {sev.medium > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                <span className="text-[11px] text-zinc-400 tabular-nums">{sev.medium}</span>
                                            </div>
                                        )}
                                        {sev.low > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                                <span className="text-[11px] text-zinc-400 tabular-nums">{sev.low}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-[13px] text-zinc-500">No audits yet</p>
                    )}
                </div>
            </div>
        </Link>
    );
}
