import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../../config";
import { SlideIn, FadeIn, GlowText } from "../animations";
import { CodeEditorAnimation, AlertBadge } from "../premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene03Problem: React.FC = () => {
    const frame = useCurrentFrame();

    const codeLines = [
        { content: <><span style={{ color: "#c084fc" }}>import</span> {'{'} OpenAI {'}'} <span style={{ color: "#c084fc" }}>from</span> <span style={{ color: "#86efac" }}>'openai'</span>;</>, delay: 0.5 },
        { content: "", delay: 0.7 },
        { content: <><span style={{ color: "#6b7280" }}>// Initialize client</span></>, delay: 0.9 },
        {
            content: <><span style={{ color: "#c084fc" }}>const</span> client = <span style={{ color: "#c084fc" }}>new</span> <span style={{ color: "#93c5fd" }}>OpenAI</span>({'{'}
            </>, delay: 1.1
        },
        { content: <><span style={{ color: "#ef4444", fontWeight: 700 }}>  apiKey: "sk-live-8923..."</span>,</>, delay: 1.4 },
        { content: "  dangerouslyAllowBrowser: true", delay: 1.6 },
        { content: "});", delay: 1.8 },
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
                        fontSize: 42,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        textAlign: "center",
                    }}
                >
                    Most vibecoded apps ship with{" "}
                    <GlowText color={COLORS.danger}>dangerous mistakes</GlowText>
                </div>
            </SlideIn>

            {/* Code Editor showing leaked API key */}
            <FadeIn delay={0.4}>
                <CodeEditorAnimation
                    lines={codeLines}
                    filename="config.ts"
                    highlightLine={5}
                    highlightColor={COLORS.danger}
                />
            </FadeIn>

            {/* Alert Badge */}
            <div style={{ marginTop: 20 }}>
                <AlertBadge text="SECRET LEAK DETECTED" type="danger" delay={2.5} />
            </div>

            {/* Problem List */}
            <div style={{ display: "flex", gap: 30, marginTop: 30, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                    { icon: "🔑", text: "API keys in frontend", delay: 3 },
                    { icon: "🗄️", text: "Open databases", delay: 3.3 },
                    { icon: "🐛", text: "Debug routes live", delay: 3.6 },
                ].map((item, index) => {
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
                                gap: 14,
                                padding: "16px 24px",
                                background: `${COLORS.danger}15`,
                                border: `1px solid ${COLORS.danger}40`,
                                borderRadius: 14,
                                opacity: itemProgress,
                                transform: `translateY(${interpolate(itemProgress, [0, 1], [20, 0])}px)`,
                            }}
                        >
                            <span style={{ fontSize: 28 }}>{item.icon}</span>
                            <span style={{ color: COLORS.danger, fontSize: 20, fontWeight: 500 }}>{item.text}</span>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
};
