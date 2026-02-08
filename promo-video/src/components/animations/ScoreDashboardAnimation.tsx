import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { motion } from 'framer-motion';

export const ScoreDashboardAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    return (
        <div className="w-full h-full p-6 grid grid-cols-2 grid-rows-2 gap-4 bg-zinc-900 rounded-xl border border-white/5 shadow-2xl items-center justify-center">
            {/* Large Metric Card */}
            <div className="row-span-2 col-span-1 bg-zinc-800/50 rounded-lg p-6 flex flex-col justify-between border border-white/5 relative overflow-hidden h-full">
                <div className="text-zinc-400 text-sm uppercase tracking-wider">Vibe Score</div>
                <div className="text-6xl font-bold text-white mt-2">
                    A+
                    <span className="text-2xl text-zinc-500 font-normal ml-2">98/100</span>
                </div>

                {/* Animated Area Chart */}
                <div className="h-32 mt-6 relative">
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
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-white/5 flex flex-col justify-center relative overflow-hidden group h-full">
                <div className="absolute right-3 top-3 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">SAFE</div>
                <div className="text-zinc-400 text-xs uppercase">Threats Blocked</div>
                <div className="text-4xl font-semibold text-white mt-2">0</div>
                <div className="w-full bg-zinc-700 h-2 mt-4 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-emerald-500"
                    />
                </div>
            </div>

            {/* Small Metric 2: Performance */}
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-white/5 flex flex-col justify-center relative overflow-hidden h-full">
                <div className="text-zinc-400 text-xs uppercase">Performance</div>
                <div className="flex items-end gap-2 mt-4 h-16">
                    {[40, 70, 50, 90, 60, 80].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                            className="flex-1 bg-zinc-600 rounded-t-sm"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
