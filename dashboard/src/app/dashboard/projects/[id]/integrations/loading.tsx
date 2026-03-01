export default function IntegrationsLoading() {
    return (
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full space-y-8">
            {/* GitHub Actions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-white/[0.05]">
                        <div className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="h-4 w-28 bg-zinc-800 rounded mb-1.5" />
                        <div className="h-3 w-60 bg-zinc-800/40 rounded" />
                    </div>
                </div>
                <div className="h-48 bg-black/30 rounded-lg mb-3" />
                <div className="h-3 w-56 bg-zinc-800/20 rounded" />
            </div>

            {/* Vercel Deploy Hook */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/[0.05]">
                            <div className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="h-4 w-32 bg-zinc-800 rounded mb-1.5" />
                            <div className="h-3 w-52 bg-zinc-800/40 rounded" />
                        </div>
                    </div>
                    <div className="h-8 w-20 bg-zinc-800/50 rounded-md" />
                </div>
            </div>

            {/* Netlify Deploy Hook */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/[0.05]">
                            <div className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="h-4 w-32 bg-zinc-800 rounded mb-1.5" />
                            <div className="h-3 w-52 bg-zinc-800/40 rounded" />
                        </div>
                    </div>
                    <div className="h-8 w-20 bg-zinc-800/50 rounded-md" />
                </div>
            </div>

            {/* Webhooks */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sky-500/10">
                            <div className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="h-4 w-20 bg-zinc-800 rounded mb-1.5" />
                            <div className="h-3 w-52 bg-zinc-800/40 rounded" />
                        </div>
                    </div>
                    <div className="h-8 w-28 bg-zinc-800/50 rounded-md" />
                </div>
                <div className="h-12 bg-zinc-800/20 rounded-lg" />
            </div>
        </div>
    );
}
