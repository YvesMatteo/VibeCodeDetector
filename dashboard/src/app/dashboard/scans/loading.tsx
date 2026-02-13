export default function ScansLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-36 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-900/50 border border-slate-700/20 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}
