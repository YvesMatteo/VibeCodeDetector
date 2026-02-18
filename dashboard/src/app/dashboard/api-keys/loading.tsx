export default function ApiKeysLoading() {
    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-zinc-800/50 rounded animate-pulse mt-2" />
                </div>
                <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                <div className="min-w-0 space-y-4">
                    {/* Getting Started card */}
                    <div className="h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                    {/* MCP card */}
                    <div className="h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                    {/* Active Keys card */}
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse p-5 space-y-3">
                        <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-white/[0.02] border border-white/[0.05] rounded-lg animate-pulse" />
                        ))}
                    </div>
                    {/* Security notice */}
                    <div className="h-24 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                </div>

                {/* Activity feed */}
                <div className="hidden xl:block">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse p-5 space-y-3">
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-10 bg-white/[0.02] rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
