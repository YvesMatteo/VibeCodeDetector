import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "../../config";
import { SlideIn, FadeIn, GlowText, ScaleIn, ScoreDashboardAnimation, ActionableButton } from "../animations";

const { fontFamily } = loadFont();

const outputs = [
    { icon: "❌", label: "What's wrong" },
    { icon: "⚠️", label: "Why it's dangerous" },
    { icon: "✅", label: "Exactly how to fix it" },
];

// Scene 9: The Output - Plain English results
export const Scene09Output: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 60,
                fontFamily,
            }}
        >
            <FadeIn delay={0.2}>
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        textAlign: "center",
                        marginBottom: 50,
                    }}
                >
                    Then we tell you, in <GlowText color={COLORS.primary}>plain English</GlowText>:
                </div>
            </FadeIn>

            <div style={{ width: 800, height: 500, marginBottom: 50 }}>
                <SlideIn direction="bottom" delay={0.6}>
                    <ScoreDashboardAnimation />
                </SlideIn>
            </div>

            <FadeIn delay={2}>
                <div
                    style={{
                        backgroundColor: COLORS.surfaceLight,
                        padding: "30px 40px",
                        borderRadius: 20,
                        border: `2px solid ${COLORS.primary}50`,
                        maxWidth: 800,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            fontSize: 28,
                            color: COLORS.textSecondary,
                            textAlign: "center",
                            lineHeight: 1.6,
                        }}
                    >
                        No security jargon. No 50-page PDF.
                        <br />
                        <span style={{ color: COLORS.primary, fontWeight: 600 }}>
                            Just clear, actionable steps
                        </span>{" "}
                        you can paste back into your AI assistant.
                    </div>

                    <ActionableButton />
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};

export default Scene09Output;
