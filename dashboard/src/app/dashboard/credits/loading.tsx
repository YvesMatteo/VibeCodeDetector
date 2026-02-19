export default function CreditsLoading() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Centered header */}
            <div className="flex flex-col items-center text-center mb-12">
                <div className="h-8 w-72 bg-zinc-800 rounded animate-pulse mb-4" />
                <div className="h-5 w-96 max-w-full bg-zinc-800/40 rounded animate-pulse mb-6" />

                {/* Billing toggle */}
                <div className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.01] p-1">
                    <div className="h-9 w-24 bg-zinc-800/50 rounded-full animate-pulse" />
                    <div className="h-9 w-32 bg-zinc-800/30 rounded-full animate-pulse ml-1" />
                </div>
            </div>

            {/* Desktop comparison table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.06] animate-pulse">
                {/* Table header */}
                <div className="flex border-b border-white/[0.04] p-5">
                    <div className="w-[240px] shrink-0">
                        <div className="h-4 w-16 bg-zinc-800/50 rounded" />
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-[180px]">
                            <div className="h-5 w-16 bg-zinc-800 rounded" />
                            <div className="h-7 w-14 bg-zinc-800/60 rounded" />
                        </div>
                    ))}
                </div>
                {/* Table rows */}
                {[...Array(9)].map((_, i) => (
                    <div key={i} className={`flex items-center p-4 border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                        <div className="w-[240px] shrink-0">
                            <div className="h-4 bg-zinc-800/40 rounded" style={{ width: `${80 + (i * 12) % 60}px` }} />
                        </div>
                        {[...Array(4)].map((_, j) => (
                            <div key={j} className="flex-1 flex justify-center min-w-[180px]">
                                <div className="h-4 w-8 bg-zinc-800/30 rounded" />
                            </div>
                        ))}
                    </div>
                ))}
                {/* Table footer with buttons */}
                <div className="flex items-center p-5 border-t border-white/[0.06]">
                    <div className="w-[240px] shrink-0" />
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 flex justify-center min-w-[180px]">
                            <div className="h-10 w-full max-w-[140px] bg-zinc-800/40 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile card layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:hidden">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 animate-pulse flex flex-col">
                        <div className="text-center mb-4">
                            <div className="h-5 w-16 bg-zinc-800 rounded mx-auto mb-2" />
                            <div className="h-3 w-24 bg-zinc-800/40 rounded mx-auto mb-6" />
                            <div className="h-10 w-20 bg-zinc-800/60 rounded mx-auto" />
                        </div>
                        <div className="space-y-3 mb-8 flex-1">
                            {[...Array(4)].map((_, j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className="h-4 w-4 bg-zinc-800/30 rounded-full shrink-0" />
                                    <div className="h-3 bg-zinc-800/30 rounded flex-1" />
                                </div>
                            ))}
                        </div>
                        <div className="h-10 bg-zinc-800/40 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}
