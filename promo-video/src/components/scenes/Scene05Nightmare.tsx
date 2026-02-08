import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "../../config";
import { SlideIn, FadeIn, GlowText, TypewriterText, SocialMediaAnimation } from "../animations";

const { fontFamily } = loadFont();

// Scene 5: The Nightmare - Launch gone wrong scenario
export const Scene05Nightmare: React.FC = () => {
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
                        marginBottom: 40,
                    }}
                >
                    Now imagine this:
                </div>
            </FadeIn>

            <SlideIn direction="bottom" delay={0.6}>
                <div style={{ width: 800, height: 400, transform: 'scale(1)' }}>
                    <SocialMediaAnimation
                        type="success"
                        username="You"
                        handle="@vibecoder"
                        content="Just launched my new app! Users are pouring in like crazy! 📈🔥 #buildinpublic"
                        showDm={true}
                    />
                </div>
            </SlideIn>

        </AbsoluteFill>
    );
};

export default Scene05Nightmare;
