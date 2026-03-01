export default function ProjectDetailLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Alert banner placeholder */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-zinc-800/50 shrink-0">
                    <div className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="h-4 w-48 bg-zinc-800 rounded mb-1.5" />
                    <div className="h-3 w-72 bg-zinc-800/30 rounded" />
                </div>
                <div className="h-9 w-32 bg-zinc-800/40 rounded-md shrink-0 hidden sm:block" />
            </div>

            {/* Unified status cards row — 4 columns with dividers */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row md:divide-x divide-y md:divide-y-0 divide-white/[0.06] animate-pulse">
                {/* Security Score */}
                <div className="flex-1 p-5 md:p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-3 w-24 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-zinc-800/30 rounded-lg" />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="h-10 w-14 bg-zinc-800 rounded" />
                        <div className="h-4 w-8 bg-zinc-800/30 rounded mb-1" />
                    </div>
                </div>

                {/* Last Check */}
                <div className="flex-1 p-5 md:p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-3 w-20 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-sky-500/10 rounded-lg" />
                    </div>
                    <div className="h-8 w-24 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 w-40 bg-zinc-800/30 rounded" />
                </div>

                {/* Issues Found */}
                <div className="flex-1 p-5 md:p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-3 w-24 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-zinc-800/30 rounded-lg" />
                    </div>
                    <div className="h-8 w-8 bg-zinc-800 rounded mb-2" />
                    <div className="flex gap-2">
                        <div className="h-4 w-16 bg-zinc-800/30 rounded" />
                        <div className="h-4 w-12 bg-zinc-800/20 rounded" />
                    </div>
                </div>

                {/* Monitoring */}
                <div className="flex-1 p-5 md:p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-3 w-20 bg-zinc-800/50 rounded" />
                        <div className="h-7 w-7 bg-zinc-800/30 rounded-lg" />
                    </div>
                    <div className="h-8 w-16 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 w-32 bg-zinc-800/30 rounded" />
                </div>
            </div>

            {/* Score Trend chart — full width */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 bg-zinc-800 rounded" />
                    <div className="h-3 w-24 bg-zinc-800/40 rounded" />
                </div>
                <div className="h-[220px] bg-white/[0.01] rounded-lg" />
            </div>
        </div>
    );
}
