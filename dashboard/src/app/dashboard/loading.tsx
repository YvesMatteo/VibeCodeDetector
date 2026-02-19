export default function DashboardLoading() {
    return (
        <div>
            {/* PageHeader skeleton */}
            <div className="border-b border-white/[0.06] bg-background/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
                    <div className="min-w-0">
                        <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse" />
                        <div className="flex items-center gap-4 mt-2.5">
                            <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-sky-500/20 rounded-md animate-pulse shrink-0" />
                </div>
            </div>

            {/* Project card grid */}
            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-5 py-5 flex flex-col animate-pulse">
                            <div className="flex items-start gap-3 mb-6">
                                <div className="h-9 w-9 rounded-lg bg-zinc-800/50 shrink-0" />
                                <div className="min-w-0 flex-1 py-0.5">
                                    <div className="h-4 w-28 bg-zinc-800 rounded" />
                                    <div className="h-3 w-36 bg-zinc-800/40 rounded mt-2" />
                                </div>
                                <div className="h-3 w-14 bg-zinc-800/30 rounded mt-1" />
                            </div>
                            <div className="mt-auto">
                                <div className="h-1 rounded-full bg-white/[0.06] mb-3" />
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-6 bg-zinc-800 rounded" />
                                    <div className="h-3 w-20 bg-zinc-800/40 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
