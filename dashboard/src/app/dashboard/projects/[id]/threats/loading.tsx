export default function ThreatsLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Setup bar */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <div className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="h-4 w-32 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3 w-56 bg-zinc-800/40 rounded" />
                    </div>
                    <div className="w-9 h-5 bg-zinc-700 rounded-full" />
                </div>
            </div>

            {/* Stats cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
                        <div className="h-3 w-20 bg-zinc-800/40 rounded mb-3" />
                        <div className="h-7 w-12 bg-zinc-800 rounded mb-1" />
                        <div className="h-3 w-16 bg-zinc-800/20 rounded" />
                    </div>
                ))}
            </div>

            {/* Timeline chart */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="h-4 w-40 bg-zinc-800 rounded mb-4" />
                <div className="h-[200px] bg-white/[0.01] rounded-lg" />
            </div>

            {/* Event feed table */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 bg-zinc-800 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-white/[0.03] border border-white/[0.06] rounded-lg" />
                        <div className="h-8 w-28 bg-white/[0.03] border border-white/[0.06] rounded-lg" />
                    </div>
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
                            <div className="h-5 w-14 bg-zinc-800/40 rounded-full" />
                            <div className="h-4 w-16 bg-zinc-800/30 rounded" />
                            <div className="h-4 flex-1 bg-zinc-800/20 rounded" />
                            <div className="h-3 w-24 bg-zinc-800/20 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
