import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { useScaledFrame } from "../../config";
import { SlideIn, FadeIn } from "../animations";
import { useColors } from "../../ThemeContext";
import { Emoji } from "../common/Emoji";

export const Scene12Relief: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Color transition from red to blue
    const colorProgress = interpolate(frame, [0, 60], [0, 1], {
        extrapolateRight: "clamp",
    });

    const bgColor = `rgba(${interpolate(colorProgress, [0, 1], [239, 55])}, ${interpolate(colorProgress, [0, 1], [68, 168])}, ${interpolate(colorProgress, [0, 1], [68, 255])}, 0.1)`;

    return (
        <AbsoluteFill
            style={{
                background: `radial-gradient(ellipse at 50% 50%, ${bgColor} 0%, ${COLORS.bgDark} 70%)`,
            }}
        >
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
                <FadeIn delay={0.3}>
                    <div style={{ fontSize: 100, marginBottom: 20 }}>
                        <Emoji symbol="😮‍💨" label="sigh" />
                    </div>
                </FadeIn>

                <SlideIn direction="bottom" delay={0.5}>
                    <div style={{ fontSize: 48, fontWeight: 600, color: COLORS.textPrimary, textAlign: "center" }}>
                        But it doesn't have
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={0.9}>
                    <div style={{ fontSize: 56, fontWeight: 700, color: COLORS.primary, textAlign: "center" }}>
                        to be like that
                    </div>
                </SlideIn>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
