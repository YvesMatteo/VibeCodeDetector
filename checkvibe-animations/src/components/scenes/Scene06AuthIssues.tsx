import { motion } from "framer-motion";
import { Lock, LockOpen, User } from "lucide-react";

export default function Scene06AuthIssues() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="relative flex items-center gap-4 w-full max-w-md justify-center">
                {/* Login Screen */}
                <motion.div
                    className="macos-window w-48"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="macos-titlebar py-1 px-2">
                        <div className="macos-dot macos-dot-red" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-yellow" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-green" style={{ width: 8, height: 8 }} />
                        <span className="text-[8px] text-[#a1a1a6] ml-auto">Login</span>
                    </div>
                    <div className="p-4 flex flex-col items-center gap-3">
                        {/* Lock icon that vanishes */}
                        <motion.div
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: [1, 1, 0], scale: [1, 1, 0.5] }}
                            transition={{ delay: 0.12, duration: 0.6 }}
                        >
                            <Lock size={32} className="text-[#30d158]" />
                        </motion.div>

                        {/* Unlocked icon appears */}
                        <motion.div
                            className="absolute top-14"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 0, 1], scale: [0.5, 0.5, 1] }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <LockOpen size={32} className="text-[#ff453a]" />
                        </motion.div>

                        <div className="w-full space-y-2 mt-2">
                            <div className="h-6 bg-[#3a3a3c] rounded-lg" />
                            <div className="h-6 bg-[#3a3a3c] rounded-lg" />
                            <div className="h-6 bg-[#0a84ff] rounded-lg flex items-center justify-center">
                                <span className="text-[10px] text-white font-medium">Sign In</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Arrow */}
                <motion.div
                    className="text-[#a1a1a6] text-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.24 }}
                >
                    →
                </motion.div>

                {/* User walks past into Private Area */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.06 }}
                >
                    <div className="w-36 h-24 rounded-2xl border-2 border-dashed border-[#ff453a]/40 bg-[#ff453a]/5 flex flex-col items-center justify-center gap-2 relative">
                        <span className="text-[10px] text-[#ff453a] font-semibold uppercase tracking-wider">Private Area</span>

                        {/* User silhouette walking in */}
                        <motion.div
                            initial={{ x: -60, opacity: 0 }}
                            animate={{ x: [- 60, -20, 0], opacity: [0, 1, 1] }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                        >
                            <User size={28} className="text-[#a1a1a6]" />
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            <motion.p
                className="text-xs text-[#ff453a] mt-6 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.44 }}
            >
                No authentication required
            </motion.p>
        </div>
    );
}
