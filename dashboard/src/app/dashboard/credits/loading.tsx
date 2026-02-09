export default function CreditsLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
            <div className="h-24 bg-zinc-900/50 border border-white/5 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-72 bg-zinc-900/50 border border-white/5 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
