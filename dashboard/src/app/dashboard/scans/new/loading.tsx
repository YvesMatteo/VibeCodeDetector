export default function NewScanLoading() {
    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="h-5 w-32 bg-zinc-800/50 rounded animate-pulse mb-4" />
                <div className="h-8 w-36 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-72 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

            {/* Target URL card */}
            <div className="mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                <div className="p-6 space-y-4">
                    <div className="h-5 w-28 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                </div>
            </div>

            {/* GitHub card */}
            <div className="mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                <div className="p-6 space-y-4">
                    <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-72 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                </div>
            </div>

            {/* Backend Provider card */}
            <div className="mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                <div className="p-6 space-y-4">
                    <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-80 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                </div>
            </div>

            {/* What's Included card */}
            <div className="mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                <div className="p-6 space-y-4">
                    <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-14 bg-white/[0.02] border border-white/[0.05] rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
                <div className="h-10 w-20 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse" />
            </div>
        </div>
    );
}
