import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    ExternalLink,
    Clock,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { AuditReport } from '@/components/dashboard/audit-report';
import { processAuditData, getMissingScannerNames } from '@/lib/audit-data';
import { ExportButton } from '@/components/dashboard/export-button';

export default async function ProjectAuditDetailPage(props: { params: Promise<{ id: string; scanId: string }> }) {
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

    const { data: scan, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', params.scanId)
        .eq('user_id', user.id)
        .single();

    if (error || !scan) {
        return notFound();
    }

    const auditData = processAuditData(scan.results as Record<string, any>);
    const missingScanners = getMissingScannerNames(scan.results as Record<string, unknown>);

    return (
        <div className="p-4 md:p-8">
            {/* Breadcrumb */}
            <div className="mb-8">
                <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
                    <Link href="/dashboard" className="hover:text-white transition-colors">Projects</Link>
                    <span>/</span>
                    <Link href={`/dashboard/projects/${params.id}`} className="hover:text-white transition-colors">{p.name}</Link>
                    <span>/</span>
                    <Link href={`/dashboard/projects/${params.id}/history`} className="hover:text-white transition-colors">History</Link>
                    <span>/</span>
                    <span className="text-zinc-300">{new Date(scan.completed_at || scan.created_at).toLocaleDateString()}</span>
                </nav>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white break-all">{scan.url.replace(/^https?:\/\//, '')}</h1>
                            <a
                                href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Scanned on {new Date(scan.completed_at || scan.created_at).toLocaleString()}
                            </div>
                            <Badge variant="secondary" className="bg-white/5 border-white/10">{scan.status}</Badge>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <AIFixPrompt url={scan.url} findings={auditData.allFindings} techStack={auditData.techStack} />
                        <ExportButton scanId={params.scanId} className="flex-1 sm:flex-none" />
                    </div>
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
