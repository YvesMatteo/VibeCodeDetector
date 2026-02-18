export default function DocsLoading() {
    return (
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-10">
                <div className="h-8 w-52 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

            {/* Base URL box */}
            <div className="mb-8 h-16 rounded-lg bg-white/[0.02] border border-white/[0.06] animate-pulse" />

            {/* Accordion sections */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
                        <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${100 + (i * 20) % 80}px` }} />
                        <div className="h-4 w-4 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
