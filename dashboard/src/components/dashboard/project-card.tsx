import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

function getIssueCountColor(count: number) {
    if (count === 0) return 'text-emerald-400';
    if (count <= 3) return 'text-amber-400';
    if (count <= 7) return 'text-orange-400';
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
        <Link href={`/dashboard/projects/${id}`}>
            <Card className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer group h-full">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                            alt=""
                            className="h-8 w-8 rounded-md object-contain mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                {name}
                            </h3>
                            <p className="text-xs text-zinc-500 truncate">{hostname}</p>
                        </div>
                    </div>

                    {hasAudit ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${getIssueCountColor(issueCount)}`}>
                                    {issueCount}
                                </span>
                                <span className="text-xs text-zinc-500">
                                    {issueCount === 1 ? 'issue' : 'issues'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-zinc-600">
                                <Clock className="h-3 w-3" />
                                {timeAgo(lastAuditDate!)}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-600">No audits yet</p>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
