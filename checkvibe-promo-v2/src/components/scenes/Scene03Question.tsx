import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { VIDEO_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, FadeIn, GlowText } from "../animations";
import { Background } from "../common";
import { useColors, useTheme } from "../../ThemeContext";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Glitching padlock animation
const GlitchingPadlock: React.FC = () => {
    const frame = useScaledFrame();

    const glitchPhase = Math.sin((frame / fps) * 8);
    const isGlitching = glitchPhase > 0.5;

    const offsetX = isGlitching ? (Math.random() - 0.5) * 10 : 0;
    const offsetY = isGlitching ? (Math.random() - 0.5) * 10 : 0;

    return (
        <div
            style={{
                fontSize: 150,
                transform: `translate(${offsetX}px, ${offsetY}px)`,
                filter: isGlitching ? `hue-rotate(${Math.random() * 360}deg)` : "none",
            }}
        >
            <Emoji symbol="🔓" label="unlock" size={150} />
        </div>
    );
};

export const Scene03Question: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();
    const { theme } = useTheme();

    // Darkness overlay animation
    const darkness = interpolate(frame, [0, 60, 90], [0, 0, 0.4], {
        extrapolateRight: "clamp",
    });

    return (
        <Background variant="dark">
            {/* Dark overlay that fades in - only in dark mode */}
            {theme === "dark" && (
                <AbsoluteFill
                    style={{
                        backgroundColor: `rgba(0, 0, 0, ${darkness})`,
                    }}
                />
            )}

            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                    gap: 60,
                }}
            >
                <FadeIn delay={0.3}>
                    <GlitchingPadlock />
                </FadeIn>

                <SlideIn direction="bottom" delay={0.8}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 64, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                            But wait...
                        </div>
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={1.3}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 58, fontWeight: 500, color: COLORS.danger, lineHeight: 1.4 }}>
                            Did you check your{" "}
                            <GlowText color={COLORS.danger}>security</GlowText>?
                        </div>
                    </div>
                </SlideIn>
            </AbsoluteFill>
        </Background>
    );
};
