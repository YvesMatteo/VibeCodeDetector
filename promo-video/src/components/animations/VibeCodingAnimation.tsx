import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

export const VibeCodingAnimation: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Timing configuration (frames)
    const step1Start = 30; // 1s
    const step2Start = 60; // 2s
    const step3Start = 100; // ~3.3s

    // Helper for spring animations
    const getProgress = (startFrame: number) => {
        return spring({
            frame: frame - startFrame,
            fps,
            config: { damping: 200 },
        });
    };

    const step0Opacity = spring({ frame, fps, config: { damping: 200 } });
    const step1Opacity = getProgress(step1Start);
    const step2Opacity = getProgress(step2Start);
    const step3Opacity = getProgress(step3Start);

    return (
        <div className="relative w-full h-full bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col font-mono text-xl md:text-2xl shadow-2xl">
            {/* Editor Header */}
            <div className="h-10 bg-zinc-800 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="ml-4 text-sm text-zinc-500">FastShip.tsx</div>
            </div>

            {/* Editor Body */}
            <div className="p-8 text-zinc-300 space-y-4 relative">
                <div style={{ opacity: step0Opacity }}>
                    <span className="text-purple-400">const</span> App = () ={'>'} {'{'}
                </div>

                <div
                    className="pl-8"
                    style={{
                        opacity: step1Opacity,
                        transform: `translateX(${(1 - step1Opacity) * -10}px)`
                    }}
                >
                    <span className="text-blue-400">return</span> <span className="text-green-300">"Hello World!"</span>;
                </div>

                <div style={{ opacity: step2Opacity }}>
                    {'}'};
                </div>

                {/* AI Autocomplete Overlay */}
                <div
                    className="absolute top-20 left-32 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded shadow-lg backdrop-blur-sm"
                    style={{
                        opacity: frame >= step1Start && frame < step3Start ? spring({ frame: frame - step1Start, fps }) : 0,
                        transform: `scale(${frame >= step1Start ? spring({ frame: frame - step1Start, fps }) : 0})`
                    }}
                >
                    ✨ AI Generating...
                </div>

                {/* Success State */}
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                    style={{
                        opacity: step3Opacity,
                        transform: `scale(${0.8 + (step3Opacity * 0.2)})`,
                        display: frame >= step3Start ? 'flex' : 'none'
                    }}
                >
                    <div className="bg-zinc-800 border border-emerald-500/50 p-6 rounded-xl flex flex-col items-center shadow-2xl">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="text-emerald-400 font-bold text-2xl">Shipped! 🚀</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
