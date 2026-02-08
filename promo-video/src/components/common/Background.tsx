import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../../config";

// Animated gradient background with subtle particle effect
export const Background: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Subtle gradient shift
    const gradientAngle = interpolate(frame, [0, fps * 60], [135, 180]);

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(${gradientAngle}deg, ${COLORS.background} 0%, ${COLORS.backgroundLight} 50%, ${COLORS.background} 100%)`,
            }}
        >
            {/* Subtle grid pattern overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
                    backgroundSize: "50px 50px",
                }}
            />
            {/* Glow orbs */}
            <GlowOrb x={200} y={400} color={COLORS.primary} size={400} />
            <GlowOrb x={800} y={1400} color={COLORS.danger} size={300} />
        </AbsoluteFill>
    );
};

// Floating glow orb
const GlowOrb: React.FC<{
    x: number;
    y: number;
    color: string;
    size: number;
}> = ({ x, y, color, size }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const offsetY = Math.sin((frame / fps) * 0.5) * 30;
    const opacity = interpolate(
        Math.sin((frame / fps) * 0.3),
        [-1, 1],
        [0.1, 0.2]
    );

    return (
        <div
            style={{
                position: "absolute",
                left: x - size / 2,
                top: y - size / 2 + offsetY,
                width: size,
                height: size,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                opacity,
                filter: `blur(${size / 4}px)`,
            }}
        />
    );
};

export default Background;
