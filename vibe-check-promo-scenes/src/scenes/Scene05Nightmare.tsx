import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS, VIDEO_CONFIG } from "../config";
import { SlideIn, FadeIn } from "../components/animations";
import { DMNotification } from "../components/premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene05Nightmare: React.FC = () => {
    const frame = useCurrentFrame();

    // Doom emojis floating up
    const emojis = ["💸", "📉", "💀", "😱"];

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                gap: 40,
                position: "relative",
                backgroundColor: COLORS.background,
            }}
        >
            {/* Background doom emojis */}
            {emojis.map((emoji, i) => {
                const emojiProgress = interpolate(
                    (frame + i * 30) % (fps * 3),
                    [0, fps * 3],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                );

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${20 + i * 20}%`,
                            bottom: `${10 + emojiProgress * 80}%`,
                            fontSize: 48,
                            opacity: interpolate(emojiProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0]),
                        }}
                    >
                        {emoji}
                    </div>
                );
            })}

            {/* Scene Header */}
            <SlideIn direction="bottom" delay={0.2}>
                <div style={{ fontSize: 36, color: COLORS.textSecondary, textAlign: "center" }}>
                    Now imagine this...
                </div>
            </SlideIn>

            {/* Timeline of Events */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
                <SlideIn direction="left" delay={0.5}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 28px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 14,
                        }}
                    >
                        <span style={{ fontSize: 32 }}>🐦</span>
                        <span style={{ color: COLORS.textPrimary, fontSize: 22 }}>
                            You post your big launch tweet
                        </span>
                    </div>
                </SlideIn>

                <SlideIn direction="right" delay={0.9}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 28px",
                            background: "rgba(16, 185, 129, 0.1)",
                            border: `1px solid ${COLORS.success}40`,
                            borderRadius: 14,
                        }}
                    >
                        <span style={{ fontSize: 32 }}>🎉</span>
                        <span style={{ color: COLORS.success, fontSize: 22 }}>
                            You get your first users
                        </span>
                    </div>
                </SlideIn>

                <SlideIn direction="left" delay={1.3}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 28px",
                            background: `${COLORS.danger}10`,
                            border: `1px solid ${COLORS.danger}40`,
                            borderRadius: 14,
                        }}
                    >
                        <span style={{ fontSize: 32 }}>📩</span>
                        <span style={{ color: COLORS.danger, fontSize: 22 }}>
                            And then someone DMs you...
                        </span>
                    </div>
                </SlideIn>
            </div>

            {/* The DM */}
            <div style={{ marginTop: 30 }}>
                <DMNotification
                    message="Hey, I can see all your users' data. You might want to fix that."
                    delay={2.2}
                />
            </div>

            {/* Dramatic Pause Text */}
            <FadeIn delay={4}>
                <div
                    style={{
                        fontSize: 32,
                        color: COLORS.danger,
                        textAlign: "center",
                        fontWeight: 600,
                        textShadow: `0 0 30px ${COLORS.danger}40`,
                    }}
                >
                    💔 Your launch just became your nightmare
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
