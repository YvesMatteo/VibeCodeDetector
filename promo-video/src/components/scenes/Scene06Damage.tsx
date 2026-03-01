import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../../config";
import { SlideIn, FadeIn } from "../animations";
import { ConsequenceIcon } from "../premium";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

export const Scene06Damage: React.FC = () => {
    const frame = useCurrentFrame();

    const consequences = [
        { emoji: "💔", label: "Brand? Damaged.", delay: 0.8 },
        { emoji: "📉", label: "Users' trust? Gone.", delay: 1.4 },
        { emoji: "💀", label: "Startup? Maybe over.", delay: 2 },
        { emoji: "💸", label: "Credit Card? Drained.", delay: 2.6 },
    ];

    return (
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
            {/* Title */}
            <SlideIn direction="bottom" delay={0.2}>
                <div
                    style={{
                        fontSize: 42,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        textAlign: "center",
                    }}
                >
                    The fallout is <span style={{ color: COLORS.danger }}>devastating</span>
                </div>
            </SlideIn>

            {/* Consequences Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 50,
                    marginTop: 20,
                }}
            >
                {consequences.map((item, index) => (
                    <ConsequenceIcon
                        key={index}
                        emoji={item.emoji}
                        label={item.label}
                        delay={item.delay}
                    />
                ))}
            </div>

            {/* Bottom Statement */}
            <FadeIn delay={3.5}>
                <div
                    style={{
                        marginTop: 40,
                        padding: "24px 40px",
                        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))",
                        border: `2px solid ${COLORS.danger}30`,
                        borderRadius: 20,
                        maxWidth: 600,
                        textAlign: "center",
                    }}
                >
                    <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                        All because of{" "}
                        <span style={{ color: COLORS.danger }}>one missed vulnerability</span>
                    </div>
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
