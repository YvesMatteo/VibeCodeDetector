import { motion } from "framer-motion";
import { AlertTriangle, Zap } from "lucide-react";

export default function Scene08ShipFast() {
    const warnings = [
        { x: -60, y: -30, delay: 0.16 },
        { x: 80, y: -20, delay: 0.22 },
        { x: -40, y: 20, delay: 0.28 },
        { x: 100, y: 10, delay: 0.34 },
        { x: -80, y: 0, delay: 0.4 },
        { x: 50, y: 30, delay: 0.46 },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="w-full max-w-sm relative">
                {/* Progress bar label */}
                <motion.div
                    className="flex items-center gap-2 mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Zap size={16} className="text-[#ffd60a]" />
                    <span className="text-sm font-semibold text-[#f5f5f7]">Ship Fast</span>
                </motion.div>

                {/* Progress bar track */}
                <div className="w-full h-6 bg-[#2c2c2e] rounded-full overflow-hidden border border-[#48484a] relative">
                    {/* Progress fill racing to 100% */}
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#1a365d] to-[#2a4a7f]"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                    {/* Percentage text */}
                    <motion.span
                        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.06 }}
                    >
                        <motion.span
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{
                                scale: [1, 1.02, 1],
                            }}
                            transition={{
                                duration: 0.03, repeat: 7
                            }}
                        >
                            100%
                        </motion.span>
                    </motion.span>
                </div>

                {/* Warning icons popping up and getting overrun */}
                {warnings.map((w, i) => (
                    <motion.div
                        key={i}
                        className="absolute"
                        style={{ left: `calc(50% + ${w.x}px)`, top: `calc(50% + ${w.y}px)` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0.3], scale: [0, 1.2, 0.6] }}
                        transition={{ delay: w.delay, duration: 0.6 }}
                    >
                        <AlertTriangle size={18} className="text-[#ff9f0a]" />
                    </motion.div>
                ))}
            </div>

            <motion.p
                className="text-xs text-[#ff9f0a] mt-8 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                Ship fast → miss stuff
            </motion.p>
        </div>
    );
}
