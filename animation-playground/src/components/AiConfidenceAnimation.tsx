import { motion } from 'framer-motion';

export default function AiConfidenceAnimation() {
    const confidence = 98; // Target percentage

    return (
        <div className="relative flex flex-col items-center justify-center w-full h-64 bg-zinc-900/50 rounded-xl overflow-hidden">
            {/* Gauge Background */}
            <div className="relative w-48 h-24 overflow-hidden mb-4">
                {/* Background Arc */}
                <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-zinc-800" />

                {/* Progress Arc */}
                <motion.div
                    initial={{ rotate: -180 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent border-t-emerald-500 border-r-emerald-500"
                    style={{
                        rotate: -45, // Offset to make it semi-circular
                        boxShadow: '0 0 20px rgba(16,185,129,0.2)'
                    }}
                />

                {/* Needle / Value Wrapper (Simplified to text for cleaner UI) */}
            </div>

            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.5, type: "spring" }}
                    className="text-5xl font-bold text-white tracking-tighter"
                >
                    <Counter from={0} to={confidence} />%
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.8 }}
                    className="text-xs font-medium uppercase tracking-widest text-emerald-400 mt-2 flex items-center gap-2"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI Generated
                </motion.div>
            </div>

            {/* Decorative Particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-emerald-500/30 rounded-full"
                        initial={{ opacity: 0, y: 100, x: Math.random() * 100 - 50 }}
                        animate={{ opacity: [0, 1, 0], y: -100 }}
                        transition={{
                            duration: 2 + Math.random(),
                            repeat: Infinity,
                            delay: Math.random() * 2
                        }}
                        style={{ left: '50%', bottom: 0 }}
                    />
                ))}
            </div>
        </div>
    );
}

function Counter({ from, to }: { from: number; to: number }) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {to}
        </motion.span>
    );
}
