export default function SettingsLoading() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-900/50 border border-slate-700/20 rounded-xl animate-pulse" />
            ))}
        </div>
    );
}
