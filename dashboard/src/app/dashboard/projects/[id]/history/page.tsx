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
        <div className="p-5 md:p-10 max-w-6xl">
            <div className="mb-10">
                <Link
                    href={`/dashboard/projects/${params.id}`}
                    className="inline-flex items-center text-zinc-500 hover:text-white text-[13px] mb-6 transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to {p.name}
                </Link>
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    Audit History
                </h1>
                <p className="text-zinc-500 text-[15px]">
                    All audits for {p.name}
                </p>
            </div>

            {!scans || scans.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-12 text-center">
                    <p className="text-zinc-500 text-[13px]">No audits have been run for this project yet.</p>
                </div>
            ) : (
                <ScansTable scans={scans} />
            )}
        </div>
    );
}
