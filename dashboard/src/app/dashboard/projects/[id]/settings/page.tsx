import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form';

export default async function ProjectSettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (projectError || !project) return notFound();

    return (
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
            <div className="mb-8">
                <h2 className="text-lg font-medium text-white">Project Settings</h2>
                <p className="text-zinc-500 text-sm mt-1">Update your project configuration</p>
            </div>

            <ProjectSettingsForm
                projectId={params.id}
                initialData={{
                    name: project.name,
                    url: project.url,
                    github_repo: project.github_repo,
                    backend_type: project.backend_type,
                    backend_url: project.backend_url,
                    has_supabase_pat: !!project.supabase_pat,
                }}
            />
        </div>
    );
}
