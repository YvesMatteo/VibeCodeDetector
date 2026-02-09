export default function SettingsLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-900/50 border border-white/5 rounded-xl animate-pulse" />
            ))}
        </div>
    );
}
