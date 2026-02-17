import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChevronRight } from 'lucide-react';
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form';

export default async function ProjectSettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: project, error: projectError } = await supabase
        .from('projects' as any)
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (projectError || !project) {
        return notFound();
    }

    const p = project as any;

    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
                <Link href="/dashboard" className="hover:text-white transition-colors">
                    Projects
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/dashboard/projects/${params.id}`} className="hover:text-white transition-colors truncate max-w-[200px]">
                    {p.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-zinc-300">Settings</span>
            </nav>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                    Project Settings
                </h1>
                <p className="text-zinc-400 mt-1">
                    Update your project configuration
                </p>
            </div>

            <ProjectSettingsForm
                projectId={params.id}
                initialData={{
                    name: p.name,
                    url: p.url,
                    github_repo: p.github_repo,
                    backend_type: p.backend_type,
                    backend_url: p.backend_url,
                    supabase_pat: p.supabase_pat,
                }}
            />
        </div>
    );
}
