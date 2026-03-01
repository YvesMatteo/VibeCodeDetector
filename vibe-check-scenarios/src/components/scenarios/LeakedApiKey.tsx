import { motion } from "framer-motion";
import { Terminal, Code, Search } from "lucide-react";

export default function LeakedApiKey() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">5. Leaked API Key</h3>

            <motion.div
                className="relative w-full max-w-lg"
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2, duration: 1.5 }}
            >
                {/* Code Editor Window */}
                <div className="bg-[#1e1e1e] rounded-lg shadow-2xl border border-zinc-800 overflow-hidden mb-4 relative z-10">
                    <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="text-zinc-400 text-xs ml-2 font-mono">config.ts</span>
                    </div>
                    <div className="p-4 font-mono text-sm text-zinc-300 space-y-2">
                        <div className="text-zinc-500">// User Configuration</div>
                        <div>export const config = &#123;</div>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-red-500/20 border border-red-500/50 rounded px-1 -mx-1"
                        >
                            &nbsp;&nbsp;API_KEY: "sk_live_83729..."
                        </motion.div>
                        <div>&#125;;</div>
                    </div>
                </div>

                {/* Browser DevTools Reveal */}
                <motion.div
                    className="absolute -right-12 top-10 w-64 bg-zinc-900 border border-zinc-700 shadow-xl rounded-lg overflow-hidden"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.5 }}
                >
                    <div className="bg-zinc-800 px-3 py-1 text-[10px] text-zinc-400 border-b border-zinc-700 flex justify-between items-center">
                        <span>DevTools</span>
                        <Search size={10} />
                    </div>
                    <div className="p-2 font-mono text-[10px] space-y-1">
                        <div className="text-blue-400">▼ main.js</div>
                        <div className="text-zinc-500 pl-2">...init(config)</div>
                        <div className="bg-yellow-500/20 text-yellow-200 pl-2 rounded">
                            "sk_live_83729..."
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
