export default function ProjectHistoryLoading() {
    return (
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-8">
                <div className="h-5 w-32 bg-zinc-800/50 rounded animate-pulse mb-4" />
                <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

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
                                    <div className="h-5 w-16 bg-zinc-800 rounded-full animate-pulse" />
                                    {i === 0 && <div className="h-5 w-14 bg-sky-400/10 rounded-full animate-pulse" />}
                                </div>
                                <div className="h-3 w-28 bg-zinc-800/30 rounded animate-pulse" />
                            </div>
                            <div className="h-4 w-36 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
