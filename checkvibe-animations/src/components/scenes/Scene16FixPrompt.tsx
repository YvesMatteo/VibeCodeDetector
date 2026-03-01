import { motion } from "framer-motion";
import { Copy, Sparkles, CheckCircle } from "lucide-react";

export default function Scene16FixPrompt() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="w-full max-w-md space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Issue Card */}
                <div className="bg-[#1c1c1e] border border-[#48484a] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#ff453a]" />
                        <span className="text-sm font-semibold text-[#f5f5f7]">Leaked API key</span>
                        <span className="text-[9px] bg-[#ff453a]/15 text-[#ff453a] px-2 py-0.5 rounded-full font-medium ml-auto">Critical</span>
                    </div>

                    {/* AI Fix Prompt Box */}
                    <motion.div
                        className="bg-[#0a0a0a] border border-[#48484a] rounded-xl p-3 relative"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: 0.08, duration: 0.6 }}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={12} className="text-[#bf5af2]" />
                            <span className="text-[10px] text-[#bf5af2] font-semibold uppercase tracking-wider">AI Fix Prompt</span>
                        </div>

                        <motion.div
                            className="font-mono text-[11px] text-[#a1a1a6] leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.16 }}
                        >
                            Move the API key to a server-side environment variable. Replace the hardcoded value with process.env.API_KEY and add it to .env.local (gitignored).
                        </motion.div>

                        {/* Selection highlight animation */}
                        <motion.div
                            className="absolute inset-0 rounded-xl border-2 border-[#0a84ff] pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 1, 1, 0.5] }}
                            transition={{ delay: 0.28, duration: 0.6 }}
                        />

                        {/* Copy button */}
                        <motion.div
                            className="absolute top-2 right-2 flex items-center gap-1 bg-[#2c2c2e] px-2 py-1 rounded-lg cursor-pointer"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0, 1] }}
                            transition={{ delay: 0.36, duration: 0.6 }}
                        >
                            <Copy size={10} className="text-[#0a84ff]" />
                            <span className="text-[9px] text-[#0a84ff] font-medium">Copy</span>
                        </motion.div>

                        {/* "Copied" confirmation */}
                        <motion.div
                            className="absolute top-2 right-2 flex items-center gap-1 bg-[#30d158]/20 px-2 py-1 rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0, 0, 1] }}
                            transition={{ delay: 0.44, duration: 0.6 }}
                        >
                            <CheckCircle size={10} className="text-[#30d158]" />
                            <span className="text-[9px] text-[#30d158] font-medium">Copied!</span>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
