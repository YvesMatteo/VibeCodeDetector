import { motion } from "framer-motion";
import { Server, Bug } from "lucide-react";

export default function Scene03InvisibleVulnerabilities() {
    const bugs = [
        { delay: 0.16, y: -5 },
        { delay: 0.24, y: 3 },
        { delay: 0.32, y: -2 },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="flex items-center gap-6 w-full max-w-md justify-center relative">
                {/* Code Pipeline */}
                <motion.div
                    className="macos-window w-28"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="macos-titlebar py-1 px-2">
                        <div className="macos-dot macos-dot-red" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-yellow" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-green" style={{ width: 8, height: 8 }} />
                    </div>
                    <div className="p-2 space-y-1">
                        <div className="h-1.5 bg-[#3a3a3c] rounded w-full" />
                        <div className="h-1.5 bg-[#3a3a3c] rounded w-2/3" />
                    </div>
                </motion.div>

                {/* Pipeline Arrow with Bugs */}
                <div className="relative flex items-center">
                    <motion.div
                        className="w-32 h-0.5 bg-gradient-to-r from-[#3a3a3c] to-[#2a4a7f]/50"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.08, duration: 0.6 }}
                        style={{ transformOrigin: "left" }}
                    />

                    {/* Red bugs riding along */}
                    {bugs.map((bug, i) => (
                        <motion.div
                            key={i}
                            className="absolute"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: [0, 40, 90, 130], opacity: [0, 1, 1, 0.3], y: bug.y }}
                            transition={{ delay: bug.delay, duration: 0.6, ease: "easeInOut" }}
                        >
                            <Bug size={12} className="text-[#ff453a]" />
                        </motion.div>
                    ))}
                </div>

                {/* Production Server */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2a4a7f] flex items-center justify-center shadow-lg shadow-blue-900/30 relative">
                        <Server size={28} className="text-white" />
                        {/* Bugs hiding inside */}
                        {bugs.map((bug, i) => (
                            <motion.div
                                key={i}
                                className="absolute"
                                style={{ top: `${30 + i * 12}%`, left: `${20 + i * 15}%` }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.36 + i * 0.04 }}
                            >
                                <Bug size={8} className="text-[#ff453a]" />
                            </motion.div>
                        ))}
                    </div>
                    <span className="text-[10px] text-[#a1a1a6] font-medium">Production</span>
                </motion.div>
            </div>

            <motion.p
                className="text-sm text-[#ff453a] mt-6 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                Invisible vulnerabilities shipped
            </motion.p>
        </div>
    );
}
