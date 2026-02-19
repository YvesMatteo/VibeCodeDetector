export default function SettingsLoading() {
    return (
        <div>
            {/* PageHeader skeleton */}
            <div className="border-b border-white/[0.06] bg-background/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
                    <div className="min-w-0">
                        <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse mt-2.5" />
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar tabs */}
                    <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 border-white/[0.06]">
                        {['Profile', 'Security', 'Billing'].map((label, i) => (
                            <div
                                key={label}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg animate-pulse ${i === 0 ? 'bg-white/[0.05]' : ''}`}
                            >
                                <div className="h-4 w-4 bg-zinc-800/50 rounded" />
                                <div className={`h-4 rounded ${i === 0 ? 'w-14 bg-zinc-700' : `w-${12 + i * 2} bg-zinc-800/40`}`} style={{ width: `${50 + i * 10}px` }} />
                            </div>
                        ))}
                    </div>

                    {/* Tab content - Profile tab */}
                    <div className="flex-1 min-w-0">
                        <div className="space-y-8 animate-pulse">
                            <div>
                                <div className="h-5 w-16 bg-zinc-800 rounded mb-1.5" />
                                <div className="h-3.5 w-40 bg-zinc-800/40 rounded" />
                            </div>
                            <div className="space-y-6 max-w-lg">
                                {['Email Address', 'Account ID', 'Member Since'].map((label, i) => (
                                    <div key={label} className="space-y-2">
                                        <div className="h-3.5 bg-zinc-800/40 rounded" style={{ width: `${80 + i * 16}px` }} />
                                        <div className="h-10 bg-white/[0.02] border border-white/[0.06] rounded-md" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
