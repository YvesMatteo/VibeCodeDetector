export default function SupportLoading() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
                <div className="h-8 w-56 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-96 max-w-full bg-zinc-800/40 rounded animate-pulse mt-2.5" />
            </div>

            <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Submit a Ticket form card */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 animate-pulse">
                    <div className="h-5 w-32 bg-zinc-800 rounded mb-6" />

                    {/* Issue Type */}
                    <div className="space-y-2 mb-5">
                        <div className="h-3.5 w-20 bg-zinc-800/40 rounded" />
                        <div className="h-10 bg-white/[0.02] border border-white/[0.06] rounded-md" />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2 mb-5">
                        <div className="h-3.5 w-16 bg-zinc-800/40 rounded" />
                        <div className="h-10 bg-white/[0.02] border border-white/[0.06] rounded-md" />
                    </div>

                    {/* Message */}
                    <div className="space-y-2 mb-6">
                        <div className="h-3.5 w-18 bg-zinc-800/40 rounded" />
                        <div className="h-28 bg-white/[0.02] border border-white/[0.06] rounded-md" />
                    </div>

                    {/* Submit button */}
                    <div className="h-10 w-full bg-sky-500/20 rounded-md" />
                </div>

                {/* Your Tickets sidebar */}
                <div className="space-y-6">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 animate-pulse">
                        <div className="h-5 w-28 bg-zinc-800 rounded mb-6" />
                        <div className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="p-4 rounded-lg bg-black/20 border border-white/[0.04]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="h-4 w-14 bg-zinc-800/40 rounded-full" />
                                        <div className="h-3 w-20 bg-zinc-800/30 rounded" />
                                    </div>
                                    <div className="h-4 w-3/4 bg-zinc-800 rounded mb-1.5" />
                                    <div className="h-3 w-full bg-zinc-800/30 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
