import { motion } from "framer-motion";

export default function Scene01Opener() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            {/* Dashboard Background - catching fire */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="macos-window w-[85%] h-[75%] opacity-30">
                    <div className="macos-titlebar">
                        <div className="macos-dot macos-dot-red" />
                        <div className="macos-dot macos-dot-yellow" />
                        <div className="macos-dot macos-dot-green" />
                        <span className="text-[10px] text-[#a1a1a6] ml-2">Dashboard — My Startup</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-1 h-16 rounded-lg bg-[#2c2c2e]" />
                            <div className="flex-1 h-16 rounded-lg bg-[#2c2c2e]" />
                            <div className="flex-1 h-16 rounded-lg bg-[#2c2c2e]" />
                        </div>
                        <div className="h-32 rounded-lg bg-[#2c2c2e]" />
                        <div className="flex gap-3">
                            <div className="flex-1 h-20 rounded-lg bg-[#2c2c2e]" />
                            <div className="flex-1 h-20 rounded-lg bg-[#2c2c2e]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Glitch / crack lines */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute bg-gradient-to-r from-transparent via-red-500/60 to-transparent"
                    style={{
                        width: `${60 + i * 15}%`,
                        height: '2px',
                        top: `${15 + i * 14}%`,
                        left: `${-10 + (i % 3) * 5}%`,
                        rotate: `${-2 + i * 1.5}deg`,
                    }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: [0, 0.8, 0.4], scaleX: [0, 1, 1] }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.6 }}
                />
            ))}

            {/* Fire glow at bottom */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{
                    background: 'linear-gradient(to top, rgba(255, 69, 58, 0.3), rgba(255, 159, 10, 0.1), transparent)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.8, 0.5] }}
                transition={{ delay: 0.16, duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />

            {/* Main Text */}
            <motion.div
                className="relative z-10 text-center max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.6 }}
            >
                <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                    <span className="text-[#f5f5f7]">Your AI startup is </span>
                    <motion.span
                        className="text-[#ff453a]"
                        animate={{ opacity: [1, 0.6, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        cooked
                    </motion.span>
                    <br />
                    <span className="text-[#a1a1a6] text-xl md:text-2xl font-medium">
                        and you do not even know it yet.
                    </span>
                </h1>
            </motion.div>

            {/* Glitch overlay */}
            <motion.div
                className="absolute inset-0 bg-red-500/5"
                animate={{ opacity: [0, 0.1, 0, 0.15, 0] }}
                transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 4 }}
            />
        </div>
    );
}
