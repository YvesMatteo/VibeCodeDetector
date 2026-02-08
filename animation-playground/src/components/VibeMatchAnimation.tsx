import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const SNIPPETS = [
    "const vibe = true;",
    "return optimized;",
    "await next();",
    "if (cool) init();"
];

export default function VibeMatchAnimation() {
    const [matchIndex, setMatchIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMatchIndex(prev => (prev + 1) % SNIPPETS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center p-6">
            <div className="flex gap-4 items-center w-full max-w-sm">

                {/* Source Block */}
                <div className="flex-1 space-y-2">
                    <div className="bg-zinc-800/50 h-2 w-20 rounded" />
                    <div className="bg-zinc-800/50 h-2 w-12 rounded" />
                    <div className="bg-zinc-800/50 h-2 w-24 rounded" />
                    <div className="relative p-2 bg-black/40 rounded border border-white/5 font-mono text-[10px] text-zinc-400 overflow-hidden">
                        <motion.div
                            key={matchIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {SNIPPETS[matchIndex]}
                        </motion.div>
                        {/* Scanning Beam */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent w-full h-full"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </div>
                    <div className="bg-zinc-800/50 h-2 w-16 rounded" />
                </div>

                {/* Connection Line */}
                <div className="w-12 h-[1px] bg-zinc-700 relative overflow-hidden">
                    <motion.div
                        className="absolute inset-0 w-full h-full bg-purple-500"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                </div>

                {/* Match Result */}
                <div className="w-24 h-24 bg-zinc-800/30 rounded-lg border border-purple-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                    <motion.div
                        key={matchIndex}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-purple-400 font-bold text-lg"
                    >
                        {(85 + Math.random() * 14).toFixed(0)}%
                    </motion.div>
                    <div className="text-[9px] text-purple-300/50 uppercase mt-1">Vibe Match</div>

                    {/* Glow Effect */}
                    <motion.div
                        className="absolute inset-0 bg-purple-500/10"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            <div className="mt-8 flex gap-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === matchIndex ? 'bg-purple-500' : 'bg-zinc-800'}`} />
                ))}
            </div>
        </div>
    );
}
