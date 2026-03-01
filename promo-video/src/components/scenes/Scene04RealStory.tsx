import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../../config";
import { SlideIn, FadeIn, ScaleIn, GlowText } from "../animations";
import { RapidCounter } from "../premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene04RealStory: React.FC = () => {
    const frame = useCurrentFrame();

    const stats = [
        { value: 150000, label: "API keys exposed", icon: "🔑", delay: 2 },
        { value: 50000, label: "User records leaked", icon: "👤", delay: 2.5 },
        { value: 1, label: "Misconfigured database", icon: "🗄️", delay: 3 },
    ];

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                gap: 40,
            }}
        >
            {/* Title */}
            <SlideIn direction="bottom" delay={0.2}>
                <div
                    style={{
                        fontSize: 38,
                        fontWeight: 500,
                        color: COLORS.textSecondary,
                    }}
                >
                    This isn't theoretical.
                </div>
            </SlideIn>

            {/* Case Study Card */}
            <FadeIn delay={0.6}>
                <div
                    style={{
                        background: "rgba(239, 68, 68, 0.08)",
                        border: `2px solid ${COLORS.danger}40`,
                        borderRadius: 24,
                        padding: "40px 50px",
                        maxWidth: 800,
                        textAlign: "center",
                    }}
                >
                    {/* Company Name */}
                    <div
                        style={{
                            fontSize: 28,
                            color: COLORS.textSecondary,
                            marginBottom: 10,
                        }}
                    >
                        Take, for example...
                    </div>

                    <div
                        style={{
                            fontSize: 56,
                            fontWeight: 700,
                            color: COLORS.danger,
                            textShadow: `0 0 40px ${COLORS.danger}40`,
                            marginBottom: 20,
                        }}
                    >
                        Moltbook
                    </div>

                    <div
                        style={{
                            fontSize: 24,
                            color: COLORS.textSecondary,
                            lineHeight: 1.5,
                        }}
                    >
                        An AI agent platform that left a database{" "}
                        <span style={{ color: COLORS.danger, fontWeight: 600 }}>publicly accessible</span>
                    </div>
                </div>
            </FadeIn>

            {/* Stats */}
            <div style={{ display: "flex", gap: 40, marginTop: 20 }}>
                {stats.map((stat, index) => {
                    const statProgress = spring({
                        frame: frame - stat.delay * fps,
                        fps,
                        config: SPRING_CONFIG.bouncy,
                    });

                    return (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 10,
                                padding: "24px 32px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 20,
                                opacity: statProgress,
                                transform: `scale(${statProgress})`,
                            }}
                        >
                            <span style={{ fontSize: 40 }}>{stat.icon}</span>
                            <div
                                style={{
                                    fontSize: 42,
                                    fontWeight: 700,
                                    color: COLORS.danger,
                                    fontFamily: "monospace",
                                }}
                            >
                                <RapidCounter endValue={stat.value} duration={1.5} delay={stat.delay} />
                            </div>
                            <div style={{ fontSize: 16, color: COLORS.textSecondary, textAlign: "center" }}>
                                {stat.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Message */}
            <FadeIn delay={4}>
                <div
                    style={{
                        fontSize: 26,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        maxWidth: 700,
                        lineHeight: 1.5,
                        marginTop: 20,
                    }}
                >
                    They didn't get hacked by genius attackers.{" "}
                    <span style={{ color: COLORS.warning }}>
                        They got hacked by copy-paste bugs.
                    </span>
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
