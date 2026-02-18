export default function ProjectSettingsLoading() {
    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 mb-6">
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-3.5 w-3.5 bg-zinc-800/30 rounded animate-pulse" />
                <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-3.5 w-3.5 bg-zinc-800/30 rounded animate-pulse" />
                <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="h-8 w-44 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-56 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

            {/* Settings form cards */}
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                        <div className="p-6 space-y-4">
                            <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-4 w-64 bg-zinc-800/50 rounded animate-pulse" />
                            <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between mt-8">
                <div className="h-10 w-32 bg-red-900/20 rounded animate-pulse" />
                <div className="h-10 w-28 bg-zinc-800 rounded animate-pulse" />
            </div>
        </div>
    );
}
