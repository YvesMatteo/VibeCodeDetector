export default function ProjectHistoryLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto w-full">
            {/* Score chart placeholder */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mb-8 animate-pulse">
                <div className="h-4 w-28 bg-zinc-800 rounded mb-4" />
                <div className="h-[200px] bg-white/[0.01] rounded-lg" />
            </div>

            {/* All Audits header */}
            <div className="flex items-center justify-between mb-6">
                <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-14 bg-zinc-800/40 rounded animate-pulse" />
            </div>

            {/* Timeline entries */}
            <div className="relative">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                        {i < 4 && (
                            <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/[0.06]" />
                        )}
                        <div className={`relative z-10 mt-1 h-[35px] w-[35px] rounded-full shrink-0 border animate-pulse ${
                            i === 0 ? 'bg-sky-400/15 border-sky-400/30' : 'bg-white/[0.03] border-white/[0.06]'
                        }`} />
                        <div className="flex-1 p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-16 bg-zinc-800/50 rounded-full" />
                                    {i === 0 && <div className="h-5 w-14 bg-sky-400/10 rounded-full" />}
                                </div>
                                <div className="h-3 w-28 bg-zinc-800/30 rounded" />
                            </div>
                            <div className="h-4 w-36 bg-zinc-800/40 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
