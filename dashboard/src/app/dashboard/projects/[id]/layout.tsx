import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { ProjectTabNav } from '@/components/dashboard/project-tab-nav';
import { RunAuditButton } from '@/components/dashboard/run-audit-button';
import { Badge } from '@/components/ui/badge';

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!project) {
        return notFound();
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

    const userPlan = profile?.plan || 'none';
    const hostname = (() => {
        try { return new URL(project.url).hostname; } catch { return project.url; }
    })();

    const planColors: Record<string, string> = {
        starter: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        pro: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        max: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        none: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };

    return (
        <div className="min-h-screen">
            {/* Project header */}
            <div className="border-b border-white/[0.06] bg-background/50">
                <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
                            >
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                Projects
                            </Link>
                            <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={project.favicon_url || `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                                    alt=""
                                    className="h-8 w-8 rounded-md object-contain shrink-0 bg-white p-0.5 shadow-sm"
                                />
                                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white truncate">
                                    {project.name}
                                </h1>
                                <Badge className={`${planColors[userPlan] || planColors.none} text-[10px] font-medium border capitalize shrink-0`}>
                                    {userPlan === 'none' ? 'Free' : userPlan}
                                </Badge>
                                <a
                                    href={project.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1 ml-11">{hostname}</p>
                        </div>
                        <div className="shrink-0">
                            <RunAuditButton projectId={id} size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <ProjectTabNav projectId={id} />

            {/* Page content */}
            <div className="animate-fade-in-up">
                {children}
            </div>
        </div>
    );
}
