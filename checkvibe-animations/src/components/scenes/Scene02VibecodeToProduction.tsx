import { motion } from "framer-motion";
import { Monitor, Server, Bot } from "lucide-react";

export default function Scene02VibecodeToProduction() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="flex items-center gap-8 w-full max-w-lg justify-center">
                {/* AI Agent Icon */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a365d] to-[#2a4a7f] flex items-center justify-center shadow-lg shadow-blue-900/30">
                        <Bot size={32} className="text-white" />
                    </div>
                    <span className="text-[10px] text-[#a1a1a6] font-medium">AI Agent</span>
                </motion.div>

                {/* Laptop */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.08 }}
                >
                    <div className="macos-window w-32">
                        <div className="macos-titlebar py-1 px-2">
                            <div className="macos-dot macos-dot-red" style={{ width: 8, height: 8 }} />
                            <div className="macos-dot macos-dot-yellow" style={{ width: 8, height: 8 }} />
                            <div className="macos-dot macos-dot-green" style={{ width: 8, height: 8 }} />
                        </div>
                        <div className="p-2 space-y-1">
                            <div className="h-1.5 bg-[#3a3a3c] rounded w-3/4" />
                            <div className="h-1.5 bg-[#3a3a3c] rounded w-1/2" />
                            <div className="h-1.5 bg-[#1a365d]/30 rounded w-full" />
                        </div>
                    </div>
                    <span className="text-[10px] text-[#a1a1a6] font-medium">Laptop</span>
                </motion.div>

                {/* Animated code block moving to production */}
                <motion.div
                    className="absolute"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: [0, 60, 120], opacity: [0, 1, 1], y: [0, -8, 0] }}
                    transition={{ delay: 0.24, duration: 0.6, ease: "easeInOut" }}
                >
                    <div className="bg-[#2a4a7f]/20 border border-[#2a4a7f]/40 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                        <span className="text-[11px] font-mono font-bold text-[#6b93d6]">vibe coded app</span>
                    </div>
                </motion.div>

                {/* Arrow */}
                <motion.div
                    className="flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.16 }}
                >
                    <motion.div
                        className="text-[#a1a1a6] text-2xl"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        →
                    </motion.div>
                </motion.div>

                {/* Production Server */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.12, duration: 0.6 }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2a4a7f] flex items-center justify-center shadow-lg shadow-blue-900/30">
                        <Server size={32} className="text-white" />
                    </div>
                    <span className="text-[10px] text-[#a1a1a6] font-medium">Production</span>
                </motion.div>
            </div>

            {/* Label */}
            <motion.div
                className="mt-8 flex items-center gap-2 text-[#a1a1a6] text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <Monitor size={14} />
                <span>Vibecoding to production</span>
            </motion.div>
        </div>
    );
}
