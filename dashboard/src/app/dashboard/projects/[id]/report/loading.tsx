export default function ProjectReportLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6 animate-pulse">
                <div className="h-9 w-24 bg-zinc-800/50 rounded-md" />
                <div className="h-9 w-20 bg-zinc-800/50 rounded-md" />
                <div className="h-9 w-20 bg-zinc-800/50 rounded-md" />
            </div>

            {/* Score ring + summary section */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mb-8 animate-pulse">
                {/* Score ring */}
                <div className="flex flex-col items-center p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="h-36 w-36 rounded-full border-[8px] border-zinc-800/50 mb-4" />
                    <div className="h-4 w-20 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 w-16 bg-zinc-800/40 rounded" />
                </div>

                {/* Categories */}
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="h-5 w-5 bg-zinc-800/40 rounded shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="h-4 bg-zinc-800 rounded mb-1.5" style={{ width: `${80 + (i * 20) % 60}px` }} />
                                <div className="h-2 bg-white/[0.04] rounded-full w-full">
                                    <div className="h-2 bg-zinc-800/50 rounded-full" style={{ width: `${40 + (i * 15) % 50}%` }} />
                                </div>
                            </div>
                            <div className="h-5 w-10 bg-zinc-800/40 rounded shrink-0" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Findings list */}
            <div className="space-y-4 animate-pulse">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.06]" />
                ))}
            </div>
        </div>
    );
}
