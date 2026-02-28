import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight } from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { AuditReport } from '@/components/dashboard/audit-report';
import { processAuditData, getMissingScannerNames } from '@/lib/audit-data';
import { ExportButton } from '@/components/dashboard/export-button';
import { formatDate } from '@/lib/format-date';

export default async function ProjectAuditDetailPage(props: { params: Promise<{ id: string; scanId: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: scan, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', params.scanId)
        .eq('user_id', user.id)
        .eq('project_id', params.id)
        .single();

    if (error || !scan) return notFound();

    const auditData = processAuditData(scan.results as Record<string, any>);
    const missingScanners = getMissingScannerNames(scan.results as Record<string, unknown>);

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
            {/* Breadcrumb within content */}
            <nav className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
                <Link href={`/dashboard/projects/${params.id}/history`} className="hover:text-white transition-colors">
                    History
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-zinc-300">
                    {formatDate(scan.completed_at || scan.created_at, 'short')}
                </span>
            </nav>

            {/* Scan info */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <Clock className="h-4 w-4" />
                        Scanned on {formatDate(scan.completed_at || scan.created_at, 'datetime')}
                    </div>
                    <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs">{scan.status}</Badge>
                    {scan.overall_score != null && (
                        <Badge variant="secondary" className="bg-sky-400/10 text-sky-400 border-sky-400/20 text-xs">
                            Score: {scan.overall_score}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    <AIFixPrompt url={scan.url} findings={auditData.allFindings} techStack={auditData.techStack} />
                    <ExportButton scanId={params.scanId} />
                </div>
            </div>

            {missingScanners.length > 0 && (
                <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-sm font-medium text-amber-400">Outdated scan results</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {missingScanners.length} new scanner{missingScanners.length > 1 ? 's' : ''} added since this audit:{' '}
                        <span className="text-zinc-300">{missingScanners.join(', ')}</span>.
                        Run a new audit from the project page to get full coverage.
                    </p>
                </div>
            )}

            <AuditReport data={auditData} />
        </div>
    );
}
