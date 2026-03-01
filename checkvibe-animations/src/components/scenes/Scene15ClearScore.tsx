import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Shield } from "lucide-react";
import { useEffect } from "react";

function AnimatedScore({ from, to, delay }: { from: number; to: number; delay: number }) {
    const count = useMotionValue(from);
    const rounded = useTransform(count, Math.round);
    useEffect(() => {
        const controls = animate(count, to, { delay, duration: 0.6, ease: "easeOut" });
        return controls.stop;
    }, [count, to, delay]);
    return <motion.span>{rounded}</motion.span>;
}

export default function Scene15ClearScore() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="flex flex-col items-center gap-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
            >
                {/* Score Circle */}
                <div className="relative w-40 h-40">
                    {/* Background ring */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="#2c2c2e"
                            strokeWidth="6"
                        />
                        <motion.circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={264}
                            initial={{ strokeDashoffset: 264 }}
                            animate={{ strokeDashoffset: [264, 153, 68] }}
                            transition={{ delay: 0.08, duration: 0.6, ease: "easeOut" }}
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ff453a" />
                                <stop offset="50%" stopColor="#ff9f0a" />
                                <stop offset="100%" stopColor="#30d158" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Score number */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div className="text-5xl font-bold text-[#f5f5f7]">
                            <AnimatedScore from={42} to={74} delay={0.12} />
                        </motion.div>
                        <div className="text-xs text-[#a1a1a6] font-medium">/ 100</div>
                    </div>
                </div>

                {/* Label */}
                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                >
                    <Shield size={18} className="text-[#0a84ff]" />
                    <span className="text-lg font-semibold text-[#f5f5f7]">Security Score</span>
                </motion.div>

                {/* After fixes callout */}
                <motion.div
                    className="bg-[#30d158]/10 border border-[#30d158]/30 rounded-xl px-4 py-2 flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <span className="text-xs text-[#30d158] font-medium">↑ +32 points after fixes</span>
                </motion.div>
            </motion.div>
        </div>
    );
}
