import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban, Search, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProjectCard } from '@/components/dashboard/project-card';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { PageHeader } from '@/components/dashboard/page-header';

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

    const usageStats = planScansLimit > 0 ? (
        <div className="flex items-center gap-4 mt-1">
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
        <div className="flex items-center gap-3 mt-1">
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
    );

    return (
        <div>
            {/* Header */}
            <PageHeader
                title="Projects"
                description={usageStats}
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search for a project"
                                className="h-8 w-64 rounded-md bg-[#1c1c1c] border border-white/10 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                            />
                        </div>
                        <Button variant="outline" className="h-8 bg-[#1c1c1c] border-white/10 text-xs text-zinc-300 hover:bg-white/5 hover:text-white px-3">
                            Status <ChevronDown className="ml-1.5 h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-[#1c1c1c] border border-white/10 rounded-md p-0.5">
                            <button className="p-1 rounded bg-white/10 text-zinc-300">
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1 rounded text-zinc-500 hover:text-zinc-300">
                                <List className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <Button asChild className="bg-[#24b47e] text-white hover:bg-[#20a373] border-0 font-medium shadow-none h-8 text-xs rounded-md px-3">
                            <Link href="/dashboard/projects/new">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                New project
                            </Link>
                        </Button>
                    </div>
                </div>
            </PageHeader>

            {/* Content */}
            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                {projectsWithScans.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
                            <FolderKanban className="h-5 w-5 text-sky-400" />
                        </div>
                        <h2 className="text-sm font-medium text-zinc-200 mb-1.5">No projects yet</h2>
                        <p className="text-zinc-500 text-[13px] mb-6 max-w-sm mx-auto">
                            Create your first project to start running security audits.
                        </p>
                        <Button asChild className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white border border-white/[0.06] font-medium shadow-sm transition-all text-xs h-9">
                            <Link href="/dashboard/projects/new">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Create Project
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                plan={plan}
                            />
                        ))}
                    </div>
                )}

                {/* Onboarding modal for first-time users */}
                {projectsWithScans.length === 0 && <WelcomeModal />}
            </div>
        </div>
    );
}
