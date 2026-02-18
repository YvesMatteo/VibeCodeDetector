export default function ProjectDetailLoading() {
    return (
        <div className="p-4 md:p-8">
            {/* Back link */}
            <div className="mb-8">
                <div className="h-5 w-36 bg-zinc-800/50 rounded animate-pulse mb-4" />

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                        <div>
                            <div className="h-7 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
                            <div className="h-4 w-32 bg-zinc-800/50 rounded animate-pulse" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-10 w-28 bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="h-10 w-20 bg-zinc-800/50 rounded-lg animate-pulse" />
                        <div className="h-10 w-20 bg-zinc-800/50 rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Action bar */}
            <div className="flex gap-3 mb-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-9 w-28 bg-zinc-800/50 rounded-lg animate-pulse" />
                ))}
            </div>

            {/* Score ring + categories skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <div className="h-72 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
