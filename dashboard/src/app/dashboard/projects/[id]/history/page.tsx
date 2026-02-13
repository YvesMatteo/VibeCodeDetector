import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { ScansTable } from '@/components/dashboard/scans-table';

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

    const { data: scans } = await supabase
        .from('scans')
        .select('id, url, status, overall_score, results, created_at, completed_at')
        .eq('project_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="p-4 md:p-8">
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
                <ScansTable scans={scans} />
            )}
        </div>
    );
}
