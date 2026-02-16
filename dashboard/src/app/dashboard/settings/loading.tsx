export default function SettingsLoading() {
    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-56 bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
