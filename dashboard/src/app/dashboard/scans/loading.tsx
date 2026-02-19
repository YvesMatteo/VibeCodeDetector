export default function ScansLoading() {
    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 animate-pulse">
                <div>
                    <div className="h-8 w-20 bg-zinc-800 rounded" />
                    <div className="h-4 w-56 bg-zinc-800/40 rounded mt-2" />
                </div>
                <div className="h-10 w-28 bg-zinc-800 rounded" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {['Total Scans', 'Issues Found', 'Avg per Scan'].map((label) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                        <div className="pt-5 pb-4 px-6">
                            <div className="h-3 w-20 bg-zinc-800/50 rounded mb-2" />
                            <div className="flex items-baseline gap-2">
                                <div className="h-7 w-10 bg-zinc-800 rounded" />
                                <div className="h-3 w-20 bg-zinc-800/30 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scans table */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                <div className="border-b border-white/[0.06] p-6 pb-4">
                    <div className="h-5 w-20 bg-zinc-800 rounded mb-1.5" />
                    <div className="h-3.5 w-56 bg-zinc-800/40 rounded" />
                </div>
                <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-white/[0.02] border border-white/[0.05] rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}
