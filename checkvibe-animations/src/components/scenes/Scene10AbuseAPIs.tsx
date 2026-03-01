import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Activity, AlertTriangle, Globe } from "lucide-react";
import { useEffect } from "react";

function AnimatedNumber({ from, to, delay, suffix = "" }: { from: number; to: number; delay: number; suffix?: string }) {
    const count = useMotionValue(from);
    const rounded = useTransform(count, (v) => `${Math.round(v).toLocaleString()}${suffix}`);
    useEffect(() => {
        const controls = animate(count, to, { delay, duration: 0.6, ease: "easeIn" });
        return controls.stop;
    }, [count, to, delay]);
    return <motion.span>{rounded}</motion.span>;
}

export default function Scene10AbuseAPIs() {
    const bars = [20, 35, 25, 45, 30, 65, 80, 95, 100, 90, 100, 100];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="macos-window w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="macos-titlebar">
                    <div className="macos-dot macos-dot-red" />
                    <div className="macos-dot macos-dot-yellow" />
                    <div className="macos-dot macos-dot-green" />
                    <span className="text-[10px] text-[#a1a1a6] ml-2">API Dashboard</span>
                    <Activity size={12} className="text-[#ff453a] ml-auto" />
                </div>
                <div className="p-4">
                    {/* Stats row */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 bg-[#1c1c1e] rounded-xl p-3 border border-[#48484a]">
                            <div className="text-[9px] text-[#a1a1a6] mb-1">Requests / min</div>
                            <div className="text-xl font-bold text-[#ff453a]">
                                <AnimatedNumber from={120} to={48502} delay={0.1} suffix="" />
                            </div>
                        </div>
                        <div className="flex-1 bg-[#1c1c1e] rounded-xl p-3 border border-[#48484a]">
                            <div className="text-[9px] text-[#a1a1a6] mb-1">Error Rate</div>
                            <div className="text-xl font-bold text-[#ff9f0a]">
                                <AnimatedNumber from={0} to={73} delay={0.16} suffix="%" />
                            </div>
                        </div>
                    </div>

                    {/* Bar chart */}
                    <div className="flex items-end gap-1 h-20">
                        {bars.map((h, i) => (
                            <motion.div
                                key={i}
                                className="flex-1 rounded-t-sm"
                                style={{
                                    background: h > 70 ? '#ff453a' : h > 50 ? '#ff9f0a' : '#0a84ff',
                                }}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.08 + i * 0.04, duration: 0.6, ease: "easeOut" }}
                            />
                        ))}
                    </div>

                    {/* Labels */}
                    <div className="flex gap-3 mt-3">
                        <motion.div
                            className="flex items-center gap-1 bg-[#ff453a]/10 border border-[#ff453a]/30 rounded-full px-2 py-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <AlertTriangle size={10} className="text-[#ff453a]" />
                            <span className="text-[9px] text-[#ff453a] font-medium">Spam traffic</span>
                        </motion.div>
                        <motion.div
                            className="flex items-center gap-1 bg-[#ff9f0a]/10 border border-[#ff9f0a]/30 rounded-full px-2 py-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Globe size={10} className="text-[#ff9f0a]" />
                            <span className="text-[9px] text-[#ff9f0a] font-medium">Unexpected region</span>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
