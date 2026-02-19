export default function NewProjectLoading() {
    return (
        <div>
            {/* PageHeader skeleton */}
            <div className="border-b border-white/[0.06] bg-background/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
                    <div className="min-w-0">
                        <div className="flex flex-col gap-4">
                            <div className="h-3.5 w-28 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-7 w-32 bg-zinc-800 rounded animate-pulse" />
                        </div>
                        <div className="h-4 w-64 bg-zinc-800/40 rounded animate-pulse mt-2.5" />
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-10 max-w-md mx-auto animate-pulse">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/80" />
                    <div className="flex-1 h-[2px] rounded-full bg-white/[0.04]" />
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.04] border border-white/[0.06]" />
                </div>

                {/* Project Details card */}
                <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="h-5 w-5 bg-sky-400/20 rounded" />
                            <div className="h-5 w-28 bg-zinc-800 rounded" />
                        </div>
                        <div className="h-3.5 w-56 bg-zinc-800/40 rounded mb-6" />
                        <div className="space-y-4">
                            <div>
                                <div className="h-3.5 w-24 bg-zinc-800/40 rounded mb-2" />
                                <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                            </div>
                            <div>
                                <div className="h-3.5 w-20 bg-zinc-800/40 rounded mb-2" />
                                <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
                    <div className="h-10 w-20 bg-zinc-800/30 rounded-md animate-pulse" />
                    <div className="h-10 w-20 bg-sky-500/20 rounded-md animate-pulse" />
                </div>
            </div>
        </div>
    );
}
