export default function ScanDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-6">
                <div className="h-32 w-32 bg-slate-900/50 border border-slate-700/20 rounded-full animate-pulse" />
                <div className="flex-1 space-y-3">
                    <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-full bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-zinc-800/50 rounded animate-pulse" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-48 bg-slate-900/50 border border-slate-700/20 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
