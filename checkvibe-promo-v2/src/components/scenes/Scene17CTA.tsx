import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useVideoConfig, Img } from "remotion";
import { Background } from "../common";
import { FONT_FAMILY, useScaledFrame } from "../../config";
import { ShieldCheck } from "lucide-react";
import { useColors } from "../../ThemeContext";

export const Scene17CTA: React.FC = () => {
    const frame = useScaledFrame();
    const { fps } = useVideoConfig();
    const COLORS = useColors();

    // Animations
    // 1. "Before you ship..." Fade In
    const preHeaderOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" });
    const preHeaderY = interpolate(frame, [10, 20], [20, 0], { extrapolateRight: "clamp" });

    // 2. Logo Scale In & Rotate
    const logoScale = spring({
        frame: frame - 20,
        fps,
        config: { damping: 12, stiffness: 100 }
    });
    const logoOpacity = interpolate(frame, [20, 30], [0, 1], { extrapolateRight: "clamp" });

    // 3. Main Headline Fade In
    const headlineOpacity = interpolate(frame, [35, 45], [0, 1], { extrapolateRight: "clamp" });
    const headlineY = interpolate(frame, [35, 45], [20, 0], { extrapolateRight: "clamp" });

    // 4. Button Container Pop In
    const buttonScale = spring({
        frame: frame - 50,
        fps,
        config: { damping: 14 }
    });
    const buttonOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateRight: "clamp" });

    // 5. Trust Footer Fade In
    const footerOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ fontFamily: FONT_FAMILY, backgroundColor: COLORS.bgDark }}>
            <Background />
            <AbsoluteFill className="items-center justify-center p-8 flex flex-col gap-10">

                {/* Pre-header */}
                <h3
                    className="text-zinc-500 text-4xl font-medium tracking-wide"
                    style={{
                        opacity: preHeaderOpacity,
                        transform: `translateY(${preHeaderY}px)`
                    }}
                >
                    Before you ship...
                </h3>

                {/* CV Logo */}
                <div
                    className="relative"
                    style={{
                        opacity: logoOpacity,
                        transform: `scale(${logoScale})`
                    }}
                >
                    {/* Glow behind logo */}
                    <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full scale-150" />
                    <Img
                        src={staticFile("CV_Logo.png")}
                        className="w-48 h-48 object-contain relative z-10"
                    />
                </div>

                {/* Main Headline */}
                <h1
                    className="text-7xl font-black tracking-tight text-center"
                    style={{
                        opacity: headlineOpacity,
                        transform: `translateY(${headlineY}px)`,
                        color: COLORS.textPrimary
                    }}
                >
                    Run a <span className="text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">CheckVibe</span> scan
                </h1>

                {/* CTA Button/Container */}
                <div
                    style={{
                        opacity: buttonOpacity,
                        transform: `scale(${buttonScale})`
                    }}
                >
                    <div className="border border-blue-500/50 bg-blue-950/20 px-16 py-6 rounded-2xl shadow-[0_0_40px_-5px_rgba(59,130,246,0.3)] backdrop-blur-sm">
                        <span className="text-blue-400 text-4xl font-bold tracking-wide">
                            checkvibe.online
                        </span>
                    </div>
                </div>

                {/* Footer Trust */}
                <div
                    className="flex items-center gap-4 mt-8"
                    style={{ opacity: footerOpacity }}
                >
                    <ShieldCheck className="text-blue-400 fill-blue-400/20" size={40} />
                    <span className="text-blue-200 text-2xl font-medium">Ship with confidence</span>
                </div>

            </AbsoluteFill>
        </AbsoluteFill>
    );
};
