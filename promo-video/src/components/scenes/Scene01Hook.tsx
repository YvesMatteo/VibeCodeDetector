import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "../../config";
import { SlideIn, TypewriterText, GlowText, PlatformLogos } from "../animations";
import { VibeCodingAnimation } from "../animations/VibeCodingAnimation";

const { fontFamily } = loadFont();

// Scene 1: Hook - "You just vibecoded your app..."
export const Scene01Hook: React.FC = () => {
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
                backgroundColor: '#09090b',
            }}
        >
            <div className="absolute inset-0 z-0 opacity-40">
                <VibeCodingAnimation />
            </div>

            <div className="z-10 relative flex flex-col items-center">
                <SlideIn direction="bottom" delay={0.3}>
                    <div
                        style={{
                            fontSize: 52,
                            fontWeight: 600,
                            color: COLORS.textPrimary,
                            textAlign: "center",
                            lineHeight: 1.4,
                            marginBottom: 40,
                            textShadow: '0 4px 30px rgba(0,0,0,0.8)'
                        }}
                    >
                        You just <GlowText color={COLORS.primary}>vibecoded</GlowText> your app
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={0.8}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 20
                        }}
                    >
                        <div
                            style={{
                                fontSize: 42,
                                color: COLORS.textSecondary,
                                textAlign: "center",
                                lineHeight: 1.5,
                                textShadow: '0 2px 20px rgba(0,0,0,0.8)'
                            }}
                        >
                            in Replit, Lovable, or Cursor.
                        </div>
                        <PlatformLogos />
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={1.5}>
                    <div
                        style={{
                            fontSize: 42,
                            color: COLORS.textSecondary,
                            textAlign: "center",
                            lineHeight: 1.5,
                            marginTop: 60,
                            textShadow: '0 2px 20px rgba(0,0,0,0.8)'
                        }}
                    >
                        It works. It looks good.
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={2.2}>
                    <div
                        style={{
                            fontSize: 52,
                            fontWeight: 700,
                            color: COLORS.success,
                            textAlign: "center",
                            marginTop: 40,
                            textShadow: '0 4px 30px rgba(0,0,0,0.8)'
                        }}
                    >
                        You're ready to ship.
                    </div>
                </SlideIn>
            </div>
        </AbsoluteFill>
    );
};

export default Scene01Hook;
