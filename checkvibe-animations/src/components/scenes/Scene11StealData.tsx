import { motion } from "framer-motion";
import { Database, Skull, Lock, User, Mail, CreditCard } from "lucide-react";

export default function Scene11StealData() {
    const dataRows = [
        { icon: User, label: "john_doe", value: "••••••••", delay: 0.12 },
        { icon: Mail, label: "john@acme.co", value: "leaked", delay: 0.18 },
        { icon: CreditCard, label: "4242 •••• 8901", value: "stolen", delay: 0.24 },
        { icon: User, label: "jane_smith", value: "••••••••", delay: 0.3 },
        { icon: Mail, label: "jane@startup.io", value: "leaked", delay: 0.36 },
    ];

    const particles = Array.from({ length: 8 }, (_, i) => ({
        delay: 0.14 + i * 0.04,
        y: -20 + (i % 3) * 15,
    }));

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            {/* Subtle red ambient glow from attacker side */}
            <motion.div
                className="absolute right-0 top-0 bottom-0 w-1/2"
                style={{
                    background: 'radial-gradient(ellipse at 90% 50%, rgba(255, 69, 58, 0.06) 0%, transparent 60%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7, 1] }}
                transition={{ delay: 0.1, duration: 6, repeat: Infinity }}
            />

            <div className="flex items-center gap-6 relative w-full max-w-lg justify-center">
                {/* Database — macOS-style table view */}
                <motion.div
                    className="macos-window w-48 flex-shrink-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="macos-titlebar py-1.5 px-2 flex items-center">
                        <div className="macos-dot macos-dot-red" style={{ width: 7, height: 7 }} />
                        <div className="macos-dot macos-dot-yellow" style={{ width: 7, height: 7 }} />
                        <div className="macos-dot macos-dot-green" style={{ width: 7, height: 7 }} />
                        <div className="flex items-center gap-1 ml-2">
                            <Database size={10} className="text-[#6b93d6]" />
                            <span className="text-[9px] text-[#a1a1a6]">users_db</span>
                        </div>
                    </div>
                    {/* Table header */}
                    <div className="px-2 py-1 border-b border-[#2c2c2e] flex items-center gap-2">
                        <span className="text-[8px] text-[#636366] font-mono uppercase tracking-wider flex-1">Record</span>
                        <span className="text-[8px] text-[#636366] font-mono uppercase tracking-wider">Status</span>
                    </div>
                    {/* Data rows — fade out as they get "stolen" */}
                    <div className="p-1 space-y-0.5">
                        {dataRows.map((row, i) => (
                            <motion.div
                                key={i}
                                className="flex items-center gap-1.5 px-1.5 py-1 rounded"
                                initial={{ backgroundColor: "rgba(255,255,255,0)" }}
                                animate={{
                                    backgroundColor: [
                                        "rgba(255,255,255,0)",
                                        "rgba(255,69,58,0.08)",
                                        "rgba(255,69,58,0.03)",
                                    ],
                                    opacity: [1, 1, 0.3],
                                }}
                                transition={{ delay: row.delay, duration: 0.6 }}
                            >
                                <row.icon size={9} className="text-[#636366] flex-shrink-0" />
                                <span className="text-[9px] text-[#a1a1a6] font-mono truncate flex-1">{row.label}</span>
                                <motion.span
                                    className="text-[8px] font-mono"
                                    initial={{ color: "#636366" }}
                                    animate={{ color: ["#636366", "#ff453a"] }}
                                    transition={{ delay: row.delay + 0.06, duration: 0.6 }}
                                >
                                    {row.value}
                                </motion.span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Animated data stream — particles flowing from DB to attacker */}
                <div className="relative flex items-center" style={{ width: 80 }}>
                    {/* Base connection line */}
                    <motion.div
                        className="absolute top-1/2 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(to right, rgba(107,147,214,0.3), rgba(255,69,58,0.3))' }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    />

                    {/* Flowing data particles */}
                    {particles.map((p, i) => (
                        <motion.div
                            key={i}
                            className="absolute left-0"
                            style={{ top: `calc(50% + ${p.y}px)` }}
                            initial={{ x: 0, opacity: 0, scale: 0 }}
                            animate={{
                                x: [0, 20, 50, 80],
                                opacity: [0, 0.9, 0.8, 0],
                                scale: [0, 1, 0.8, 0.3],
                            }}
                            transition={{
                                delay: p.delay,
                                duration: 0.2,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatDelay: 4,
                            }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#6b93d6] to-[#ff453a] shadow-sm shadow-red-500/30" />
                        </motion.div>
                    ))}

                    {/* Lock icon breaking */}
                    <motion.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 0.3],
                            scale: [0, 1.2, 0.8],
                            rotate: [0, 0, 15],
                        }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    >
                        <Lock size={14} className="text-[#ff453a]/60" />
                    </motion.div>
                </div>

                {/* Attacker — dark terminal */}
                <motion.div
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06, duration: 0.6 }}
                >
                    <div className="relative">
                        {/* Pulsing red glow behind */}
                        <motion.div
                            className="absolute -inset-2 rounded-3xl"
                            style={{ background: 'radial-gradient(circle, rgba(255,69,58,0.15) 0%, transparent 70%)' }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2c1215] to-[#1a0a0b] border border-[#ff453a]/20 flex flex-col items-center justify-center relative overflow-hidden">
                            <Skull size={24} className="text-[#ff453a] z-10" />
                            {/* Scrolling stolen data text */}
                            <motion.div
                                className="absolute bottom-1 left-1 right-1 overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <motion.div
                                    className="text-[6px] font-mono text-[#ff453a]/40 whitespace-nowrap"
                                    animate={{ x: [0, -100] }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                >
                                    john@acme.co • 4242****8901 • jane@startup.io • password123 •
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                    <span className="text-[10px] text-[#ff453a]/80 font-medium">Attacker</span>
                </motion.div>
            </div>

            {/* Bottom text */}
            <motion.p
                className="text-sm text-[#ff453a] mt-6 font-semibold tracking-wide"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                Steal your users' data
            </motion.p>
        </div>
    );
}
