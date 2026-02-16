import Link from 'next/link';
import { Clock } from 'lucide-react';

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
    latestScore?: number | null;
    issueCount?: number;
    severity?: { critical: number; high: number; medium: number; low: number };
    lastAuditDate?: string | null;
}

export function ProjectCard({ id, name, url, issueCount = 0, severity, lastAuditDate }: ProjectCardProps) {
    const hostname = (() => {
        try { return new URL(url).hostname; } catch { return url; }
    })();

    const hasAudit = lastAuditDate != null;
    const sev = severity || { critical: 0, high: 0, medium: 0, low: 0 };
    const barTotal = issueCount || 1;

    return (
        <Link href={`/dashboard/projects/${id}`} className="group block">
            <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.03]">
                {/* Top: favicon + name + time */}
                <div className="flex items-center gap-3 mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                        alt=""
                        className="h-8 w-8 rounded-md object-contain shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {name}
                        </h3>
                        <p className="text-[12px] text-zinc-600 truncate">{hostname}</p>
                    </div>
                    {hasAudit && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-600 shrink-0">
                            <Clock className="h-3 w-3" />
                            {timeAgo(lastAuditDate!)}
                        </div>
                    )}
                </div>

                {hasAudit ? (
                    <>
                        {/* Severity mini-bar */}
                        {issueCount > 0 && (
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04] mb-4">
                                {sev.critical > 0 && <div className="bg-red-500" style={{ width: `${(sev.critical / barTotal) * 100}%` }} />}
                                {sev.high > 0 && <div className="bg-orange-500" style={{ width: `${(sev.high / barTotal) * 100}%` }} />}
                                {sev.medium > 0 && <div className="bg-amber-500" style={{ width: `${(sev.medium / barTotal) * 100}%` }} />}
                                {sev.low > 0 && <div className="bg-blue-500" style={{ width: `${(sev.low / barTotal) * 100}%` }} />}
                            </div>
                        )}

                        {/* Bottom: severity breakdown */}
                        <div className="flex items-center gap-3">
                            <span className="text-base font-semibold text-white tabular-nums">{issueCount}</span>
                            <span className="text-[12px] text-zinc-600">{issueCount === 1 ? 'issue' : 'issues'}</span>
                            {issueCount > 0 && (
                                <div className="flex items-center gap-2 ml-auto">
                                    {sev.critical > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <span className="text-[11px] text-zinc-500 tabular-nums">{sev.critical}</span>
                                        </div>
                                    )}
                                    {sev.high > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            <span className="text-[11px] text-zinc-500 tabular-nums">{sev.high}</span>
                                        </div>
                                    )}
                                    {sev.medium > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[11px] text-zinc-500 tabular-nums">{sev.medium}</span>
                                        </div>
                                    )}
                                    {sev.low > 0 && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-[11px] text-zinc-500 tabular-nums">{sev.low}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-[12px] text-zinc-600">No audits yet</p>
                )}
            </div>
        </Link>
    );
}
