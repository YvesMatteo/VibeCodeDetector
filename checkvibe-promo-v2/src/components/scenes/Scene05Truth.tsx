import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, COLORS, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, GlowText } from "../animations";
import { Background } from "../common";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Warning card component - BIGGER
const WarningCard: React.FC<{
    icon: React.ReactNode;
    text: string;
    delay: number;
}> = ({ icon, text, delay }) => {
    const frame = useScaledFrame();

    const scale = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.snappy,
    });

    const pulse = Math.sin((frame + delay * 60) / 15) * 0.03 + 1;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "24px 48px",
                backgroundColor: `${COLORS.danger}15`,
                borderRadius: 20,
                border: `1px solid ${COLORS.danger}40`,
                transform: `scale(${scale * pulse})`,
                opacity: scale,
            }}
        >
            <span style={{ fontSize: 50 }}>{icon}</span>
            <span style={{ fontSize: 36, fontWeight: 600, color: COLORS.textPrimary }}>
                {text}
            </span>
        </div>
    );
};

// Glitching Padlock component - BIGGER
const GlitchingPadlock: React.FC = () => {
    const frame = useScaledFrame();

    // Padlock appears after 1.7s = 50 frames, shows GREEN for ~1.5s, then breaks at 3.5s = 105 frames
    const appearFrame = 50;
    const breakFrame = 105;
    const isBroken = frame > breakFrame;

    // Initial fade in (appears earlier and fades in faster)
    const fadeIn = interpolate(frame, [appearFrame, appearFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Glitch shake when breaking
    const glitchX = isBroken
        ? interpolate(frame - breakFrame, [0, 3, 6, 9, 12, 15], [0, -8, 8, -8, 8, 0], { extrapolateRight: "clamp" })
        : 0;

    // Glitch blur
    const glitchBlur = isBroken
        ? interpolate(frame - breakFrame, [0, 5, 15], [0, 3, 0], { extrapolateRight: "clamp" })
        : 0;

    // Red overlay flash
    const redFlash = isBroken
        ? interpolate(frame - breakFrame, [0, 3, 6, 9, 12], [0, 1, 0, 1, 0], { extrapolateRight: "clamp" })
        : 0;

    // Scanline position
    const scanlineTop = isBroken
        ? interpolate(frame - breakFrame, [0, 6], [0, 100], { extrapolateRight: "clamp" })
        : 0;

    // "SECURITY COMPROMISED" text - appears after break
    const textOpacity = interpolate(frame, [breakFrame + 10, breakFrame + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const textY = interpolate(frame, [breakFrame + 10, breakFrame + 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60 }}>
            <div style={{ position: "relative", opacity: fadeIn }}>
                {/* Padlock icon - BIGGER */}
                <div
                    style={{
                        transform: `translateX(${glitchX}px)`,
                        filter: `blur(${glitchBlur}px)`,
                    }}
                >
                    {isBroken ? (
                        // Open lock (broken)
                        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                    ) : (
                        // Closed lock - GREEN (secure)
                        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    )}
                </div>

                {/* Red glitch overlay */}
                {isBroken && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                            mixBlendMode: "overlay",
                            opacity: redFlash,
                        }}
                    />
                )}

                {/* Scanline effect */}
                {isBroken && (
                    <div
                        style={{
                            position: "absolute",
                            top: `${scanlineTop}%`,
                            left: 0,
                            width: "100%",
                            height: 3,
                            backgroundColor: "white",
                            opacity: 0.5,
                        }}
                    />
                )}
            </div>

            {/* SECURITY COMPROMISED text - BIGGER */}
            <div
                style={{
                    marginTop: 36,
                    color: "#ef4444",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    fontSize: 32,
                    opacity: textOpacity,
                    transform: `translateY(${textY}px)`,
                }}
            >
                SECURITY COMPROMISED
            </div>
        </div>
    );
};

export const Scene05Truth: React.FC = () => {
    return (
        <Background variant="danger">
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    gap: 30,
                }}
            >
                <SlideIn direction="bottom" delay={0.2}>
                    <div style={{ fontSize: 52, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 16 }}>
                        Because here's the
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={0.5}>
                    <div style={{ fontSize: 72, fontWeight: 700, color: COLORS.danger, marginBottom: 40 }}>
                        uncomfortable truth:
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={1}>
                    <div style={{ textAlign: "center", marginBottom: 30 }}>
                        <div style={{ fontSize: 60, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                            Most <GlowText color={COLORS.danger}>vibecoded apps</GlowText>
                        </div>
                        <div style={{ fontSize: 60, fontWeight: 700, color: COLORS.textPrimary, marginTop: 16 }}>
                            ship with dangerous mistakes
                        </div>
                    </div>
                </SlideIn>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
                    <WarningCard icon={<Emoji symbol="🔑" label="key" />} text="Exposed API keys" delay={1.8} />
                    <WarningCard icon={<Emoji symbol="🗄️" label="cabinet" />} text="Open databases" delay={2.1} />
                    <WarningCard icon={<Emoji symbol="🚪" label="door" />} text="Unprotected routes" delay={2.4} />
                </div>

                {/* Glitching Padlock Animation at bottom */}
                <GlitchingPadlock />
            </AbsoluteFill>
        </Background>
    );
};
