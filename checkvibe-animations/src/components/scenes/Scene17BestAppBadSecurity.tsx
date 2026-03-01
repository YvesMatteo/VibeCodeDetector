import { motion } from "framer-motion";
import { ShieldOff } from "lucide-react";

export default function Scene17BestAppBadSecurity() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            {/* Beautiful App UI */}
            <motion.div
                className="macos-window w-full max-w-sm relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="macos-titlebar">
                    <div className="macos-dot macos-dot-red" />
                    <div className="macos-dot macos-dot-yellow" />
                    <div className="macos-dot macos-dot-green" />
                    <span className="text-[10px] text-[#a1a1a6] ml-2">Beautiful App</span>
                </div>
                <div className="p-4 space-y-3">
                    {/* Nice UI mockup */}
                    <div className="h-6 bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] rounded-lg" />
                    <div className="flex gap-2">
                        <div className="flex-1 h-16 bg-gradient-to-br from-[#30d158]/20 to-[#64d2ff]/10 rounded-xl border border-[#30d158]/20" />
                        <div className="flex-1 h-16 bg-gradient-to-br from-[#bf5af2]/20 to-[#ff375f]/10 rounded-xl border border-[#bf5af2]/20" />
                    </div>
                    <div className="h-8 bg-[#2c2c2e] rounded-lg" />
                    <div className="h-12 bg-[#2c2c2e] rounded-lg" />
                </div>

                {/* Crack lines overlay */}
                <motion.svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    viewBox="0 0 400 300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <motion.path
                        d="M200,0 L190,80 L210,120 L180,180 L220,240 L200,300"
                        stroke="#ff453a"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    />
                    <motion.path
                        d="M0,150 L80,140 L140,160 L200,140 L280,170 L400,150"
                        stroke="#ff453a"
                        strokeWidth="1.5"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                    />
                </motion.svg>
            </motion.div>

            {/* Security bar dropping to zero */}
            <motion.div
                className="mt-6 w-full max-w-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <ShieldOff size={14} className="text-[#ff453a]" />
                    <span className="text-xs text-[#a1a1a6] font-medium">Security</span>
                </div>
                <div className="w-full h-3 bg-[#2c2c2e] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#30d158] to-[#ff453a]"
                        initial={{ width: "80%" }}
                        animate={{ width: ["80%", "40%", "5%"] }}
                        transition={{ delay: 0.2, duration: 0.6, ease: "easeIn" }}
                    />
                </div>
            </motion.div>
        </div>
    );
}
