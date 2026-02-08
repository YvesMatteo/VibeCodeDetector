import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function NetworkTrafficAnimation() {
    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Central Node (Server) */}
            <div className="relative z-10 w-16 h-16 bg-zinc-800 rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
                </div>
            </div>

            {/* Orbiting Satellite Nodes */}
            {[...Array(6)].map((_, i) => (
                <SatelliteNode key={i} index={i} total={6} />
            ))}

            {/* Traffic Particles */}
            <TrafficFlow />
        </div>
    );
}

function SatelliteNode({ index, total }: { index: number; total: number }) {
    const angle = (index / total) * 360;
    const radius = 90; // px

    // Convert polar to cartesian
    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);

    return (
        <motion.div
            className="absolute w-3 h-3 bg-zinc-700 rounded-full border border-white/10 z-10"
            style={{ x, y }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
        >
            <div className="absolute inset-0 bg-white/10 rounded-full animate-ping opacity-20" />
        </motion.div>
    )
}

function TrafficFlow() {
    const [packets, setPackets] = useState<{ id: number, angle: number, isThreat: boolean }[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.4) { // 60% chance to spawn (reduced from 70%)
                setPackets(prev => {
                    const newPackets = [
                        ...prev.slice(-5), // Keep only 5 packets (reduced from 10)
                        {
                            id: Date.now(),
                            angle: Math.floor(Math.random() * 6) * 60,
                            isThreat: Math.random() > 0.85
                        }
                    ];
                    return newPackets;
                });
            }
        }, 1200); // Slower interval (was 800ms)
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {packets.map(p => (
                <Packet key={p.id} angle={p.angle} isThreat={p.isThreat} />
            ))}
        </div>
    )
}

function Packet({ angle, isThreat }: { angle: number, isThreat: boolean }) {
    const radius = 90;
    const xStart = radius * Math.cos((angle * Math.PI) / 180);
    const yStart = radius * Math.sin((angle * Math.PI) / 180);

    return (
        <motion.div
            initial={{ x: xStart, y: yStart, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, ease: "easeIn" }}
            className={`absolute w-2 h-2 rounded-full shadow-sm z-0 ${isThreat ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-cyan-500/50'}`}
        >
            {isThreat && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 2 }}
                    transition={{ delay: 1.2, duration: 0.3 }}
                    className="absolute inset-0 bg-red-500/30 rounded-full"
                />
            )}
        </motion.div>
    )
}
