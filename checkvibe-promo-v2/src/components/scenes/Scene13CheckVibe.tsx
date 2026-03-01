import React from "react";
import { AbsoluteFill, spring, Img, staticFile } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, FadeIn, GlowText } from "../animations";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

// Shield protection animation - BIGGER
const ShieldAnimation: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const scale = spring({
        frame: frame - 0.3 * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    const pulse = Math.sin((frame / fps) * 2) * 0.05 + 1;

    // Shield glow rings - BIGGER - SLOWER (90fps cycle instead of 30)
    const rings = [0, 1, 2].map((i) => {
        const ringScale = 1 + (frame / 90 + i * 0.3) % 1;
        const ringOpacity = 1 - ((frame / 90 + i * 0.3) % 1);

        return (
            <div
                key={i}
                style={{
                    position: "absolute",
                    width: 380,
                    height: 380,
                    borderRadius: "50%",
                    border: `3px solid ${COLORS.primary}`,
                    opacity: ringOpacity * 0.4,
                    transform: `scale(${ringScale})`,
                }}
            />
        );
    });

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${scale * pulse})`,
            }}
        >
            {rings}
            <Img
                src={staticFile("CV_Logo.png")}
                style={{
                    width: 300,
                    height: 300,
                    objectFit: "contain",
                    filter: `drop-shadow(0 0 60px ${COLORS.primaryGlow})`,
                }}
            />
        </div>
    );
};

export const Scene13CheckVibe: React.FC = () => {
    const COLORS = useColors();
    return (
        <Background>
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                    gap: 50,
                }}
            >
                <SlideIn direction="top" delay={0.2}>
                    <div style={{ fontSize: 48, fontWeight: 500, color: COLORS.textSecondary }}>
                        Introducing
                    </div>
                </SlideIn>

                <ShieldAnimation />

                <SlideIn direction="bottom" delay={0.8}>
                    <div style={{ fontSize: 86, fontWeight: 800, color: COLORS.textPrimary }}>
                        <GlowText color={COLORS.primary}>CheckVibe</GlowText>
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={1.2}>
                    <div style={{ fontSize: 42, fontWeight: 500, color: COLORS.textSecondary, textAlign: "center" }}>
                        Security scanning built for
                    </div>
                </SlideIn>

                <FadeIn delay={1.6}>
                    <div
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: COLORS.primary,
                            padding: "20px 48px",
                            backgroundColor: `${COLORS.primary}15`,
                            borderRadius: 20,
                            border: `2px solid ${COLORS.primary}30`,
                        }}
                    >
                        vibecoded startups
                    </div>
                </FadeIn>
            </AbsoluteFill>
        </Background>
    );
};
