import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG } from "../../config";

// Animated CheckVibe Logo with glow effect
export const Logo: React.FC<{
    size?: number;
    showGlow?: boolean;
    delay?: number;
}> = ({ size = 200, showGlow = true, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    const glowIntensity = interpolate(
        Math.sin((frame / fps) * Math.PI * 2),
        [-1, 1],
        [20, 40]
    );

    return (
        <div
            style={{
                transform: `scale(${entrance})`,
                opacity: entrance,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: size,
                    height: size,
                }}
            >
                {showGlow && (
                    <div
                        style={{
                            position: "absolute",
                            inset: -20,
                            background: `radial-gradient(circle, ${COLORS.primaryGlow} 0%, transparent 70%)`,
                            filter: `blur(${glowIntensity}px)`,
                            opacity: 0.8,
                        }}
                    />
                )}
                <Img
                    src={staticFile("logo.png")}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        position: "relative",
                        zIndex: 1,
                    }}
                />
            </div>
        </div>
    );
};

export default Logo;
