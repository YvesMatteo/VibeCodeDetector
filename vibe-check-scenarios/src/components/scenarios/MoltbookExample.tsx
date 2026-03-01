import { motion } from "framer-motion";
import { Database, Key } from "lucide-react";

export default function MoltbookExample() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">8. Moltbook Exposure</h3>

            <div className="relative border border-zinc-800 bg-zinc-900/50 rounded-xl p-6 w-full max-w-xs shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white font-bold">M</div>
                    <div className="text-lg font-semibold text-zinc-200">Moltbook</div>
                </div>

                <div className="flex flex-col items-center relative py-4">
                    <Database size={64} className="text-zinc-600 mb-2" />
                    <motion.div
                        className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded border border-red-500/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        ~150,000 API Keys
                    </motion.div>

                    {/* Leaking Keys Animation */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute bottom-1/2 left-1/2"
                                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    y: -40 - Math.random() * 60,
                                    x: (Math.random() - 0.5) * 80,
                                    scale: 1
                                }}
                                transition={{
                                    delay: 1 + i * 0.4,
                                    duration: 2,
                                    repeat: Infinity
                                }}
                            >
                                <Key size={16} className="text-yellow-500/80" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
