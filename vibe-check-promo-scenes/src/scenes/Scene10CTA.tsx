import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, Img, staticFile } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../config";
import { SlideIn, FadeIn, GlowText } from "../components/animations";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene10CTA: React.FC = () => {
    const frame = useCurrentFrame();

    // Button pulse animation
    const buttonPulse = Math.sin((frame / fps) * 3) * 0.03 + 1;

    // Logo entrance
    const logoProgress = spring({
        frame: frame - fps * 3,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                gap: 30,
                backgroundColor: COLORS.background,
            }}
        >
            {/* Speed Comparison */}
            <SlideIn direction="bottom" delay={0.2}>
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 34, color: COLORS.textSecondary, marginBottom: 10 }}>
                        You vibecoded your app in a weekend.
                    </div>
                    <div style={{ fontSize: 34, color: COLORS.danger, fontWeight: 600 }}>
                        Attackers can <GlowText color={COLORS.danger}>vibehack</GlowText> it just as fast.
                    </div>
                </div>
            </SlideIn>

            {/* Main CTA */}
            <FadeIn delay={1.2}>
                <div
                    style={{
                        fontSize: 52,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        textAlign: "center",
                        marginTop: 20,
                    }}
                >
                    Before you ship, run a{" "}
                    <GlowText color={COLORS.primary}>CheckVibe</GlowText> scan.
                </div>
            </FadeIn>

            {/* Logo */}
            <div
                style={{
                    marginTop: 30,
                    opacity: logoProgress,
                    transform: `scale(${logoProgress})`,
                }}
            >
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {/* Glow */}
                    <div
                        style={{
                            position: "absolute",
                            inset: -40,
                            background: `radial-gradient(circle, ${COLORS.primary}50 0%, transparent 70%)`,
                            filter: "blur(30px)",
                        }}
                    />
                    <Img
                        src={staticFile("CV_Logo.png")}
                        style={{
                            width: 160,
                            height: 160,
                            objectFit: "contain",
                        }}
                    />
                </div>
            </div>

            {/* Website Button */}
            <FadeIn delay={2.5}>
                <div
                    style={{
                        marginTop: 30,
                        padding: "24px 60px",
                        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primary}CC)`,
                        borderRadius: 100,
                        transform: `scale(${buttonPulse})`,
                        boxShadow: `0 10px 40px ${COLORS.primary}50, 0 0 60px ${COLORS.primary}30`,
                    }}
                >
                    <span style={{ fontSize: 32, fontWeight: 700, color: "#0a0a0f" }}>
                        checkvibe.online
                    </span>
                </div>
            </FadeIn>

            {/* Protection Taglines */}
            <FadeIn delay={3.5}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 30,
                    }}
                >
                    {["Protect your users.", "Protect your idea.", "Protect your money."].map((text, i) => {
                        const tagProgress = spring({
                            frame: frame - (3.5 + i * 0.3) * fps,
                            fps,
                            config: SPRING_CONFIG.snappy,
                        });

                        return (
                            <div
                                key={i}
                                style={{
                                    fontSize: 26,
                                    color: COLORS.success,
                                    fontWeight: 500,
                                    opacity: tagProgress,
                                    transform: `translateX(${interpolate(tagProgress, [0, 1], [-30, 0])}px)`,
                                }}
                            >
                                ✓ {text}
                            </div>
                        );
                    })}
                </div>
            </FadeIn>

            {/* Final Tagline */}
            <FadeIn delay={5}>
                <div
                    style={{
                        fontSize: 30,
                        fontWeight: 600,
                        color: COLORS.primary,
                        textAlign: "center",
                        marginTop: 30,
                        textShadow: `0 0 30px ${COLORS.primaryGlow}`,
                    }}
                >
                    Don't get hacked for your vibecoded startup. 🛡️
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
