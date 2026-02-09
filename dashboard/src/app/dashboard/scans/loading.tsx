export default function ScansLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
                <div className="h-10 w-36 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-900/50 border border-white/5 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}
