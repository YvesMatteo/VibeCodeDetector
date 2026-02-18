import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProjectCard } from '@/components/dashboard/project-card';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch profile for usage info
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_scans_used, plan_scans_limit, plan_domains')
        .eq('id', user.id)
        .single();

    const plan = profile?.plan || 'none';
    const planScansUsed = profile?.plan_scans_used || 0;
    const planScansLimit = profile?.plan_scans_limit || 0;
    const projectLimit = profile?.plan_domains || 0;

    // Fetch projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const projectList = projects || [];

    // For each project, get the latest scan with severity breakdown
    const projectsWithScans = await Promise.all(
        projectList.map(async (project) => {
            const { data: latestScan } = await supabase
                .from('scans')
                .select('id, overall_score, completed_at, results')
                .eq('project_id', project.id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(1)
                .single();

            const severity = { critical: 0, high: 0, medium: 0, low: 0 };
            let issueCount = 0;
            if (latestScan?.results) {
                const results = latestScan.results as Record<string, any>;
                Object.values(results).forEach((r: any) => {
                    if (r.findings && Array.isArray(r.findings)) {
                        r.findings.forEach((f: any) => {
                            const sev = f.severity?.toLowerCase();
                            if (sev === 'info') return;
                            issueCount++;
                            if (sev === 'critical') severity.critical++;
                            else if (sev === 'high') severity.high++;
                            else if (sev === 'medium') severity.medium++;
                            else severity.low++;
                        });
                    }
                });
            }

            return {
                ...project,
                latestScore: latestScan?.overall_score ?? null,
                lastAuditDate: latestScan?.completed_at ?? null,
                issueCount,
                severity,
            };
        })
    );

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                        Projects
                    </h1>
                    {planScansLimit > 0 ? (
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-[13px] text-zinc-500">
                                <span className="text-zinc-300 font-medium tabular-nums">{planScansUsed}</span>
                                <span className="text-zinc-600">/{planScansLimit}</span> scans
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className="text-[13px] text-zinc-500">
                                <span className="text-zinc-300 font-medium tabular-nums">{projectList.length}</span>
                                <span className="text-zinc-600">/{projectLimit}</span> projects
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[13px] text-zinc-500">
                                Free plan
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className="text-[13px] text-zinc-500">
                                <span className="text-zinc-300 font-medium tabular-nums">{projectList.length}</span>
                                <span className="text-zinc-600">/1</span> project
                            </span>
                            <span className="text-zinc-700">·</span>
                            <Link href="/dashboard/credits" className="text-[13px] text-sky-400 hover:text-sky-300 transition-colors font-medium">
                                Upgrade
                            </Link>
                        </div>
                    )}
                </div>
                <Button asChild className="bg-sky-400 text-white hover:bg-sky-500 border-0 font-medium">
                    <Link href="/dashboard/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Link>
                </Button>
            </div>

            {/* Project Grid */}
            {projectsWithScans.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-200/60 flex items-center justify-center mx-auto mb-4">
                        <FolderKanban className="h-5 w-5 text-sky-400" />
                    </div>
                    <h2 className="text-base font-medium text-white mb-1.5">No projects yet</h2>
                    <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                        Create your first project to start running security audits.
                    </p>
                    <Button asChild className="bg-sky-400 text-white hover:bg-sky-500 border-0 font-medium">
                        <Link href="/dashboard/projects/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Project
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectsWithScans.map((project) => (
                        <ProjectCard
                            key={project.id}
                            id={project.id}
                            name={project.name}
                            url={project.url}
                            faviconUrl={project.favicon_url}
                            latestScore={project.latestScore}
                            issueCount={project.issueCount}
                            severity={project.severity}
                            lastAuditDate={project.lastAuditDate}
                        />
                    ))}
                </div>
            )}

            {/* Onboarding modal for first-time users */}
            {projectsWithScans.length === 0 && <WelcomeModal />}
        </div>
    );
}
