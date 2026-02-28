import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, Minus } from 'lucide-react';
import type { ScanDiff } from '@/lib/scan-diff';
import { formatDate } from '@/lib/format-date';

interface ScanDiffBannerProps {
    diff: ScanDiff;
    previousScanDate: string;
}

export function ScanDiffBanner({ diff, previousScanDate }: ScanDiffBannerProps) {
    const { newIssues, resolvedIssues, unchangedIssues } = diff;
    const hasChanges = newIssues.length > 0 || resolvedIssues.length > 0;

    if (!hasChanges && unchangedIssues.length === 0) return null;

    return (
        <Card className="bg-zinc-900/40 border-white/5 mb-8">
            <CardContent className="py-4">
                <p className="text-xs text-zinc-500 mb-3">Since last check ({formatDate(previousScanDate)})</p>
                <div className="flex flex-wrap items-center gap-5">
                    {resolvedIssues.length > 0 && (
                        <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-400">{resolvedIssues.length}</span>
                            <span className="text-xs text-zinc-400">resolved</span>
                        </div>
                    )}
                    {newIssues.length > 0 && (
                        <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-4 w-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">{newIssues.length}</span>
                            <span className="text-xs text-zinc-400">new</span>
                        </div>
                    )}
                    {unchangedIssues.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Minus className="h-4 w-4 text-zinc-500" />
                            <span className="text-sm font-medium text-zinc-400">{unchangedIssues.length}</span>
                            <span className="text-xs text-zinc-500">unchanged</span>
                        </div>
                    )}
                    {!hasChanges && (
                        <span className="text-xs text-zinc-500">No changes detected since last check.</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
