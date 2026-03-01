import React from "react";
import { AbsoluteFill, spring } from "remotion";
import { VIDEO_CONFIG, COLORS, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, ScaleIn } from "../animations";
import { Background } from "../common";

const fps = VIDEO_CONFIG.FPS;

// Code editor with leaked API key - BIGGER
const CodeEditor: React.FC = () => {
    const frame = useScaledFrame();

    const highlightPulse = Math.sin((frame / fps) * 4) * 0.2 + 0.8;

    const revealProgress = spring({
        frame: frame - 0.8 * fps,
        fps,
        config: SPRING_CONFIG.smooth,
    });

    return (
        <div
            style={{
                width: "95%",
                maxWidth: 780,
                backgroundColor: "#1E1E1E",
                borderRadius: 24,
                overflow: "hidden",
                border: `1px solid ${COLORS.border}`,
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            }}
        >
            {/* Editor header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "18px 24px",
                    backgroundColor: "#2D2D2D",
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#10B981" }} />
                </div>
                <span style={{ fontSize: 18, color: COLORS.textMuted, marginLeft: 20, fontFamily: "monospace" }}>
                    config.ts
                </span>
            </div>

            {/* Code content */}
            <div style={{ padding: 32, fontFamily: "monospace", fontSize: 26, lineHeight: 2 }}>
                <div style={{ color: COLORS.textMuted }}>// App Configuration</div>
                <div style={{ color: "#569CD6" }}>export const</div>
                <div style={{ color: COLORS.textPrimary, marginLeft: 28 }}>config = {"{"}</div>

                {/* Highlighted dangerous line */}
                <div
                    style={{
                        backgroundColor: `rgba(239, 68, 68, ${0.2 * highlightPulse})`,
                        border: `2px solid rgba(239, 68, 68, ${0.5 * highlightPulse})`,
                        borderRadius: 8,
                        padding: "8px 16px",
                        margin: "14px 0",
                        marginLeft: 28,
                        opacity: revealProgress,
                    }}
                >
                    <span style={{ color: "#9CDCFE" }}>API_KEY</span>
                    <span style={{ color: COLORS.textPrimary }}>: </span>
                    <span className="text-[#CE9178]">"sk_live_example_key_for_video_demo"</span>
                </div>

                <div style={{ color: COLORS.textPrimary, marginLeft: 28 }}>{"}"}</div>
            </div>
        </div>
    );
};

// DevTools reveal panel - BIGGER
const DevToolsPanel: React.FC = () => {
    const frame = useScaledFrame();

    const slideIn = spring({
        frame: frame - 2 * fps,
        fps,
        config: SPRING_CONFIG.snappy,
    });

    return (
        <div
            style={{
                position: "absolute",
                right: 60,
                top: "55%",
                width: 420,
                backgroundColor: COLORS.bgCard,
                borderRadius: 20,
                border: `1px solid ${COLORS.border}`,
                overflow: "hidden",
                transform: `translateX(${(1 - slideIn) * 500}px)`,
                opacity: slideIn,
                boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 20px",
                    backgroundColor: COLORS.bgCardHover,
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <span style={{ fontSize: 16, color: COLORS.textMuted }}>🔍 Network / Sources</span>
            </div>

            <div style={{ padding: 20, fontFamily: "monospace", fontSize: 20 }}>
                <div style={{ color: COLORS.primary, marginBottom: 12 }}>▼ bundle.js</div>
                <div style={{ color: COLORS.textMuted, marginLeft: 20 }}>...init(config)</div>
                <div
                    style={{
                        backgroundColor: `${COLORS.warning}25`,
                        color: COLORS.warning,
                        padding: "10px 14px",
                        borderRadius: 8,
                        marginLeft: 20,
                        marginTop: 10,
                        fontSize: 18,
                    }}
                >
                    "sk_live_example_..."
                </div>
            </div>
        </div>
    );
};

export const Scene06LeakedKeys: React.FC = () => {
    return (
        <Background variant="danger">
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 50,
                }}
            >
                <SlideIn direction="top" delay={0.2}>
                    <div style={{ fontSize: 60, fontWeight: 700, color: COLORS.danger, marginBottom: 50 }}>
                        🔑 Leaked API Keys
                    </div>
                </SlideIn>

                <ScaleIn delay={0.4}>
                    <CodeEditor />
                </ScaleIn>

                <DevToolsPanel />

                <SlideIn direction="bottom" delay={2.5}>
                    <div style={{ fontSize: 40, color: COLORS.textSecondary, marginTop: 60, textAlign: "center" }}>
                        Anyone with browser DevTools can see it
                    </div>
                </SlideIn>
            </AbsoluteFill>
        </Background>
    );
};
