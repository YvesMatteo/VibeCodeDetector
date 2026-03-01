import { motion } from "framer-motion";
import { User, CheckCircle2 } from "lucide-react";

export default function FounderVibecoding() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">1. Founder Vibecoding</h3>

            {/* Founder Character */}
            <motion.div
                className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500 mb-8 z-10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <User size={48} className="text-blue-400" />
            </motion.div>

            {/* Floating Windows */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                {/* Replit Window */}
                <motion.div
                    className="absolute bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl w-48"
                    initial={{ x: -150, y: -50, opacity: 0, scale: 0.8 }}
                    animate={{ x: -120, y: -80, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] text-zinc-500 ml-auto">Replit</span>
                    </div>
                    <div className="space-y-1">
                        <motion.div
                            className="h-2 bg-zinc-800 rounded w-3/4"
                            animate={{ width: ["0%", "75%"] }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                        />
                        <motion.div
                            className="h-2 bg-zinc-800 rounded w-1/2"
                            animate={{ width: ["0%", "50%"] }}
                            transition={{ delay: 1.0, duration: 0.5 }}
                        />
                    </div>
                </motion.div>

                {/* Lovable Window */}
                <motion.div
                    className="absolute bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl w-48"
                    initial={{ x: 150, y: -20, opacity: 0, scale: 0.8 }}
                    animate={{ x: 120, y: -40, opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5, type: "spring" }}
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                        <span className="text-[10px] text-zinc-500 ml-auto">Lovable</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 gap-2">
                        <div className="w-full h-8 bg-zinc-800/50 rounded flex items-center justify-center">
                            <span className="text-[10px] text-zinc-600">Generating UI...</span>
                        </div>
                        <motion.div
                            className="flex items-center gap-1 text-green-500 text-xs font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2.2 }}
                        >
                            <CheckCircle2 size={12} />
                            <span>Done</span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Cursor Window */}
                <motion.div
                    className="absolute bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl w-48"
                    initial={{ x: 0, y: 150, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, y: 80, opacity: 1, scale: 1 }}
                    transition={{ delay: 2.5, type: "spring" }}
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-1">
                        <span className="text-[10px] text-zinc-500">Cursor</span>
                    </div>
                    <div className="font-mono text-[10px] text-blue-400">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3, duration: 0.1, repeat: 3 }}
                        >
                            Building project...
                        </motion.span>
                        <br />
                        <motion.span
                            className="text-green-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3.5 }}
                        >
                            Deploy successful ✅
                        </motion.span>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
