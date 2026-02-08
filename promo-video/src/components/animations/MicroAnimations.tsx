import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS } from '../../config';
import { motion } from 'framer-motion';

// 1. Platform Logos (Replit, Lovable, Cursor)
export const PlatformLogos: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const icons = [
        { name: "Replit", color: "#F26207", delay: 0 },
        { name: "Lovable", color: "#000000", delay: 15 },
        { name: "Cursor", color: "#3799FF", delay: 30 },
    ];

    return (
        <div className="flex gap-12 items-center justify-center mt-8">
            {icons.map((icon, i) => {
                const progress = spring({
                    frame: frame - icon.delay,
                    fps,
                    config: { damping: 12 }
                });

                return (
                    <div
                        key={i}
                        style={{
                            transform: `scale(${progress}) translateY(${(1 - progress) * 20}px)`,
                            opacity: progress
                        }}
                        className="flex flex-col items-center gap-2"
                    >
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-2xl"
                            style={{ backgroundColor: icon.color }}
                        >
                            {icon.name[0]}
                        </div>
                        <span className="text-zinc-400 font-medium">{icon.name}</span>
                    </div>
                );
            })}
        </div>
    );
};

// 2. Vulnerability Visuals (Scene 3)
export const VulnerabilityVisuals: React.FC<{ index: number }> = ({ index }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Different animation based on index
    if (index === 0) { // API Keys
        const scroll = (frame * 2) % 100;
        return (
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden relative border border-zinc-700">
                <div className="absolute top-2 left-2 text-[8px] text-zinc-500 font-mono leading-none">
                    API_KEY=<span className="text-red-500">sk_live_...</span><br />
                    DB_PASS=<span className="text-red-500">secret</span>
                </div>
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
            </div>
        );
    }
    if (index === 1) { // Databases
        return (
            <div className="w-16 h-16 flex items-center justify-center">
                <div className="relative">
                    <span className="text-4xl">🗄️</span>
                    <div
                        className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full animate-ping"
                        style={{ opacity: Math.sin(frame / 5) }}
                    />
                </div>
            </div>
        );
    }
    return ( // Debug Routes
        <div className="w-16 h-16 flex items-center justify-center bg-zinc-800 rounded-lg border border-red-500/50">
            <div className="text-xs font-mono text-red-500 font-bold">DEBUG: ON</div>
        </div>
    );
};

// 3. Rapid Counter (Scene 4)
export const RapidCounter: React.FC<{ value: number, duration?: number }> = ({ value, duration = 2 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = interpolate(frame, [0, fps * duration], [0, 1], { extrapolateRight: 'clamp' });
    const current = Math.floor(progress * value);

    return <span>{current.toLocaleString()}</span>;
};

// 4. Consequence Icons (Scene 6)
export const ConsequenceIcons: React.FC<{ type: 'brand' | 'trust' | 'startup' | 'money' }> = ({ type }) => {
    const frame = useCurrentFrame();

    // Simple shake/break effect
    const shake = Math.sin(frame * 0.5) * 2;

    const icons = {
        brand: "💔",
        trust: "📉",
        startup: "💀",
        money: "💸"
    };

    return (
        <div style={{ transform: `rotate(${shake}deg)`, fontSize: 60 }}>
            {icons[type]}
        </div>
    );
};

// 5. Scanner Row (Scene 8)
export const ScannerRow: React.FC<{ children: React.ReactNode, delay: number }> = ({ children, delay }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const startFrame = delay * fps;
    const progress = interpolate(frame - startFrame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <div className="relative overflow-hidden p-4 rounded-xl">
            {/* Background Scan Sweep */}
            <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
                style={{
                    transform: `translateX(${(progress * 200) - 100}%)`,
                    opacity: 1 - progress // Fade out after scan
                }}
            />

            {/* Content reveals/turns green */}
            <div style={{
                opacity: 0.5 + (progress * 0.5),
                transform: `translateX(${(1 - progress) * 20}px)`,
                color: progress > 0.8 ? COLORS.success : COLORS.textPrimary,
                transition: 'color 0.3s'
            }}>
                {children}
            </div>

            {/* Checkmark appears */}
            {progress > 0.8 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">
                    ✓
                </div>
            )}
        </div>
    );
};
// 6. Actionable Button (Scene 9)
export const ActionableButton: React.FC<{ label?: string, onClickLabel?: string }> = ({
    label = "Copy to Cursor",
    onClickLabel = "Copied!"
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Simulate click at 1.5s
    const clickFrame = fps * 1.5;
    const isClicked = frame > clickFrame;

    // Scale animation for click
    const scale = spring({
        frame: frame - clickFrame,
        fps,
        config: { damping: 10, stiffness: 200 }
    });

    const scaleValue = isClicked ? interpolate(scale, [0, 0.5, 1], [1, 0.9, 1]) : 1;

    return (
        <div className="flex flex-col items-center gap-4 mt-8">
            <div
                style={{ transform: `scale(${scaleValue})` }}
                className={`
                    px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-3 transition-colors duration-300
                    ${isClicked ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-900'}
                `}
            >
                {isClicked ? (
                    <>
                        <span>✓</span>
                        <span>{onClickLabel}</span>
                    </>
                ) : (
                    <>
                        <span>📋</span>
                        <span>{label}</span>
                    </>
                )}
            </div>

            {/* Cursor Hand */}
            <div
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    transform: `translate(${interpolate(frame, [0, clickFrame], [100, 0], { extrapolateRight: 'clamp' })}px, ${interpolate(frame, [0, clickFrame], [100, 0], { extrapolateRight: 'clamp' })}px)`,
                    opacity: interpolate(frame, [0, clickFrame + 20], [0, 1, 0])
                }}
            >
                👆
            </div>
        </div>
    );
};
