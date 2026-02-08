import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { SlideIn, FadeIn, GlowText, VulnerabilityVisuals } from "../animations";

const { fontFamily } = loadFont();

const mistakes = [
    { icon: "🔑", text: "API keys leaked in the frontend" },
    { icon: "🗄️", text: "Databases left wide open" },
    { icon: "🚫", text: '"Temporary" debug routes with zero auth' },
];

// Scene 3: The Problem - Common mistakes list
export const Scene03Problem: React.FC = () => {
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
            <SlideIn direction="top" delay={0.2}>
                <div
                    style={{
                        fontSize: 36,
                        color: COLORS.textSecondary,
                        textAlign: "center",
                        marginBottom: 20,
                    }}
                >
                    Because here's the uncomfortable truth:
                </div>
            </SlideIn>

            <FadeIn delay={0.8}>
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        textAlign: "center",
                        marginBottom: 60,
                    }}
                >
                    Most vibecoded apps ship with the same{" "}
                    <GlowText color={COLORS.danger}>dangerous mistakes</GlowText>:
                </div>
            </FadeIn>

            <div style={{ display: "flex", flexDirection: "column", gap: 30, width: '100%', maxWidth: 800 }}>
                {mistakes.map((mistake, index) => (
                    <SlideIn key={index} direction="right" delay={1.5 + index * 0.5}>
                        <div className="flex items-center gap-6 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
                            <VulnerabilityVisuals index={index} />
                            <div className="text-3xl text-zinc-300 font-medium">
                                {mistake.text}
                            </div>
                        </div>
                    </SlideIn>
                ))}
            </div>
        </AbsoluteFill>
    );
};

export default Scene03Problem;
