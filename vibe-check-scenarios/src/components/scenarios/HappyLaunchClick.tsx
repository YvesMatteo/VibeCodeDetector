import { motion } from "framer-motion";
import { MousePointer2, Sparkles } from "lucide-react";

export default function HappyLaunchClick() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">2. Happy Launch Click</h3>

            {/* Button Container */}
            <div className="relative">
                <motion.button
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 text-xl overflow-hidden relative z-10"
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: ["0 0 0px rgba(59, 130, 246, 0)", "0 0 20px rgba(59, 130, 246, 0.5)", "0 0 0px rgba(59, 130, 246, 0)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    Launch Project 🚀

                    {/* Confetti Effect inside button */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ delay: 1, duration: 0.5 }}
                    >
                        <div className="w-full h-full bg-white/20" />
                    </motion.div>
                </motion.button>

                {/* Mouse Cursor Animation */}
                <motion.div
                    className="absolute z-20 text-white drop-shadow-md"
                    initial={{ x: 100, y: 100, opacity: 0 }}
                    animate={{ x: 20, y: 20, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                >
                    <MousePointer2 size={32} fill="white" />
                </motion.div>

                {/* Global Confetti Burst */}
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: i % 2 === 0 ? "#3b82f6" : "#ec4899",
                            zIndex: 5
                        }}
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{
                            scale: [0, 1, 0],
                            x: (Math.random() - 0.5) * 200,
                            y: (Math.random() - 0.5) * 200,
                        }}
                        transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                    />
                ))}

                {/* Glow Freeze Frame Effect */}
                <motion.div
                    className="absolute inset-[-50px] bg-blue-500/20 rounded-full blur-3xl z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1] }}
                    transition={{ delay: 1, duration: 3 }}
                />
            </div>
        </div>
    );
}
