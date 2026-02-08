import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

export const RemediationAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const switchFrame = 80; // ~2.5s
    const isFixed = frame > switchFrame;

    // Scanner Beam
    const beamPos = interpolate(frame % 120, [0, 120], [0, 100]); // Loop every 4s

    // Status Change Animation
    const scale = spring({
        frame: frame - switchFrame,
        fps,
        config: { damping: 12 }
    });

    const iconScale = isFixed ? scale : 1;

    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center shadow-2xl">

            {/* Scanner Beam */}
            <div
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none z-10"
                style={{ top: `${beamPos - 100}%` }}
            />

            {/* Central Status */}
            <div
                className="relative z-20 bg-zinc-950 border p-8 rounded-3xl flex flex-col items-center gap-6 w-96 shadow-2xl"
                style={{
                    borderColor: isFixed ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    boxShadow: isFixed ? '0 0 50px rgba(16, 185, 129, 0.2)' : '0 0 50px rgba(239, 68, 68, 0.2)'
                }}
            >
                <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center ${isFixed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                    style={{ transform: `scale(${isFixed ? iconScale : 1})` }}
                >
                    {isFixed ? (
                        <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>

                <div className="text-center">
                    <div className={`text-3xl font-bold ${isFixed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isFixed ? 'SECURE' : 'VULNERABLE'}
                    </div>
                    <div className="text-lg text-zinc-500 mt-2">
                        {isFixed ? 'All threats neutralized' : 'Critical leaks detected'}
                    </div>
                </div>
            </div>

            {/* Background Code Particles */}
            <div className="absolute inset-0 opacity-10 font-mono text-xl p-8 overflow-hidden">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={isFixed ? 'text-emerald-500' : 'text-red-500'}>
                        {isFixed ? '✓ sanitized_input()' : '⚠ exec(user_input)'}
                    </div>
                ))}
            </div>
        </div>
    );
};
