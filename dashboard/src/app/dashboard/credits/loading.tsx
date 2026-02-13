export default function CreditsLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
            <div className="h-24 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-72 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
