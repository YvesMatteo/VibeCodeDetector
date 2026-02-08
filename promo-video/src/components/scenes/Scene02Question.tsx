import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { ScaleIn, GlowText, SecurityConfidenceAnimation } from "../animations";

const { fontFamily } = loadFont();

// Scene 2: The Question - Dramatic pause with security question
export const Scene02Question: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const shake = frame > fps * 1.5 && frame < fps * 2
        ? Math.sin(frame * 0.5) * 3
        : 0;

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 60,
                fontFamily,
                transform: `translateX(${shake}px)`,
            }}
        >
            <ScaleIn delay={0.2}>
                <div style={{ width: 600, height: 600, marginBottom: 40 }}>
                    <SecurityConfidenceAnimation />
                </div>
            </ScaleIn>

            <ScaleIn delay={2}>
                <div
                    style={{
                        fontSize: 56,
                        fontWeight: 700,
                        textAlign: "center",
                        lineHeight: 1.4,
                        position: 'absolute',
                        bottom: 100,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: '20px 40px',
                        borderRadius: 20,
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${COLORS.danger}50`
                    }}
                >
                    But did you check your{" "}
                    <GlowText color={COLORS.danger} pulse>
                        security
                    </GlowText>
                    ?
                </div>
            </ScaleIn>
        </AbsoluteFill>
    );
};

export default Scene02Question;
