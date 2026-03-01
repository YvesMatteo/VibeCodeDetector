import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../../config";

// Simple static gradient background
export const Background: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${COLORS.background} 0%, ${COLORS.backgroundLight} 50%, ${COLORS.background} 100%)`,
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
            {/* Static glow orbs */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 200,
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${COLORS.primary}20 0%, transparent 70%)`,
                    filter: "blur(100px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: 0,
                    bottom: 400,
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${COLORS.danger}15 0%, transparent 70%)`,
                    filter: "blur(80px)",
                }}
            />
        </AbsoluteFill>
    );
};

export default Background;
