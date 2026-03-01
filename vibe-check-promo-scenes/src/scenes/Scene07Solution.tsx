import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, Img, staticFile } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../config";
import { FadeIn, ScaleIn, GlowText } from "../components/animations";
import { SecurityShield } from "../components/premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene07Solution: React.FC = () => {
    const frame = useCurrentFrame();

    // Logo pulse
    const logoPulse = Math.sin((frame / fps) * 2) * 0.05 + 1;

    const logoProgress = spring({
        frame: frame - fps * 1.5,
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
                gap: 40,
                backgroundColor: COLORS.background,
            }}
        >
            {/* Relief Opener */}
            <FadeIn delay={0.2}>
                <div style={{ fontSize: 38, color: COLORS.textSecondary }}>
                    It doesn't have to be like that.
                </div>
            </FadeIn>

            {/* Meet CheckVibe */}
            <ScaleIn delay={0.8}>
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                    }}
                >
                    Meet <GlowText color={COLORS.primary}>CheckVibe</GlowText>
                </div>
            </ScaleIn>

            {/* Logo with glow */}
            <div
                style={{
                    position: "relative",
                    marginTop: 20,
                    opacity: logoProgress,
                    transform: `scale(${logoProgress * logoPulse})`,
                }}
            >
                {/* Glow behind logo */}
                <div
                    style={{
                        position: "absolute",
                        inset: -60,
                        background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
                        filter: "blur(40px)",
                    }}
                />

                {/* Logo */}
                <Img
                    src={staticFile("CV_Logo.png")}
                    style={{
                        width: 220,
                        height: 220,
                        objectFit: "contain",
                        position: "relative",
                    }}
                />
            </div>

            {/* Shield */}
            <div style={{ marginTop: 20 }}>
                <SecurityShield secured delay={3} />
            </div>

            {/* Tagline */}
            <FadeIn delay={3.5}>
                <div
                    style={{
                        fontSize: 28,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        maxWidth: 700,
                        lineHeight: 1.5,
                    }}
                >
                    Built for <span style={{ color: COLORS.primary, fontWeight: 600 }}>vibecoded startups</span>
                    {" "}— for founders shipping fast with AI pair programmers
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
