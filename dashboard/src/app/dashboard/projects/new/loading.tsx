export default function NewProjectLoading() {
    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            <div className="mb-8">
                <div className="h-5 w-36 bg-zinc-800/50 rounded animate-pulse mb-4" />
                <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-72 bg-zinc-800/50 rounded animate-pulse mt-2" />
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 h-px bg-zinc-700" />
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
            </div>

            {/* Project Details card */}
            <div className="mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse">
                <div className="p-6 space-y-4">
                    <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="space-y-3 pt-2">
                        <div className="h-4 w-24 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                        <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
                        <div className="h-10 bg-white/[0.03] border border-white/[0.06] rounded animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
                <div className="h-10 w-20 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-10 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
        </div>
    );
}
