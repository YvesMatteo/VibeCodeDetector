import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { VIDEO_CONFIG } from "../../config";
import { useColors } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

// Background Component with animated gradient
export const Background: React.FC<{
    variant?: "default" | "danger" | "success" | "dark";
    children?: React.ReactNode;
}> = ({ variant = "default", children }) => {
    const frame = useCurrentFrame();
    const COLORS = useColors();

    const getGradient = () => {
        const pulse = Math.sin((frame / fps) * 0.5) * 0.02;

        switch (variant) {
            case "danger":
                return `radial-gradient(ellipse at 50% 30%, rgba(239, 68, 68, ${0.15 + pulse}) 0%, ${COLORS.bgDark} 70%)`;
            case "success":
                return `radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, ${0.12 + pulse}) 0%, ${COLORS.bgDark} 70%)`;
            case "dark":
                // In light mode, 'dark' background should just be white/clean
                if (COLORS.bgDark === "#FFFFFF") {
                    return COLORS.bgDark;
                }
                return `radial-gradient(ellipse at 50% 30%, rgba(30, 30, 35, ${0.5 + pulse}) 0%, ${COLORS.bgDark} 70%)`;
            default:
                // Adjust blue opacity for light mode visibility if needed, or keep consistent
                return `radial-gradient(ellipse at 50% 30%, ${COLORS.primary}15 0%, ${COLORS.bgDark} 70%)`;
        }
    };

    return (
        <AbsoluteFill
            style={{
                background: getGradient(),
                overflow: "hidden",
            }}
        >
            {/* Subtle grid overlay - lighter for light mode? */}
            <div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backgroundImage: `
                        linear-gradient(${COLORS.border} 1px, transparent 1px),
                        linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                    opacity: 0.5,
                }}
            />
            {children}
        </AbsoluteFill>
    );
};

// Logo Component
export const Logo: React.FC<{
    size?: number;
    glow?: boolean;
}> = ({ size = 200, glow = true }) => {
    const frame = useCurrentFrame();
    const COLORS = useColors();
    const glowIntensity = glow ? Math.sin((frame / fps) * 2) * 0.2 + 1 : 1;

    return (
        <div
            style={{
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <img
                src={`/CV_Logo.png`} // Fixed path to root public default
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: glow
                        ? `drop-shadow(0 0 ${30 * glowIntensity}px ${COLORS.primaryGlow})`
                        : "none",
                }}
            />
        </div>
    );
};
