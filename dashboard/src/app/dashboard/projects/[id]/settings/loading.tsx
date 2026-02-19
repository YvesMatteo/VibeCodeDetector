export default function ProjectSettingsLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
                <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-52 bg-zinc-800/40 rounded animate-pulse mt-2" />
            </div>

            {/* Settings form cards */}
            <div className="space-y-6 animate-pulse">
                {/* Project Name card */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="p-6">
                        <div className="h-5 w-28 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3.5 w-48 bg-zinc-800/40 rounded mb-4" />
                        <div className="space-y-4">
                            <div>
                                <div className="h-3.5 w-20 bg-zinc-800/40 rounded mb-2" />
                                <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                            </div>
                            <div>
                                <div className="h-3.5 w-20 bg-zinc-800/40 rounded mb-2" />
                                <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GitHub card */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="p-6">
                        <div className="h-5 w-36 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3.5 w-64 bg-zinc-800/40 rounded mb-4" />
                        <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                    </div>
                </div>

                {/* Backend Provider card */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="p-6">
                        <div className="h-5 w-36 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3.5 w-56 bg-zinc-800/40 rounded mb-4" />
                        <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded-md" />
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between mt-8">
                <div className="h-10 w-32 bg-red-900/20 rounded-md animate-pulse" />
                <div className="h-10 w-28 bg-zinc-800 rounded-md animate-pulse" />
            </div>
        </div>
    );
}
