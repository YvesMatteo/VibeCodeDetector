import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS, VIDEO_CONFIG } from "../config";
import { ScaleIn, FadeIn, GlowText } from "../components/animations";
import { GlitchText } from "../components/premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene02Question: React.FC = () => {
    const frame = useCurrentFrame();

    // Dramatic shake effect on "security"
    const shakeActive = frame > fps * 1.5 && frame < fps * 2.5;
    const shake = shakeActive ? Math.sin(frame * 0.8) * 6 : 0;

    // Glitch intensity increases
    const glitchIntensity = interpolate(
        frame,
        [fps * 2, fps * 3],
        [0, 2],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                transform: `translateX(${shake}px)`,
                backgroundColor: COLORS.background,
            }}
        >
            {/* But... */}
            <ScaleIn delay={0.3}>
                <div
                    style={{
                        fontSize: 80,
                        fontWeight: 300,
                        color: COLORS.textSecondary,
                        marginBottom: 40,
                    }}
                >
                    But...
                </div>
            </ScaleIn>

            {/* Main Question */}
            <ScaleIn delay={0.8}>
                <div style={{ textAlign: "center", maxWidth: 900 }}>
                    <div style={{ fontSize: 52, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                        did you check your{" "}
                        <GlowText color={COLORS.danger} pulse>
                            <GlitchText intensity={glitchIntensity}>security</GlitchText>
                        </GlowText>
                        ?
                    </div>
                </div>
            </ScaleIn>

            {/* Secondary Text */}
            <FadeIn delay={2}>
                <div
                    style={{
                        fontSize: 36,
                        color: COLORS.textSecondary,
                        marginTop: 50,
                        textAlign: "center",
                        maxWidth: 800,
                        lineHeight: 1.5,
                    }}
                >
                    Or did you just trust that the AI{" "}
                    <span style={{ fontStyle: "italic", color: COLORS.warning }}>
                        "kinda handled it"
                    </span>
                    ?
                </div>
            </FadeIn>

            {/* Warning Indicator */}
            <FadeIn delay={3}>
                <div
                    style={{
                        marginTop: 60,
                        padding: "16px 32px",
                        background: `${COLORS.danger}15`,
                        border: `2px solid ${COLORS.danger}40`,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                    }}
                >
                    <span style={{ fontSize: 32 }}>⚠️</span>
                    <span style={{ color: COLORS.danger, fontSize: 22, fontWeight: 600 }}>
                        The uncomfortable truth awaits...
                    </span>
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
