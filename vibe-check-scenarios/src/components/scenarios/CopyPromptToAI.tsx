import { motion } from "framer-motion";
import { Copy, ArrowRight, terminal } from "lucide-react";

export default function CopyPromptToAI() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">20. Copy Prompt to AI</h3>

            <div className="flex gap-4 w-full justify-center">
                {/* CheckVibe App (Left) */}
                <div className="w-48 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-2 font-bold">CheckVibe Fix</div>
                    <div className="bg-zinc-950 p-2 rounded border border-emerald-500/30 text-[10px] text-emerald-400 font-mono relative overflow-hidden group">
                        Rotate API Key...

                        {/* Copy Animation */}
                        <motion.div
                            className="absolute inset-0 bg-emerald-500/20"
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ delay: 1, duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* Arrow */}
                <motion.div
                    className="flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: [0, 5, 0] }}
                    transition={{ delay: 1, duration: 1 }}
                >
                    <ArrowRight className="text-zinc-600" />
                </motion.div>

                {/* AI Assistant (Right) */}
                <div className="w-48 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-2 font-bold">ChatGPT / Claude</div>
                    <div className="space-y-2">
                        {/* User Message Appearing */}
                        <motion.div
                            className="bg-blue-600/20 p-2 rounded text-[10px] text-blue-200 self-end ml-auto max-w-[90%]"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.5 }}
                        >
                            Rotate API Key...
                        </motion.div>

                        {/* AI Typing Response */}
                        <motion.div
                            className="bg-zinc-800 p-2 rounded text-[10px] text-zinc-300 max-w-[90%]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2.5 }}
                        >
                            Fixing code...
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            >
                                |
                            </motion.span>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
