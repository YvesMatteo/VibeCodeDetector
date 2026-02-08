import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

export const IncidentImpactAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Graph animation
    const pathLength = 1000; // Approx length of path
    const graphProgress = spring({
        frame,
        fps,
        config: { damping: 50, stiffness: 50 }
    });


    // Floating emojis
    const floatY = (offset: number) => Math.sin((frame + offset) * 0.05) * 10;
    const emojiOpacity = (delay: number) => interpolate(
        frame - delay,
        [0, 20],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center shadow-2xl">
            {/* Background Graph Crashing */}
            <div className="absolute inset-0 flex items-end opacity-20">
                <svg className="w-full h-full" preserveAspectRatio="none">
                    <path
                        d="M0,150 Q200,50 400,250 T800,600"
                        fill="none"
                        stroke="red"
                        strokeWidth="8"
                        strokeDasharray={pathLength}
                        strokeDashoffset={pathLength * (1 - graphProgress)}
                    />
                    <path d="M0,150 L800,150" stroke="#333" strokeDasharray="10 10" strokeWidth="2" />
                </svg>
            </div>

            {/* DM Notification Removed - moved to Scene 05 */}

            {/* Floating Emojis of Doom */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-20 right-20 text-6xl"
                    style={{
                        transform: `translateY(${floatY(0)}px)`,
                        opacity: emojiOpacity(40)
                    }}
                >💸</div>
                <div
                    className="absolute bottom-20 left-20 text-6xl"
                    style={{
                        transform: `translateY(${floatY(100)}px)`,
                        opacity: emojiOpacity(60)
                    }}
                >📉</div>
            </div>
        </div>
    );
};
