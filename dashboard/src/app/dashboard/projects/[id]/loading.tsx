export default function ProjectDetailLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Status cards row — 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Security Score */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 w-24 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-zinc-800/30 rounded-lg" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="h-8 w-12 bg-zinc-800 rounded" />
                        <div className="h-4 w-8 bg-zinc-800/30 rounded mb-0.5" />
                    </div>
                </div>

                {/* Last Scan */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 w-16 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-sky-500/10 rounded-lg" />
                    </div>
                    <div className="h-7 w-20 bg-zinc-800 rounded mb-1.5" />
                    <div className="h-3 w-36 bg-zinc-800/30 rounded" />
                </div>

                {/* Issues Found */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 w-20 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-zinc-800/30 rounded-lg" />
                    </div>
                    <div className="h-8 w-8 bg-zinc-800 rounded mb-2" />
                    <div className="flex gap-2">
                        <div className="h-4 w-16 bg-zinc-800/30 rounded" />
                        <div className="h-4 w-12 bg-zinc-800/20 rounded" />
                    </div>
                </div>
            </div>

            {/* Two column: Score trend + Project config */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Score Trend chart */}
                <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-24 bg-zinc-800 rounded" />
                        <div className="h-3 w-20 bg-zinc-800/40 rounded" />
                    </div>
                    <div className="h-[220px] bg-white/[0.01] rounded-lg" />
                </div>

                {/* Project Configuration */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-36 bg-zinc-800 rounded" />
                        <div className="h-3 w-8 bg-zinc-800/40 rounded" />
                    </div>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i}>
                                <div className="h-2.5 w-16 bg-zinc-800/30 rounded mb-1.5" />
                                <div className="h-4 bg-zinc-800/40 rounded" style={{ width: `${60 + (i * 20) % 40}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Findings */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-48 bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-800/40 rounded" />
                </div>
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                            <div className="h-4 w-16 bg-zinc-800/30 rounded mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <div className="h-4 bg-zinc-800/40 rounded mb-1" style={{ width: `${70 + (i * 15) % 30}%` }} />
                                <div className="h-3 w-20 bg-zinc-800/20 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
