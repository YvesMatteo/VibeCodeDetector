export default function BulkOutreachLoading() {
    return (
        <div className="p-6 md:p-8 max-w-5xl">
            {/* Header */}
            <div className="mb-6">
                <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-80 max-w-full bg-zinc-800/40 rounded animate-pulse mt-2" />
            </div>

            {/* URL textarea placeholder */}
            <div className="space-y-4 animate-pulse">
                <div className="h-36 w-full rounded-lg border border-white/[0.08] bg-white/[0.03]" />

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                    <div className="h-9 w-28 bg-sky-500/20 rounded-md" />
                    <div className="h-4 w-40 bg-zinc-800/30 rounded" />
                </div>
            </div>
        </div>
    );
}
