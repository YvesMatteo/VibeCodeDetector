import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { Background } from "../common";
import { FONT_FAMILY, useScaledFrame } from "../../config";
import { Sparkles } from "lucide-react";
import { useColors } from "../../ThemeContext";

const Card = ({
    severity,
    title,
    fix,
    delay
}: {
    severity: "HIGH" | "MEDIUM",
    title: string,
    fix: string,
    delay: number
}) => {
    const frame = useScaledFrame();
    const { fps } = useVideoConfig();
    const COLORS = useColors();

    // Spring physics matching "Animation 18" pop-in
    const scale = spring({
        frame: frame - delay,
        fps,
        config: {
            damping: 12,
            stiffness: 100,
            mass: 0.5,
        }
    });

    const opacity = interpolate(frame, [delay, delay + 5], [0, 1], { extrapolateRight: "clamp" });

    // Styles matching screenshot
    const borderColor = severity === "HIGH" ? "border-red-500" : "border-amber-500";
    const badgeBg = severity === "HIGH" ? "bg-red-500/10" : "bg-amber-500/10";
    const badgeText = severity === "HIGH" ? "text-red-500" : "text-amber-500";

    return (
        <div
            className={`w-full max-w-4xl rounded-xl border-l-8 ${borderColor} p-8 mb-6 shadow-2xl relative overflow-hidden`}
            style={{
                backgroundColor: COLORS.bgCard,
                borderColor: COLORS.border,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.6)'
            }}
        >
            {/* Glow effect */}
            <div className={`absolute left-0 top-0 bottom-0 w-32 opacity-20 bg-gradient-to-r ${severity === "HIGH" ? "from-red-500" : "from-amber-500"} to-transparent pointer-events-none`} />

            <div className="flex items-center gap-4 mb-3">
                <span className={`${badgeBg} ${badgeText} px-3 py-1 rounded-md text-sm font-black tracking-wider border ${severity === "HIGH" ? "border-red-500/20" : "border-amber-500/20"}`}>
                    {severity}
                </span>
                <span className="font-bold text-3xl" style={{ color: COLORS.textPrimary }}>{title}</span>
            </div>
            <div className="text-xl pl-0 leading-relaxed">
                <span className="text-emerald-500 font-bold mr-2">Fix:</span>
                <span className="font-medium" style={{ color: COLORS.textSecondary }}>{fix}</span>
            </div>
        </div>
    );
};

const ShimmerText = ({ text, delay }: { text: string, delay: number }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Shimmer effect
    const shimmerPos = interpolate(frame, [delay, delay + 60], [-100, 200], {
        extrapolateLeft: "clamp",
        extrapolateRight: "wrap"
    });

    const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
    const y = interpolate(frame, [delay, delay + 10], [20, 0], { extrapolateRight: "clamp" });

    return (
        <div
            className="flex items-center gap-4 mt-16"
            style={{ opacity, transform: `translateY(${y}px)` }}
        >
            <Sparkles className="animate-pulse" size={48} style={{ color: COLORS.primary }} />
            <div className="relative overflow-hidden">
                <h2
                    className="text-4xl font-bold"
                    style={{ fontFamily: FONT_FAMILY, color: COLORS.primary }}
                >
                    {text}
                </h2>
                {/* Shimmer overlay - Refined for better rendering */}
                <div
                    className="absolute inset-0 w-2/3 h-full skew-x-[-20deg]"
                    style={{
                        left: `${shimmerPos}%`,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 80%, transparent 100%)',
                        // Removed filter: blur(8px) which causes rendering artifacts
                    }}
                />
            </div>
        </div>
    );
};

export const Scene15PlainEnglish: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
    const subTitleOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ fontFamily: FONT_FAMILY, backgroundColor: COLORS.bgDark }}>
            <Background />
            <AbsoluteFill className="items-center justify-center p-8">

                {/* Headers */}
                <div className="text-center mb-16 flex flex-col gap-4">
                    <h3
                        className="text-4xl font-bold tracking-tight"
                        style={{ opacity: titleOpacity, color: COLORS.textSecondary }}
                    >
                        No 50-page PDF reports
                    </h3>
                    <h1
                        className="text-7xl font-black"
                        style={{ opacity: subTitleOpacity, color: COLORS.textPrimary }}
                    >
                        Just clear, actionable fixes
                    </h1>
                </div>

                {/* Cards */}
                <div className="flex flex-col items-center w-full">
                    <Card
                        severity="HIGH"
                        title="API Key Exposed in Frontend"
                        fix="Move STRIPE_KEY to environment variables and use server-side calls."
                        delay={15}
                    />
                    <Card
                        severity="MEDIUM"
                        title="Missing Rate Limiting"
                        fix="Add rate limiting middleware to /api routes to prevent abuse."
                        delay={25}
                    />
                </div>

                {/* Shimmer Footer */}
                <ShimmerText text="Plain English explanations" delay={40} />

            </AbsoluteFill>
        </AbsoluteFill>
    );
};
