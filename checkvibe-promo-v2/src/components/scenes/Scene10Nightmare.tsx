import React from "react";
import { AbsoluteFill, spring } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, Shake } from "../animations";
import { Background } from "../common";

import { useColors } from "../../ThemeContext";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Chat bubble component - BIGGER
const ChatBubble: React.FC<{
    text: string | React.ReactNode;
    isEvil?: boolean;
    delay: number;
}> = ({ text, isEvil = false, delay }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const scale = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    return (
        <div
            style={{
                maxWidth: 500,
                padding: "24px 34px",
                backgroundColor: isEvil ? COLORS.danger : COLORS.bgCard,
                borderRadius: 24,
                borderBottomLeftRadius: isEvil ? 24 : 4,
                borderBottomRightRadius: isEvil ? 4 : 24,
                alignSelf: isEvil ? "flex-end" : "flex-start",
                transform: `scale(${scale})`,
                opacity: scale,
                boxShadow: isEvil
                    ? `0 12px 50px ${COLORS.dangerGlow}`
                    : "0 12px 50px rgba(0,0,0,0.3)",
            }}
        >
            <div
                style={{
                    fontSize: 28,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                    lineHeight: 1.5,
                }}
            >
                {text}
            </div>
        </div>
    );
};

// Tweet mockup - BIGGER
const TweetMock: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const scale = spring({
        frame: frame - 0.3 * fps,
        fps,
        config: SPRING_CONFIG.smooth,
    });

    return (
        <div
            style={{
                width: "92%",
                maxWidth: 550,
                padding: 30,
                backgroundColor: COLORS.bgCard,
                borderRadius: 20,
                border: `1px solid ${COLORS.border}`,
                transform: `scale(${scale})`,
                opacity: scale,
            }}
        >
            <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                <div
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        backgroundColor: COLORS.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 32,
                    }}
                >

                    <Emoji symbol="🚀" label="rocket" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: 22 }}>You</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 18 }}>@founder</div>
                </div>
            </div>
            <div style={{ fontSize: 26, color: COLORS.textPrimary, lineHeight: 1.6 }}>
                Just launched my app! <Emoji symbol="🎉" label="tada" /><br />
                Built it in a weekend with AI.<br />
                Check it out! <Emoji symbol="👇" label="point_down" />
            </div>
        </div>
    );
};

export const Scene10Nightmare: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Screen shake when DM arrives - continues till end of scene
    const shakeActive = frame > 3.5 * fps;

    return (
        <Background variant="danger">
            <Shake intensity={shakeActive ? 6 : 0} active={shakeActive}>
                <AbsoluteFill
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        padding: 50,
                        paddingTop: 80,
                        gap: 28,
                    }}
                >
                    <SlideIn direction="top" delay={0.1}>
                        <div style={{ fontSize: 42, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 16 }}>
                            The nightmare scenario:
                        </div>
                    </SlideIn>

                    <TweetMock />

                    <SlideIn direction="bottom" delay={1.5}>
                        <div style={{ fontSize: 32, color: COLORS.textMuted, marginTop: 16, marginBottom: 8 }}>
                            Then someone DMs you...
                        </div>
                    </SlideIn>

                    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", paddingLeft: 50, paddingRight: 50 }}>
                        <ChatBubble
                            text="Hey, just checked out your app..."
                            isEvil
                            delay={2.5}
                        />
                        <ChatBubble
                            text={<>I can see all your users' data <Emoji symbol="👀" label="eyes" /></>}
                            isEvil
                            delay={3.5}
                        />
                        <ChatBubble
                            text="Including their passwords and API keys"
                            isEvil
                            delay={4.5}
                        />
                    </div>
                </AbsoluteFill>
            </Shake>
        </Background>
    );
};
