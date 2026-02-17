import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function getVibeRating(issues: number): { label: string; color: string; bg: string } {
    if (issues === 0) return { label: 'Clean', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (issues <= 3) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (issues <= 7) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (issues <= 15) return { label: 'Needs Work', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (issues <= 25) return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' };
}

function countIssues(results: any): number {
    if (!results || typeof results !== 'object') return 0;
    let count = 0;
    for (const key of Object.keys(results)) {
        const scanner = results[key];
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            count += scanner.findings.filter((f: any) => f.severity && f.severity.toLowerCase() !== 'info').length;
        }
    }
    return count;
}

export default async function ProjectHistoryPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: project } = await supabase
        .from('projects' as any)
        .select('id, name')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (!project) {
        return notFound();
    }

    const p = project as any;

    const PAGE_SIZE = 20;
    const { data: scans, count } = await supabase
        .from('scans')
        .select('id, url, status, overall_score, results, created_at, completed_at', { count: 'exact' })
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

    const totalScans = count || 0;

    return (
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-8">
                <Link
                    href={`/dashboard/projects/${params.id}`}
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {p.name}
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                    Audit History
                </h1>
                <p className="text-zinc-400 mt-1">
                    All audits for {p.name}
                </p>
            </div>

            {!scans || scans.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-zinc-500 text-sm">No audits have been run for this project yet.</p>
                </div>
            ) : (
                <div className="relative">
                    {scans.map((scan: any, index: number) => {
                        const issueCount = countIssues(scan.results);
                        const score = scan.overall_score;
                        const rating = getVibeRating(issueCount);
                        const date = new Date(scan.created_at);
                        const isFirst = index === 0;

                        return (
                            <div key={scan.id} className="relative flex gap-4 pb-8 last:pb-0">
                                {index < scans.length - 1 && (
                                    <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/[0.06]" />
                                )}
                                <div className={`relative z-10 mt-1 h-[35px] w-[35px] rounded-full flex items-center justify-center shrink-0 border ${
                                    isFirst ? 'bg-blue-500/15 border-blue-500/30' : 'bg-white/[0.03] border-white/[0.06]'
                                }`}>
                                    <span className={`text-xs font-bold ${isFirst ? 'text-blue-400' : 'text-zinc-500'}`}>
                                        {score ?? '—'}
                                    </span>
                                </div>
                                <Link
                                    href={`/dashboard/projects/${params.id}/history/${scan.id}`}
                                    className="flex-1 group"
                                >
                                    <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`${rating.bg} ${rating.color} text-xs border`}>{rating.label}</Badge>
                                                {isFirst && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs border">Latest</Badge>}
                                            </div>
                                            <span className="text-xs text-zinc-600">
                                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400">
                                            {issueCount} issue{issueCount !== 1 ? 's' : ''} found
                                            {score != null && <span className="text-zinc-600 ml-2">· Score: {score}</span>}
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
