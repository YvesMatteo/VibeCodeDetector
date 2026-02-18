export default function ChangelogLoading() {
    return (
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-10">
                <div className="h-8 w-36 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

            <div className="relative">
                <div className="absolute left-[5px] top-2 bottom-0 w-px bg-white/[0.06]" />

                <div className="space-y-10">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="relative pl-8">
                            <div className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 ${
                                i === 0 ? 'bg-white border-white' : 'bg-zinc-900 border-zinc-700'
                            }`} />
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse" />
                            </div>
                            <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse mb-3" />
                            <div className="space-y-1.5">
                                {[...Array(3 + i % 2)].map((_, j) => (
                                    <div key={j} className="h-4 bg-zinc-800/30 rounded animate-pulse" style={{ width: `${70 + (j * 5) % 30}%` }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
