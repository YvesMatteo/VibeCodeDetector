export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-zinc-900/50 border border-white/5 rounded-xl animate-pulse" />
                ))}
            </div>
            <div className="h-64 bg-zinc-900/50 border border-white/5 rounded-xl animate-pulse" />
        </div>
    );
}
