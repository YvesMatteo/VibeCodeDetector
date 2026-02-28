import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban, Search, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProjectCard } from '@/components/dashboard/project-card';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { PageHeader } from '@/components/dashboard/page-header';
import { ProjectSearch } from '@/components/dashboard/project-search';
import { countIssuesBySeverity } from '@/lib/scan-utils';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const params = await searchParams;
    const query = params.q?.toLowerCase() || '';

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

    // Filter projects if a search term exists
    const filteredProjects = query
        ? projectList.filter(p => p.name.toLowerCase().includes(query) || p.url.toLowerCase().includes(query))
        : projectList;

    // Fetch monitoring schedules for all projects
    const projectIds = filteredProjects.map(p => p.id);
    const { data: schedules } = projectIds.length > 0
        ? await supabase
            .from('scheduled_scans' as any)
            .select('project_id, frequency, enabled')
            .in('project_id', projectIds)
            .eq('user_id', user.id)
            .eq('enabled', true)
        : { data: [] };

    const scheduleMap = new Map<string, string>();
    if (schedules) {
        for (const s of schedules as any[]) {
            scheduleMap.set(s.project_id, s.frequency);
        }
    }

    // Batch-fetch latest scan metadata per project (no results blob, fixes N+1)
    const latestScansMap: Record<string, { id: string; overall_score: number | null; completed_at: string | null }> = {};
    if (projectIds.length > 0) {
        const { data: recentScans } = await supabase
            .from('scans')
            .select('project_id, id, overall_score, completed_at')
            .in('project_id', projectIds)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });

        for (const scan of (recentScans || []) as any[]) {
            if (scan.project_id && !latestScansMap[scan.project_id]) {
                latestScansMap[scan.project_id] = scan;
            }
        }
    }

    // Fetch results ONLY for the latest scan per project (for severity breakdown)
    const latestScanIds = Object.values(latestScansMap).map(s => s.id);
    const severityMap: Record<string, { issueCount: number; severity: { critical: number; high: number; medium: number; low: number } }> = {};
    if (latestScanIds.length > 0) {
        const { data: scansWithResults } = await supabase
            .from('scans')
            .select('id, results')
            .in('id', latestScanIds);

        for (const scan of (scansWithResults || [])) {
            const counts = countIssuesBySeverity(scan.results as Record<string, any>);
            severityMap[scan.id] = {
                issueCount: counts.total,
                severity: { critical: counts.critical, high: counts.high, medium: counts.medium, low: counts.low },
            };
        }
    }

    const projectsWithScans = filteredProjects.map((project) => {
        const latestScan = latestScansMap[project.id] ?? null;
        const scanSeverity = latestScan ? severityMap[latestScan.id] : null;
        return {
            ...project,
            latestScore: latestScan?.overall_score ?? null,
            lastAuditDate: latestScan?.completed_at ?? null,
            issueCount: scanSeverity?.issueCount ?? 0,
            severity: scanSeverity?.severity ?? { critical: 0, high: 0, medium: 0, low: 0 },
            monitoringFrequency: scheduleMap.get(project.id) || null,
        };
    });

    const usageStats = planScansLimit > 0 ? (
        <div className="flex items-center gap-4 mt-1">
            <span className="text-[13px] text-zinc-500">
                <span className="text-zinc-300 font-medium tabular-nums">{planScansUsed}</span>
                <span className="text-zinc-600">/{planScansLimit}</span> checks
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
                actions={
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ProjectSearch />
                        <Button asChild className="bg-sky-500 text-white hover:bg-sky-400 border-0 font-medium shadow-none h-8 text-xs rounded-md px-3 ml-1 sm:ml-0">
                            <Link href="/dashboard/projects/new">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                New project
                            </Link>
                        </Button>
                    </div>
                }
            />

            {/* Content */}
            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                {projectsWithScans.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
                            <FolderKanban className="h-5 w-5 text-sky-400" />
                        </div>
                        <h2 className="text-sm font-medium text-zinc-200 mb-1.5">No projects yet</h2>
                        <p className="text-zinc-500 text-[13px] mb-6 max-w-sm mx-auto">
                            Create your first project to start monitoring your app.
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
                                backendType={project.backend_type}
                                monitoringFrequency={project.monitoringFrequency}
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
