import { motion } from 'framer-motion';

export default function ScannerAnimation() {
    return (
        <div className="relative flex items-center justify-center w-full h-64 bg-black/20 rounded-xl overflow-hidden group border border-white/5">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Radar Circles */}
            <div className="absolute border border-cyan-500/20 w-48 h-48 rounded-full" />
            <div className="absolute border border-cyan-500/10 w-32 h-32 rounded-full" />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-cyan-500/10" />
            <div className="absolute h-full w-[1px] bg-cyan-500/10" />

            {/* Rotating Radar Sweep */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 rounded-full z-10 will-change-transform"
                style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, transparent 240deg, rgba(6,182,212,0.3) 360deg)'
                }}
            />

            {/* Detected Targets (Pings) */}
            <TargetPing delay={0.5} x={-40} y={-60} />
            <TargetPing delay={1.8} x={60} y={20} />
            <TargetPing delay={3.2} x={-20} y={50} />

            {/* Status Overlay */}
            <div className="absolute top-4 left-4 font-mono text-xs text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20 backdrop-blur-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                ACTIVE SCAN
            </div>
        </div>
    );
}

function TargetPing({ delay, x, y }: { delay: number; x: number; y: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.5],
            }}
            transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 2,
                delay: delay,
                ease: "easeOut"
            }}
            className="absolute w-4 h-4 z-20"
            style={{ x, y }}
        >
            <div className="w-full h-full bg-cyan-400/50 rounded-full blur-[2px]" />
            <div className="absolute inset-0 border border-cyan-200 rounded-full animate-ping opacity-50" />
        </motion.div>
    );
}
