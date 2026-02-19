export default function MonitoringLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full space-y-8">
            {/* Scheduled Scans */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                        <div className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="h-4 w-28 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3 w-64 bg-zinc-800/40 rounded" />
                    </div>
                    <div className="w-9 h-5 bg-zinc-700 rounded-full" />
                </div>
            </div>

            {/* Alert Rules */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <div className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="h-4 w-20 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3 w-56 bg-zinc-800/40 rounded" />
                    </div>
                </div>

                <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={`pb-6 ${i < 2 ? 'border-b border-white/[0.04]' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded-lg bg-white/[0.03] mt-0.5">
                                        <div className="h-3.5 w-3.5 bg-zinc-800/40 rounded" />
                                    </div>
                                    <div>
                                        <div className="h-4 w-32 bg-zinc-800 rounded mb-1.5" />
                                        <div className="h-3 bg-zinc-800/40 rounded" style={{ width: `${180 + i * 30}px` }} />
                                    </div>
                                </div>
                                <div className="w-9 h-5 bg-zinc-700 rounded-full shrink-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
