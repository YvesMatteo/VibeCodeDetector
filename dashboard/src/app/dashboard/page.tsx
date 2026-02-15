import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Activity, FolderKanban } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProjectCard } from '@/components/dashboard/project-card';

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
        .from('projects' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const projectList = (projects || []) as any[];

    // For each project, get the latest scan
    const projectsWithScans = await Promise.all(
        projectList.map(async (project: any) => {
            const { data: latestScan } = await supabase
                .from('scans')
                .select('id, overall_score, completed_at, results')
                .eq('project_id', project.id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(1)
                .single();

            let issueCount = 0;
            if (latestScan?.results) {
                const results = latestScan.results as Record<string, any>;
                Object.values(results).forEach((r: any) => {
                    if (r.findings && Array.isArray(r.findings)) {
                        r.findings.forEach((f: any) => {
                            if (f.severity?.toLowerCase() !== 'info') issueCount++;
                        });
                    }
                });
            }

            return {
                ...project,
                latestScore: latestScan?.overall_score ?? null,
                lastAuditDate: latestScan?.completed_at ?? null,
                issueCount,
            };
        })
    );

    const scansPct = planScansLimit > 0 ? Math.min((planScansUsed / planScansLimit) * 100, 100) : 0;
    const projectsPct = projectLimit > 0 ? Math.min((projectList.length / projectLimit) * 100, 100) : 0;

    const firstName = user.email?.split('@')[0] || 'there';

    return (
        <div className="p-5 md:p-10 max-w-6xl">
            {/* Hero Header */}
            <div className="mb-10">
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    Your Security<br />
                    Command Center.
                </h1>
                <p className="text-zinc-500 text-[15px] max-w-lg">
                    Monitor, audit, and improve the security posture of all your web projects from one place.
                </p>
            </div>

            {/* Quick Stats */}
            {plan !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Activity className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                                <span className="text-[13px] text-zinc-400">Scans Used</span>
                                <span className="text-[13px] font-medium text-white tabular-nums">{planScansUsed}/{planScansLimit}</span>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1">
                                <div className="bg-white/30 h-1 rounded-full transition-all" style={{ width: `${scansPct}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <FolderKanban className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                                <span className="text-[13px] text-zinc-400">Projects</span>
                                <span className="text-[13px] font-medium text-white tabular-nums">{projectList.length}/{projectLimit}</span>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1">
                                <div className="bg-emerald-500/50 h-1 rounded-full transition-all" style={{ width: `${projectsPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Projects Section */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-heading font-medium text-white">Projects</h2>
                    <Button asChild variant="ghost" size="sm" className="text-zinc-500 hover:text-white h-8 px-3 text-[13px]">
                        <Link href="/dashboard/projects/new">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add New
                        </Link>
                    </Button>
                </div>
                <p className="text-[13px] text-zinc-600 mb-5">
                    Manage and audit your web projects
                </p>
            </div>

            {/* Project Grid */}
            {projectsWithScans.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-12 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                        <FolderKanban className="h-6 w-6 text-zinc-600" />
                    </div>
                    <h2 className="text-lg font-heading font-medium text-white mb-2">No projects yet</h2>
                    <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                        Create your first project to start running security audits on your sites.
                    </p>
                    <Button asChild className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium rounded-lg">
                        <Link href="/dashboard/projects/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Project
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projectsWithScans.map((project: any) => (
                        <ProjectCard
                            key={project.id}
                            id={project.id}
                            name={project.name}
                            url={project.url}
                            latestScore={project.latestScore}
                            issueCount={project.issueCount}
                            lastAuditDate={project.lastAuditDate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
