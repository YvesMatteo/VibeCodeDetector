import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { SlideIn, FadeIn, GlowText, ScaleIn, SocialMediaAnimation, RapidCounter } from "../animations";

const { fontFamily } = loadFont();

// Scene 4: Real Story - Moltbook example
export const Scene04RealStory: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

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
                        marginBottom: 30,
                    }}
                >
                    This isn't theoretical.
                </div>
            </FadeIn>

            <SlideIn direction="bottom" delay={0.8}>
                <div style={{ width: 800, height: 600, transform: 'scale(0.8)' }}>
                    <SocialMediaAnimation
                        type="disaster"
                        username="Moltbook App"
                        handle="@moltbook_official"
                        content={<>We are thrilled to announce our Series A raise of $15M! 🚀<br /><br />Join the future of Molting. #growth #startup</>}
                    />
                </div>
            </SlideIn>

            <ScaleIn delay={2}>
                <div
                    style={{
                        marginTop: 50,
                        display: "flex",
                        gap: 40,
                        flexWrap: "wrap",
                        justifyContent: "center",
                    }}
                >
                    <StatBadge
                        value={<RapidCounter value={150000} />}
                        label="API Keys Exposed"
                        color={COLORS.danger}
                        suffix="+"
                    />
                    <StatBadge
                        value="∞"
                        label="User Data at Risk"
                        color={COLORS.warning}
                    />
                </div>
            </ScaleIn>

            <FadeIn delay={3.5}>
                <div
                    style={{
                        marginTop: 50,
                        fontSize: 28,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        fontStyle: "italic",
                    }}
                >
                    Cases like this are not rare edge-cases — there are thousands.
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};

const StatBadge: React.FC<{ value: React.ReactNode; label: string; color: string; suffix?: string }> = ({
    value,
    label,
    color,
    suffix = ""
}) => (
    <div
        style={{
            backgroundColor: `${color}20`,
            border: `2px solid ${color}`,
            borderRadius: 16,
            padding: "20px 32px",
            textAlign: "center",
            minWidth: 300
        }}
    >
        <div style={{ fontSize: 48, fontWeight: 800, color, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {value}{suffix}
        </div>
        <div style={{ fontSize: 22, color: COLORS.textSecondary, marginTop: 8 }}>
            {label}
        </div>
    </div>
);

export default Scene04RealStory;
