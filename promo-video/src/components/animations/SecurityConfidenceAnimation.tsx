import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { motion } from 'framer-motion';

export const SecurityConfidenceAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Sequence:
    // 0-1s: Stable High Confidence
    // 1-1.5s: Glitch/Drop
    // 1.5s+: Critical Failure

    const dropStartFrame = fps * 1.5;

    // Calculate values based on frame
    const confidence = frame < dropStartFrame
        ? 98
        : Math.max(0, 98 - (frame - dropStartFrame) * 5); // Fast drop

    const color = confidence > 80 ? '#10b981' : confidence > 40 ? '#f59e0b' : '#ef4444';
    const statusText = confidence > 80 ? 'SECURE' : confidence > 40 ? 'WARNING' : 'CRITICAL';

    const shake = frame > dropStartFrame && frame < dropStartFrame + 20
        ? Math.sin(frame) * 5
        : 0;

    return (
        <div
            className="relative flex flex-col items-center justify-center w-full h-full bg-zinc-900/50 rounded-xl overflow-hidden border border-white/5"
            style={{ transform: `translateX(${shake}px)` }}
        >
            {/* Top Label */}
            <div className="absolute top-6 text-zinc-400 text-sm uppercase tracking-widest font-semibold">
                System Integrity
            </div>

            {/* Gauge Background */}
            <div className="relative w-64 h-32 overflow-hidden mt-8 mb-4">
                {/* Background Arc */}
                <div className="absolute top-0 left-0 w-64 h-64 rounded-full border-[20px] border-zinc-800" />

                {/* Progress Arc - Simulated with SVG for better control or simple rotation clipping */}
                <svg className="w-64 h-64 -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeDasharray="125.6" // Circumference of r=20 * 2 (approx for half circle? no r=40 -> 2*pi*40 = 251. Half is 125)
                        strokeDashoffset={125.6 * (1 - confidence / 100)} // Inverted logic for half circle
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke-dashoffset 0.1s, stroke 0.2s',
                            transformOrigin: 'center'
                        }}
                    />
                </svg>
            </div>

            {/* Value Display */}
            <div className="relative z-10 flex flex-col items-center -mt-24">
                <div
                    className="text-7xl font-bold tracking-tighter transition-colors duration-200"
                    style={{ color }}
                >
                    {Math.round(confidence)}%
                </div>

                <div
                    className="text-xl font-bold tracking-widest mt-2 uppercase transition-colors duration-200"
                    style={{ color }}
                >
                    {statusText}
                </div>
            </div>

            {/* Error Overlay on Drop */}
            {confidence < 50 && (
                <div className="absolute inset-0 bg-red-500/10 z-20 flex items-center justify-center animate-pulse">
                    <div className="bg-red-500/10 border-2 border-red-500 text-red-500 px-4 py-2 rounded font-mono font-bold text-xl uppercase tracking-widest">
                        Vulnerability Detected
                    </div>
                </div>
            )}
        </div>
    );
};
