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

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                        Projects
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Manage and audit your projects
                    </p>
                </div>
                <Button asChild className="bg-white text-black hover:bg-zinc-200 border-0 font-medium">
                    <Link href="/dashboard/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Link>
                </Button>
            </div>

            {/* Usage bars */}
            {plan !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-zinc-900/40">
                        <Activity className="h-4 w-4 text-purple-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-400">Scans</span>
                                <span className="text-zinc-300">{planScansUsed}/{planScansLimit}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${scansPct}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-zinc-900/40">
                        <FolderKanban className="h-4 w-4 text-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-400">Projects</span>
                                <span className="text-zinc-300">{projectList.length}/{projectLimit}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${projectsPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Grid */}
            {projectsWithScans.length === 0 ? (
                <div className="text-center py-20">
                    <FolderKanban className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-white mb-2">No projects yet</h2>
                    <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                        Create your first project to start running security audits on your sites.
                    </p>
                    <Button asChild className="bg-white text-black hover:bg-zinc-200 border-0 font-medium">
                        <Link href="/dashboard/projects/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Project
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
