import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../../config";
import { SlideIn, FadeIn, GlowText } from "../animations";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene09Output: React.FC = () => {
    const frame = useCurrentFrame();

    const outputItems = [
        { emoji: "❌", wrong: "What's wrong", delay: 1.5 },
        { emoji: "⚠️", wrong: "Why it's dangerous", delay: 2 },
        { emoji: "✅", wrong: "Exactly how to fix it", delay: 2.5 },
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
                <div style={{ fontSize: 40, fontWeight: 600, color: COLORS.textPrimary, textAlign: "center" }}>
                    Then we tell you, in <GlowText color={COLORS.primary}>plain English</GlowText>:
                </div>
            </SlideIn>

            {/* Output Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 20 }}>
                {outputItems.map((item, index) => {
                    const itemProgress = spring({
                        frame: frame - item.delay * fps,
                        fps,
                        config: SPRING_CONFIG.snappy,
                    });

                    return (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                padding: "20px 32px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 16,
                                opacity: itemProgress,
                                transform: `translateX(${interpolate(itemProgress, [0, 1], [-40, 0])}px)`,
                            }}
                        >
                            <span style={{ fontSize: 36 }}>{item.emoji}</span>
                            <span style={{ fontSize: 28, color: COLORS.textPrimary, fontWeight: 500 }}>
                                {item.wrong}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Benefits */}
            <FadeIn delay={3.5}>
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: 30,
                    }}
                >
                    {["No security jargon", "No 50-page PDF", "Just clear steps"].map((text, i) => (
                        <div
                            key={i}
                            style={{
                                padding: "12px 24px",
                                background: `${COLORS.success}15`,
                                border: `1px solid ${COLORS.success}30`,
                                borderRadius: 100,
                                color: COLORS.success,
                                fontSize: 18,
                                fontWeight: 500,
                            }}
                        >
                            {text}
                        </div>
                    ))}
                </div>
            </FadeIn>

            {/* Copy to AI */}
            <FadeIn delay={4.5}>
                <div
                    style={{
                        marginTop: 20,
                        padding: "20px 32px",
                        background: "linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 212, 255, 0.05))",
                        border: `2px solid ${COLORS.primary}40`,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                    }}
                >
                    <span style={{ fontSize: 32 }}>📋</span>
                    <span style={{ fontSize: 22, color: COLORS.textPrimary }}>
                        Paste fixes directly into your AI assistant
                    </span>
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
