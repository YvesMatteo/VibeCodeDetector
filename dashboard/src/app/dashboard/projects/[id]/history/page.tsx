/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase custom tables & dynamic scanner results */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { ScoreChart } from '@/components/dashboard/score-chart';
import { formatDate } from '@/lib/format-date';

function getVibeRating(score: number | null): { label: string; color: string; bg: string } {
    if (score === null) return { label: 'Pending', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' };
    if (score >= 90) return { label: 'Clean', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 75) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (score >= 60) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (score >= 40) return { label: 'Needs Work', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (score >= 20) return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' };
}

export default async function ProjectHistoryPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: project } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (!project) return notFound();

    const PAGE_SIZE = 20;
    const { data: scans, count } = await supabase
        .from('scans')
        .select('id, url, status, overall_score, created_at, completed_at', { count: 'exact' })
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

    const totalScans = count || 0;

    // Chart data (oldest first)
    const chartData = (scans || [])
        .filter(s => s.overall_score !== null && s.status === 'completed')
        .reverse()
        .map(s => ({
            date: new Date(s.completed_at || s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: s.overall_score!,
        }));

    return (
        <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
            {/* Score trend chart */}
            {chartData.length >= 2 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mb-8">
                    <h3 className="text-sm font-medium text-white mb-4">Score Over Time</h3>
                    <ScoreChart data={chartData} height={200} />
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-white">All Audits</h2>
                <span className="text-xs text-zinc-500">{totalScans} total</span>
            </div>

            {!scans || scans.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-zinc-500 text-sm">No audits have been run for this project yet.</p>
                </div>
            ) : (
                <div className="relative">
                    {scans.map((scan: any, index: number) => {
                        const score = scan.overall_score;
                        const rating = getVibeRating(score);
                        const date = new Date(scan.created_at);
                        const isFirst = index === 0;

                        return (
                            <div key={scan.id} className="relative flex gap-4 pb-8 last:pb-0">
                                {index < scans.length - 1 && (
                                    <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/[0.06]" />
                                )}
                                <div className={`relative z-10 mt-1 h-[35px] w-[35px] rounded-full flex items-center justify-center shrink-0 border ${
                                    isFirst ? 'bg-sky-400/15 border-sky-400/30' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className={`text-xs font-bold ${isFirst ? 'text-sky-400' : 'text-zinc-500'}`}>
                                        {score ?? '—'}
                                    </span>
                                </div>
                                <Link
                                    href={`/dashboard/projects/${params.id}/report?scanId=${scan.id}`}
                                    className="flex-1 group"
                                >
                                    <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`${rating.bg} ${rating.color} text-xs border`}>{rating.label}</Badge>
                                                {isFirst && <Badge className="bg-sky-400/10 text-sky-400 border-sky-400/20 text-xs border">Latest</Badge>}
                                            </div>
                                            <span className="text-xs text-zinc-600">
                                                {formatDate(date, 'datetime')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400">
                                            Score: {score ?? '\u2014'}/100
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
