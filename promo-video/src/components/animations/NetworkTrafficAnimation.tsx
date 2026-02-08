import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

export const NetworkTrafficAnimation: React.FC = () => {
    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center shadow-2xl">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Central Node (Server) */}
            <div className="relative z-10 w-24 h-24 bg-zinc-800 rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
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
};

const SatelliteNode: React.FC<{ index: number; total: number }> = ({ index, total }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig(); // Access fps here

    const angleOffset = (index / total) * 360;
    const initialDelay = index * 5;

    // Appear animation
    const scale = spring({
        frame: frame - initialDelay,
        fps,
        config: { damping: 12 }
    });

    // Orbit Animation
    const rotationSpeed = 0.5; // degrees per frame
    const angle = angleOffset + (frame * rotationSpeed);
    const radius = 200; // px, scaled up for 9:16 potentially but sticking to relative container logic

    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);

    return (
        <div
            className="absolute w-6 h-6 bg-zinc-700 rounded-full border border-white/10 z-10 box-border"
            style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`
            }}
        >
            <div
                className="absolute inset-0 bg-white/10 rounded-full"
                style={{ opacity: (Math.sin(frame * 0.1) + 1) * 0.2 }}
            />
        </div>
    );
};


const TrafficFlow: React.FC = () => {
    const frame = useCurrentFrame();
    // Deterministic packet spawning
    // Spawn every 20 frames
    const spawnRate = 20;
    const packetCount = Math.floor(frame / spawnRate);

    // limit active packets to last 10 to keep DOM light
    const activePacketsStart = Math.max(0, packetCount - 10);

    const packets = [];
    for (let i = activePacketsStart; i < packetCount; i++) {
        // Deterministic pseudo-random based on index 'i'
        const seed = Math.sin(i) * 10000;
        const rand = seed - Math.floor(seed);

        const angle = Math.floor(rand * 6) * 60; // 6 satellite positions
        const isThreat = rand > 0.8; // 20% threat chance
        const startFrame = i * spawnRate;

        packets.push(
            <Packet
                key={i}
                startFrame={startFrame}
                angle={angle}
                isThreat={isThreat}
            />
        );
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {packets}
        </div>
    )
}


const Packet: React.FC<{ startFrame: number, angle: number, isThreat: boolean }> = ({ startFrame, angle, isThreat }) => {
    const frame = useCurrentFrame();
    const radius = 200;
    const xStart = radius * Math.cos((angle * Math.PI) / 180);
    const yStart = radius * Math.sin((angle * Math.PI) / 180);

    const duration = 40; // frames to travel
    const progress = interpolate(frame - startFrame, [0, duration], [0, 1], { extrapolateRight: 'clamp' });

    // Opacity fade in/out
    const opacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    if (progress >= 1) return null;

    return (
        <div
            className={`absolute w-3 h-3 rounded-full shadow-sm z-0 ${isThreat ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-cyan-500/50'}`}
            style={{
                transform: `translate(${xStart * (1 - progress)}px, ${yStart * (1 - progress)}px)`,
                opacity
            }}
        />
    )
}
