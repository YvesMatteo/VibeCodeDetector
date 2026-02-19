export default function ApiKeysLoading() {
    return (
        <div>
            {/* PageHeader skeleton */}
            <div className="border-b border-white/[0.06] bg-background/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
                    <div className="min-w-0">
                        <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-72 bg-zinc-800/50 rounded animate-pulse mt-2.5" />
                    </div>
                    <div className="h-10 w-28 bg-sky-500/20 rounded-md animate-pulse shrink-0" />
                </div>
            </div>

            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
                    {/* Left column */}
                    <div className="min-w-0">
                        {/* Getting Started card */}
                        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                            <div className="py-4 px-6 flex items-center justify-between">
                                <div>
                                    <div className="h-4 w-28 bg-zinc-800 rounded" />
                                    <div className="h-3 w-44 bg-zinc-800/40 rounded mt-1.5" />
                                </div>
                                <div className="h-4 w-4 bg-zinc-800/50 rounded" />
                            </div>
                        </div>

                        {/* MCP card */}
                        <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                            <div className="py-4 px-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-4 w-4 bg-zinc-800/50 rounded" />
                                    <div>
                                        <div className="h-4 w-44 bg-zinc-800 rounded" />
                                        <div className="h-3 w-40 bg-zinc-800/40 rounded mt-1.5" />
                                    </div>
                                </div>
                                <div className="h-4 w-4 bg-zinc-800/50 rounded" />
                            </div>
                        </div>

                        {/* Active Keys section */}
                        <div className="mb-8">
                            <div className="mb-3">
                                <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                                <div className="h-3 w-52 bg-zinc-800/40 rounded animate-pulse" />
                            </div>
                            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className={`p-4 animate-pulse ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="h-4 w-24 bg-zinc-800 rounded" />
                                                    <div className="h-4 w-14 bg-emerald-500/10 rounded-full" />
                                                </div>
                                                <div className="h-3 w-32 bg-zinc-800/30 rounded" />
                                                <div className="flex gap-4 mt-2">
                                                    <div className="h-3 w-20 bg-zinc-800/30 rounded" />
                                                    <div className="h-3 w-28 bg-zinc-800/20 rounded" />
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 bg-zinc-800/30 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security notice */}
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                            <div className="py-4 px-5">
                                <div className="flex gap-3">
                                    <div className="h-4 w-4 bg-amber-400/20 rounded shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="h-4 w-40 bg-zinc-800 rounded mb-2" />
                                        <div className="space-y-1.5">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="h-3 bg-zinc-800/30 rounded" style={{ width: `${60 + (i * 8) % 30}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column — Activity feed */}
                    <div className="hidden xl:block">
                        <div className="sticky top-8">
                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                                <div className="py-4 px-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-4 w-4 bg-zinc-800/50 rounded" />
                                        <div className="h-4 w-24 bg-zinc-800 rounded" />
                                    </div>
                                    <div className="h-3 w-28 bg-zinc-800/40 rounded" />
                                </div>
                                <div className="px-5 pb-5 space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg">
                                            <div className="h-3 w-3 bg-zinc-800/40 rounded mt-1 shrink-0" />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex gap-1.5">
                                                    <div className="h-3 w-8 bg-zinc-800/50 rounded" />
                                                    <div className="h-3 w-16 bg-zinc-800/30 rounded" />
                                                </div>
                                                <div className="h-2.5 w-20 bg-zinc-800/20 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
