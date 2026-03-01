import { motion } from "framer-motion";
import { Search, Globe, ArrowRight } from "lucide-react";

export default function EnteringAppUrl() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">15. Entering App URL</h3>

            <div className="w-full max-w-lg bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-6">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Secure your vibe.</h2>
                    <p className="text-zinc-400 text-sm">Instant security scan for AI-generated apps.</p>
                </div>

                <div className="relative">
                    {/* Input Field */}
                    <div className="bg-zinc-950 border border-zinc-700 rounded-lg flex items-center p-3 pl-4 mb-4 focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all">
                        <Globe size={18} className="text-zinc-500 mr-3" />
                        <div className="flex-1 font-mono text-zinc-300 relative h-6 overflow-hidden">
                            <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1.5, steps: 15 }} // Typewriter effectish
                                className="absolute inset-0 overflow-hidden whitespace-nowrap border-r-2 border-emerald-500"
                                style={{ display: "block", width: "fit-content" }}
                            >
                                mycoolapp.com
                            </motion.span>
                        </div>
                    </div>

                    {/* Button */}
                    <motion.button
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2 group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>Run CheckVibe Scan</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </motion.button>

                    {/* Click Animation */}
                    <motion.div
                        className="absolute right-1/2 bottom-4 w-8 h-8 bg-white/30 rounded-full"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ delay: 2, duration: 0.5 }}
                    />
                </div>
            </div>
        </div>
    );
}
