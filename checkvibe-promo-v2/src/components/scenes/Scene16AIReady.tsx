import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../common";
import { FONT_FAMILY, useScaledFrame } from "../../config";
import { ArrowRight, Bot, Copy } from "lucide-react";
import { useColors } from "../../ThemeContext";

const CodeCard = ({ delay }: { delay: number }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Scan effect (mimics motion.div x: -100% -> 100%)
    const scanPos = interpolate(frame, [delay, delay + 20], [-100, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
    });

    const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });

    return (
        <div
            className="w-80 rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-3"
            style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border, borderWidth: 1, opacity }}
        >
            <div className="flex items-center justify-between text-zinc-500 text-sm font-bold uppercase tracking-wider">
                <span>CheckVibe Fix</span>
                <Copy size={16} />
            </div>

            <div className="p-4 rounded-lg border border-emerald-500/30 relative overflow-hidden group" style={{ backgroundColor: COLORS.bgCardHover }}>
                <code className="text-sm text-emerald-400 font-mono block">
                    Rotate API Key...<br />
                    move to .env file...
                </code>

                {/* Scan Overlay */}
                <div
                    className="absolute inset-0 bg-emerald-500/20"
                    style={{
                        transform: `translateX(${scanPos}%)`
                    }}
                />
            </div>
        </div>
    );
};

const AICard = ({ delay }: { delay: number }) => {
    const frame = useScaledFrame();
    const { fps } = useVideoConfig();
    const COLORS = useColors();

    // Prompt Bubble Animation (Pop in)
    const promptScale = spring({
        frame: frame - delay,
        fps,
        config: { damping: 12 }
    });
    const promptOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });

    // Response Bubble Animation (Fade in)
    const responseDelay = delay + 30; // 1s later
    const responseOpacity = interpolate(frame, [responseDelay, responseDelay + 10], [0, 1], { extrapolateRight: "clamp" });

    // Typing Cursor
    const cursorOpacity = Math.sin(frame / 5) > 0 ? 1 : 0;

    return (
        <div
            className="w-80 rounded-xl p-5 shadow-2xl flex flex-col gap-3"
            style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border, borderWidth: 1 }}
        >
            <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase tracking-wider">
                <Bot size={16} />
                <span>ChatGPT / Claude</span>
            </div>

            <div className="flex flex-col gap-3 h-32 justify-end">
                {/* User Prompt */}
                <div
                    className="bg-blue-600/20 p-3 rounded-lg rounded-br-none text-blue-200 self-end max-w-[90%] text-sm"
                    style={{
                        opacity: promptOpacity,
                        transform: `scale(${promptScale})`,
                        transformOrigin: 'bottom right'
                    }}
                >
                    Rotate API Key...
                </div>

                {/* AI Response */}
                <div
                    className="p-3 rounded-lg rounded-bl-none max-w-[90%] text-sm flex items-center gap-1"
                    style={{ opacity: responseOpacity, backgroundColor: COLORS.bgCardHover, color: COLORS.textSecondary }}
                >
                    <span className="text-emerald-400">Fixing code...</span>
                    <span style={{ opacity: cursorOpacity }}>|</span>
                </div>
            </div>
        </div>
    );
};

export const Scene16AIReady: React.FC = () => {
    const frame = useScaledFrame();
    const { fps } = useVideoConfig();
    const COLORS = useColors();

    // Header Animations
    const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const subTitleOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

    // Arrow Animation
    const arrowDelay = 25;
    const arrowOpacity = interpolate(frame, [arrowDelay, arrowDelay + 10], [0, 1], { extrapolateRight: "clamp" });
    const arrowX = interpolate(frame, [arrowDelay, arrowDelay + 30], [-10, 10], {
        extrapolateRight: "clamp",
        easing: (t) => Math.sin(t * Math.PI) // subtle bounce
    });

    return (
        <AbsoluteFill style={{ fontFamily: FONT_FAMILY, backgroundColor: COLORS.bgDark }}>
            <Background />
            <AbsoluteFill className="items-center justify-center p-8">

                {/* Headers */}
                <div className="text-center mb-16 flex flex-col gap-3">
                    <h1
                        className="text-7xl font-black tracking-tight"
                        style={{ opacity: titleOpacity, color: COLORS.textPrimary }}
                    >
                        AI-Ready Fixes
                    </h1>
                    <h3
                        className="text-zinc-400 text-3xl font-medium"
                        style={{ opacity: subTitleOpacity }}
                    >
                        One-click copy to your AI assistant
                    </h3>
                </div>

                {/* Flow Container */}
                <div className="flex items-center gap-8">
                    {/* Left: Code Card */}
                    <div style={{ transform: `scale(${spring({ frame: frame - 10, fps })})` }}>
                        <CodeCard delay={15} />
                    </div>

                    {/* Arrow */}
                    <div className="text-zinc-600" style={{ opacity: arrowOpacity, transform: `translateX(${arrowX}px)` }}>
                        <ArrowRight size={48} />
                    </div>

                    {/* Right: AI Card */}
                    <div style={{ transform: `scale(${spring({ frame: frame - 20, fps })})` }}>
                        <AICard delay={45} />
                    </div>
                </div>

            </AbsoluteFill>
        </AbsoluteFill>
    );
};
