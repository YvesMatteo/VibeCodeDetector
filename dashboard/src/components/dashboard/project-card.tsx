import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';

function getIssueCountColor(count: number) {
    if (count === 0) return 'text-emerald-400';
    if (count <= 3) return 'text-amber-400';
    if (count <= 7) return 'text-orange-400';
    return 'text-red-400';
}

function getScoreColor(score: number | null) {
    if (score === null) return 'text-zinc-600';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

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
    lastAuditDate?: string | null;
}

export function ProjectCard({ id, name, url, latestScore, issueCount = 0, lastAuditDate }: ProjectCardProps) {
    const hostname = (() => {
        try { return new URL(url).hostname; } catch { return url; }
    })();

    const hasAudit = lastAuditDate != null;

    return (
        <Link href={`/dashboard/projects/${id}`} className="group block">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-200 p-4">
                {/* Top row: favicon + name + arrow */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                            alt=""
                            className="h-9 w-9 rounded-lg object-contain shrink-0 bg-white/[0.04] p-1"
                        />
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-medium text-white truncate group-hover:text-white transition-colors">
                                {name}
                            </h3>
                            <p className="text-[12px] text-zinc-600 truncate">{hostname}</p>
                        </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-0.5" />
                </div>

                {/* Bottom row: score + issues + time */}
                {hasAudit ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {latestScore !== null && latestScore !== undefined && (
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl font-semibold tabular-nums ${getScoreColor(latestScore)}`}>
                                        {latestScore}
                                    </span>
                                    <span className="text-[11px] text-zinc-600">/100</span>
                                </div>
                            )}
                            <div className="h-4 w-px bg-white/[0.06]" />
                            <div className="flex items-baseline gap-1">
                                <span className={`text-sm font-medium tabular-nums ${getIssueCountColor(issueCount)}`}>
                                    {issueCount}
                                </span>
                                <span className="text-[11px] text-zinc-600">
                                    {issueCount === 1 ? 'issue' : 'issues'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                            <Clock className="h-3 w-3" />
                            {timeAgo(lastAuditDate!)}
                        </div>
                    </div>
                ) : (
                    <p className="text-[13px] text-zinc-600">No audits yet</p>
                )}
            </div>
        </Link>
    );
}
