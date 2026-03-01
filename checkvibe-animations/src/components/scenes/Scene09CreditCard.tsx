import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { CreditCard, Cloud, TrendingUp } from "lucide-react";
import { useEffect } from "react";

function AnimatedCounter({ from, to, delay, prefix = "$", className = "" }: { from: number; to: number; delay: number; prefix?: string; className?: string }) {
    const count = useMotionValue(from);
    const rounded = useTransform(count, (v) => `${prefix}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    useEffect(() => {
        const controls = animate(count, to, { delay, duration: 0.6, ease: "easeIn" });
        return controls.stop;
    }, [count, to, delay]);

    return <motion.span className={className}>{rounded}</motion.span>;
}

export default function Scene09CreditCard() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="flex gap-6 items-start">
                {/* Credit Card */}
                <motion.div
                    className="w-64 h-40 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] rounded-2xl border border-[#48484a] shadow-2xl p-5 relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Card chip shimmer */}
                    <div className="w-10 h-7 rounded-md bg-gradient-to-br from-[#ffd60a]/40 to-[#ff9f0a]/20 mb-4" />
                    <div className="font-mono text-[#a1a1a6] tracking-[0.2em] text-sm mb-3">
                        •••• •••• •••• 4242
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[8px] text-[#a1a1a6] uppercase">Card Holder</div>
                            <div className="text-xs text-[#f5f5f7]">Startup Founder</div>
                        </div>
                        <CreditCard size={20} className="text-[#48484a]" />
                    </div>

                    {/* Red danger pulse */}
                    <motion.div
                        className="absolute inset-0 border-2 border-[#ff453a] rounded-2xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ delay: 0.16, duration: 3, repeat: Infinity }}
                    />
                </motion.div>

                {/* Banking App Screen */}
                <motion.div
                    className="w-48 rounded-3xl border border-[#48484a] bg-[#1c1c1e] overflow-hidden shadow-xl"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 }}
                >
                    {/* iOS Status Bar */}
                    <div className="ios-statusbar">
                        <span>9:41</span>
                        <div className="flex gap-1 items-center">
                            <div className="w-4 h-2 border border-[#f5f5f7] rounded-sm relative">
                                <div className="absolute inset-0.5 bg-[#30d158] rounded-[1px]" />
                            </div>
                        </div>
                    </div>
                    <div className="px-4 pb-4 space-y-3">
                        <div className="text-[10px] text-[#a1a1a6]">Cloud Charges</div>
                        <div className="flex items-center gap-1">
                            <Cloud size={14} className="text-[#0a84ff]" />
                            <TrendingUp size={14} className="text-[#ff453a]" />
                        </div>
                        <motion.div className="text-2xl font-bold text-[#ff453a]">
                            <AnimatedCounter from={12.50} to={8429.99} delay={0.12} />
                        </motion.div>
                        <div className="h-px bg-[#3a3a3c]" />
                        <div className="text-[10px] text-[#a1a1a6]">Balance</div>
                        <motion.div className="text-lg font-bold text-[#f5f5f7]">
                            <AnimatedCounter from={10000} to={1570.01} delay={0.12} />
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
