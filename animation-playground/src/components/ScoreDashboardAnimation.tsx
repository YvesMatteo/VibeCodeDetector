import { motion } from 'framer-motion';

export default function ScoreDashboardAnimation() {
    return (
        <div className="w-full h-64 p-4 grid grid-cols-2 grid-rows-2 gap-3">
            {/* Large Metric Card */}
            <div className="row-span-2 bg-zinc-900 rounded-lg p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <div className="text-zinc-400 text-xs uppercase tracking-wider">Vibe Score</div>
                <div className="text-4xl font-bold text-white mt-1">
                    A+
                    <span className="text-lg text-zinc-500 font-normal ml-1">98/100</span>
                </div>

                {/* Animated Area Chart */}
                <div className="h-24 mt-4 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <motion.path
                            initial={{ d: "M0,100 L100,100" }}
                            animate={{ d: "M0,100 L0,60 L20,70 L40,40 L60,50 L80,20 L100,30 L100,100 Z" }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            fill="url(#gradient)"
                        />
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            d="M0,60 L20,70 L40,40 L60,50 L80,20 L100,30"
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                        />
                    </svg>
                </div>
            </div>

            {/* Small Metric 1: Security */}
            <div className="bg-zinc-900 rounded-lg p-3 border border-white/5 flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute right-2 top-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">SAFE</div>
                <div className="text-zinc-400 text-[10px] uppercase">Threats Blocked</div>
                <div className="text-2xl font-semibold text-white mt-1">0</div>
                <div className="w-full bg-zinc-800 h-1 mt-3 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-emerald-500"
                    />
                </div>
            </div>

            {/* Small Metric 2: Performance */}
            <div className="bg-zinc-900 rounded-lg p-3 border border-white/5 flex flex-col justify-center relative overflow-hidden">
                <div className="text-zinc-400 text-[10px] uppercase">Performance</div>
                <div className="flex items-end gap-1 mt-2 h-10">
                    {[40, 70, 50, 90, 60, 80].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                            className="flex-1 bg-zinc-700 rounded-t-sm hover:bg-zinc-500 transition-colors"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
