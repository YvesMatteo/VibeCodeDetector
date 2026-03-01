import React from "react";
import { AbsoluteFill, spring, Img, staticFile } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn } from "../animations";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

// Platform window component - BIGGER
const PlatformWindow: React.FC<{
    name: string;
    logo: string;
    delay: number;
    x: number;
    y: number;
}> = ({ logo, delay, x, y }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const progress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    const typing = spring({
        frame: frame - (delay + 0.5) * fps,
        fps,
        config: SPRING_CONFIG.smooth,
    });

    return (
        <div
            style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${progress})`,
                opacity: progress,
                width: 380,
                backgroundColor: COLORS.bgCard,
                borderRadius: 24,
                border: `1px solid ${COLORS.border}`,
                overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
        >
            {/* Window header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 22px",
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#10B981" }} />
                </div>
                <div
                    style={{
                        marginLeft: "auto",
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    <Img
                        src={staticFile(logo)}
                        style={{ width: 32, height: 32, objectFit: "contain" }}
                    />
                </div>
            </div>

            {/* Window content */}
            <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 20,
                        backgroundColor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    <Img
                        src={staticFile(logo)}
                        style={{ width: 72, height: 72, objectFit: "contain" }}
                    />
                </div>
                {/* Typing animation bars */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                        style={{
                            height: 10,
                            backgroundColor: COLORS.bgCardHover,
                            borderRadius: 5,
                            width: `${typing * 80}%`,
                        }}
                    />
                    <div
                        style={{
                            height: 10,
                            backgroundColor: COLORS.bgCardHover,
                            borderRadius: 5,
                            width: `${typing * 60}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export const Scene01Hook: React.FC = () => {
    useScaledFrame(); // Initialize hook to ensure timing sync, even if frame isn't used directly here
    const COLORS = useColors();

    return (
        <Background>
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                    gap: 50,
                }}
            >
                {/* Platform windows - BIGGER positions */}
                <div style={{ position: "relative", width: "100%", height: 580 }}>
                    <PlatformWindow name="Replit" logo="replit-logo.webp" delay={0.3} x={-220} y={-100} />
                    <PlatformWindow name="Lovable" logo="lovable-logo.avif" delay={0.6} x={220} y={-40} />
                    <PlatformWindow name="Cursor" logo="cursor-logo.webp" delay={0.9} x={0} y={160} />
                </div>

                {/* Main text - BIGGER */}
                <div style={{ textAlign: "center", marginTop: 120 }}>
                    <SlideIn direction="bottom" delay={1.3}>
                        <div style={{ fontSize: 80, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.3 }}>
                            You just{" "}
                            <span
                                style={{
                                    background: "linear-gradient(90deg, #60a5fa, #38bdf8, #818cf8, #60a5fa, #38bdf8)",
                                    backgroundSize: "200% 100%",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    animation: "shimmer 2.5s linear infinite",
                                }}
                            >
                                vibecoded
                            </span>
                        </div>
                    </SlideIn>

                    <SlideIn direction="bottom" delay={1.6}>
                        <div style={{ fontSize: 72, fontWeight: 600, color: COLORS.textSecondary, marginTop: 24 }}>
                            your app
                        </div>
                    </SlideIn>
                </div>

                <style>
                    {`
                        @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                        }
                    `}
                </style>
            </AbsoluteFill>
        </Background>
    );
};
