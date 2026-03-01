import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Scene12ScanStart() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="macos-window w-full max-w-md"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 120 }}
            >
                <div className="macos-titlebar">
                    <div className="macos-dot macos-dot-red" />
                    <div className="macos-dot macos-dot-yellow" />
                    <div className="macos-dot macos-dot-green" />
                    <span className="text-[10px] text-[#a1a1a6] ml-2">CheckVibe.dev</span>
                </div>
                <div className="p-6 flex flex-col items-center gap-4">
                    {/* Logo Wordmark — actual brand image */}
                    <motion.img
                        src="/checkvibe-wordmark.png"
                        alt="CheckVibe"
                        className="h-12 object-contain"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.06 }}
                    />

                    <motion.p
                        className="text-xs text-[#a1a1a6] text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        Paste your app URL to scan for security issues
                    </motion.p>

                    {/* URL Input Field */}
                    <motion.div
                        className="w-full flex gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                    >
                        <div className="flex-1 h-10 bg-[#1c1c1e] border border-[#48484a] rounded-xl px-3 flex items-center overflow-hidden">
                            <Search size={14} className="text-[#48484a] mr-2 flex-shrink-0" />
                            {/* Typing animation */}
                            <motion.span
                                className="text-sm text-[#f5f5f7] font-mono"
                                initial={{ width: 0 }}
                                animate={{ width: "auto" }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                            >
                                {"https://myapp.dev".split("").map((char, i) => (
                                    <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.01 }}>
                                        {char}
                                    </motion.span>
                                ))}
                            </motion.span>
                            {/* Blinking cursor */}
                            <motion.span
                                className="w-0.5 h-4 bg-[#4a7ab5] ml-0.5"
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>

                        {/* Scan Button */}
                        <motion.button
                            className="h-10 px-5 bg-gradient-to-r from-[#1a365d] to-[#2a4a7f] rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-900/30"
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: [0.5, 0.5, 1], scale: [1, 1, 1.02] }}
                            transition={{ delay: 0.44, duration: 0.6 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            Scan
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
