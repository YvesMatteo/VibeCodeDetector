import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, useScaledFrame } from "../../config";
import { SlideIn } from "../animations";
import { Background } from "../common";
import { useColors, useTheme } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

export const Scene04Trust: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();
    const { theme } = useTheme();

    // Darkening overlay - fades in over 2 seconds
    const darkenOpacity = interpolate(
        frame,
        [0, 60],
        [0, 0.5],
        { extrapolateRight: "clamp" }
    );

    // Question mark animation - delay: 1s = 30 frames
    const questionDelay = 30;
    const questionScale = spring({
        frame: frame - questionDelay,
        fps,
        config: { damping: 12, stiffness: 100 },
    });
    // Gentle wobble animation
    const wobble = Math.sin((frame - questionDelay) / 8) * 8;

    // Padlock animation - delay: 1.5s = 45 frames
    const padlockDelay = 45;
    const padlockScale = spring({
        frame: frame - padlockDelay,
        fps,
        config: { damping: 15, stiffness: 80 },
    });
    // Flickering glow effect
    const flickerPhase = (frame - padlockDelay) / 6;
    const flickerGlow = Math.sin(flickerPhase) * 0.3 + 0.7;

    return (
        <Background variant="dark">
            {/* Darkening Overlay */}
            {/* Darkening Overlay - only in dark mode */}
            {theme === "dark" && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        opacity: darkenOpacity,
                        zIndex: 5,
                        pointerEvents: "none",
                    }}
                />
            )}

            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                    gap: 30,
                    zIndex: 10,
                }}
            >
                {/* Security doubt visual */}
                <div style={{ position: "relative", marginBottom: 30 }}>
                    {/* Founder avatar */}
                    <div
                        style={{
                            width: 140,
                            height: 140,
                            backgroundColor: "rgba(59, 130, 246, 0.15)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "3px solid #3b82f6",
                            filter: "grayscale(40%)",
                        }}
                    >
                        <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>

                    {/* Question Mark - with glow and wobble */}
                    <div
                        style={{
                            position: "absolute",
                            top: -35,
                            right: -55,
                            zIndex: 30,
                            transform: `scale(${questionScale}) rotate(${wobble}deg)`,
                            opacity: questionScale,
                            filter: `drop-shadow(0 0 16px rgba(234, 179, 8, 0.6))`,
                        }}
                    >
                        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>

                    {/* Flickering Padlock - with red glow */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: -20,
                            left: -50,
                            zIndex: 30,
                            transform: `scale(${padlockScale})`,
                            opacity: padlockScale * flickerGlow,
                            filter: `drop-shadow(0 0 14px rgba(239, 68, 68, ${flickerGlow * 0.7}))`,
                        }}
                    >
                        <svg width="75" height="75" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                </div>

                {/* Text - kept as original */}
                <SlideIn direction="bottom" delay={0.3}>
                    <div style={{ textAlign: "center", maxWidth: 900 }}>
                        <div style={{ fontSize: 52, fontWeight: 500, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                            Or did you just trust
                        </div>
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={0.8}>
                    <div style={{ textAlign: "center", maxWidth: 900 }}>
                        <div style={{ fontSize: 60, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                            that the AI{" "}
                            <span style={{
                                fontStyle: "italic",
                                background: "linear-gradient(90deg, #fbbf24, #facc15, #fde047, #fbbf24, #facc15)",
                                backgroundSize: "200% 100%",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                animation: "shimmer 2.5s linear infinite",
                            }}>
                                "kinda handled it"
                            </span>
                        </div>
                    </div>
                </SlideIn>

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
