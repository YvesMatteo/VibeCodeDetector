import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { SlideIn, FadeIn, GlowText, ScaleIn, PulseGlow, SecurityShieldAnimation } from "../animations";
import { Logo } from "../common";

const { fontFamily } = loadFont();

// Scene 10: Call to Action
export const Scene10CTA: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pulse = interpolate(
        Math.sin((frame / fps) * Math.PI * 2),
        [-1, 1],
        [0.95, 1.05]
    );

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
                        fontSize: 36,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        lineHeight: 1.6,
                        marginBottom: 40,
                    }}
                >
                    You vibecoded your app in a weekend.
                    <br />
                    <span style={{ color: COLORS.danger }}>
                        Attackers can vibehack it just as fast.
                    </span>
                </div>
            </FadeIn>

            <ScaleIn delay={1}>
                {/* <Logo size={180} showGlow={true} delay={0} /> */}
                <div style={{ width: 400, height: 400 }}>
                    <SecurityShieldAnimation />
                </div>
            </ScaleIn>

            <SlideIn direction="bottom" delay={1.8}>
                <div
                    style={{
                        fontSize: 44,
                        fontWeight: 700,
                        textAlign: "center",
                        marginTop: 20,
                        marginBottom: 50,
                    }}
                >
                    <GlowText color={COLORS.primary} pulse>
                        Before you ship, run a CheckVibe scan.
                    </GlowText>
                </div>
            </SlideIn>

            <ScaleIn delay={2.5}>
                <div
                    style={{
                        transform: `scale(${pulse})`,
                        backgroundColor: COLORS.primary,
                        padding: "24px 60px",
                        borderRadius: 16,
                        boxShadow: `0 0 30px ${COLORS.primaryGlow}, 0 0 60px ${COLORS.primaryGlow}`,
                    }}
                >
                    <div
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color: "#000",
                        }}
                    >
                        checkvibe.online
                    </div>
                </div>
            </ScaleIn>

            <FadeIn delay={3.5}>
                <div
                    style={{
                        marginTop: 60,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        alignItems: "center",
                    }}
                >
                    <div style={{ fontSize: 28, color: COLORS.textSecondary }}>
                        Protect your users.
                    </div>
                    <div style={{ fontSize: 28, color: COLORS.textSecondary }}>
                        Protect your idea.
                    </div>
                    <div style={{ fontSize: 28, color: COLORS.textSecondary }}>
                        Protect your money.
                    </div>
                </div>
            </FadeIn>

            <FadeIn delay={5}>
                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: COLORS.success,
                        textAlign: "center",
                        marginTop: 50,
                    }}
                >
                    Don't get hacked for your vibecoded startup.
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};

export default Scene10CTA;
