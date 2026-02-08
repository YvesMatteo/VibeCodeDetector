import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { FadeIn, ScaleIn, GlowText } from "../animations";
import { RemediationAnimation } from "../animations/RemediationAnimation";
import { Logo } from "../common";

const { fontFamily } = loadFont();

// Scene 7: Solution Introduction - "Meet CheckVibe"
export const Scene07Solution: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: SPRING_CONFIG.smooth,
    });

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
                        color: COLORS.success,
                        textAlign: "center",
                        marginBottom: 50,
                        fontWeight: 500,
                    }}
                >
                    It doesn't have to be like that.
                </div>
            </FadeIn>

            <ScaleIn delay={1}>
                <div
                    style={{
                        fontSize: 48,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        marginBottom: 40,
                    }}
                >
                    Meet
                </div>
            </ScaleIn>

            <ScaleIn delay={2}>
                <div style={{ width: 600, height: 400, marginTop: 40 }}>
                    <RemediationAnimation />
                </div>
            </ScaleIn>

            <ScaleIn delay={2.5}>
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        textAlign: "center",
                        marginTop: 30,
                    }}
                >
                    <GlowText color={COLORS.primary}>CheckVibe</GlowText>
                </div>
            </ScaleIn>

            <FadeIn delay={3}>
                <div
                    style={{
                        fontSize: 32,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        marginTop: 40,
                        lineHeight: 1.5,
                        maxWidth: 800,
                    }}
                >
                    Built for vibecoded startups — for founders shipping fast with Replit, Lovable, Cursor, and AI pair programmers.
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};

export default Scene07Solution;
