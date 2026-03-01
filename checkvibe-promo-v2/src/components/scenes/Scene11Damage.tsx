import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, FadeIn, Shake, GlowText } from "../animations";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;
const SCENE_DURATION = 10 * fps;

// User icon SVG component
const UserIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

// Users icon SVG component
const UsersIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

// Animated counter from 15420 to 0 - BIGGER
const AnimatedCounter: React.FC = () => {
    const frame = useScaledFrame();

    const countValue = Math.max(0, Math.round(
        interpolate(frame, [0, SCENE_DURATION - 30], [15420, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        })
    ));

    const flickerOpacity = frame > 30
        ? interpolate(Math.sin(frame * 0.5), [-1, 1], [0.7, 1])
        : 1;

    return (
        <div
            style={{
                fontFamily: "monospace",
                fontSize: 80,
                fontWeight: 700,
                color: countValue < 5000 ? "#ef4444" : countValue < 10000 ? "#f97316" : "#22c55e",
                opacity: flickerOpacity,
                textShadow: countValue < 5000 ? "0 0 30px rgba(239, 68, 68, 0.5)" : "none",
            }}
        >
            {countValue.toLocaleString()}
        </div>
    );
};

// Disappearing user component - BIGGER
const DisappearingUser: React.FC<{ index: number }> = ({ index }) => {
    const frame = useScaledFrame();
    const delay = index * 0.6 * fps;

    const progress = interpolate(frame - delay, [0, 1.5 * fps], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const opacity = 1 - progress;
    const y = progress * 60;
    const scale = 1 - progress * 0.5;
    const x = (Math.random() - 0.5) * 100 * progress;

    return (
        <div
            style={{
                width: 56,
                height: 56,
                backgroundColor: opacity > 0.3 ? "#22c55e" : "#52525b",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                opacity,
                transform: `translateY(${y}px) translateX(${x}px) scale(${scale})`,
                filter: `grayscale(${progress * 100}%)`,
            }}
        >
            <UserIcon size={28} />
        </div>
    );
};

// Damage card components - BIGGER
const DamageCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    delay: number;
}> = ({ icon, title, subtitle, delay }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const scale = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.impact,
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
                padding: 36,
                backgroundColor: `${COLORS.danger}15`,
                borderRadius: 24,
                border: `2px solid ${COLORS.danger}50`,
                transform: `scale(${scale})`,
                opacity: scale,
                width: "100%",
                maxWidth: 450,
                boxShadow: `0 24px 70px ${COLORS.dangerGlow}`,
            }}
        >
            <div style={{ fontSize: 72 }}>{icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.danger, textAlign: "center" }}>
                {title}
            </div>
            <div style={{ fontSize: 22, color: COLORS.textSecondary, textAlign: "center" }}>
                {subtitle}
            </div>
        </div>
    );
};

export const Scene11Damage: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Increasing shake as scene progresses
    const shakeIntensity = interpolate(frame, [0, 6 * fps], [0, 8], {
        extrapolateRight: "clamp",
    });

    // Original damage cards with original delays
    const damageCards = [
        { icon: <Emoji symbol="💔" label="broken_heart" />, title: "Brand Damaged", subtitle: "Trust takes years to build", delay: 0.3 },
        { icon: <Emoji symbol="👋" label="wave" />, title: "Users Gone", subtitle: "They won't come back", delay: 2 },
        { icon: <Emoji symbol="💸" label="money_wings" />, title: "Runway Drained", subtitle: "Legal fees, refunds, fixes", delay: 4 },
        { icon: <Emoji symbol="💳" label="credit_card" />, title: "Card Declined", subtitle: "Cloud bills through the roof", delay: 6 },
    ];

    const users = Array.from({ length: 8 });

    return (
        <Background variant="danger">
            <Shake intensity={shakeIntensity} active={shakeIntensity > 1}>
                <AbsoluteFill
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        padding: 40,
                        paddingTop: 60,
                        gap: 28,
                    }}
                >
                    <SlideIn direction="top" delay={0.1}>
                        <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.danger, marginBottom: 16 }}>
                            The consequences:
                        </div>
                    </SlideIn>

                    {/* Original 2x2 Damage Cards Grid - BIGGER */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 24,
                            width: "100%",
                            maxWidth: 950,
                        }}
                    >
                        {damageCards.map((card, i) => (
                            <DamageCard key={i} {...card} />
                        ))}
                    </div>

                    {/* Users Trust Gone Animation - Counter centered below cards */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 18,
                            marginTop: 16,
                        }}
                    >
                        {/* User Counter */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                fontFamily: "monospace",
                            }}
                        >
                            <UsersIcon size={36} />
                            <span style={{ color: COLORS.textSecondary, fontSize: 26 }}>Users:</span>
                            <AnimatedCounter />
                        </div>

                        {/* Disappearing Users */}
                        <div style={{ display: "flex", gap: 14 }}>
                            {users.map((_, i) => (
                                <DisappearingUser key={i} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Final text - appears at delay 8 like before */}
                    <FadeIn delay={8}>
                        <div
                            style={{
                                fontSize: 42,
                                fontWeight: 700,
                                color: COLORS.textPrimary,
                                marginTop: 24,
                                textAlign: "center",
                            }}
                        >
                            All because of{" "}
                            <GlowText color={COLORS.danger}>one vulnerability</GlowText>
                        </div>
                    </FadeIn>
                </AbsoluteFill>
            </Shake>
        </Background>
    );
};
