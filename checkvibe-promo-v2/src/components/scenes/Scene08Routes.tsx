import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, COLORS, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn, FadeIn, ScaleIn } from "../animations";
import { Background } from "../common";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Unprotected Route Animation - BIGGER
const UnprotectedRouteAnimation: React.FC = () => {
    const frame = useScaledFrame();

    // Door opens after 1 second
    const doorDelay = 30;
    const doorRotation = interpolate(
        frame - doorDelay,
        [0, 45],
        [0, -100],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Attacker walks in after 2.2 seconds
    const attackerDelay = 66;
    const attackerProgress = interpolate(
        frame - attackerDelay,
        [0, 45],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const attackerX = interpolate(attackerProgress, [0, 1], [-60, 14]);
    const attackerScale = interpolate(attackerProgress, [0, 1], [0.8, 1]);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
            {/* Browser Bar - BIGGER */}
            <div
                style={{
                    width: 420, // Increased from 340
                    backgroundColor: "#27272a",
                    borderRadius: 16, // Increased from 12
                    padding: 16, // Increased from 12
                    marginBottom: 40, // Increased from 30
                    display: "flex",
                    alignItems: "center",
                    gap: 16, // Increased from 12
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    border: "1px solid #3f3f46",
                }}
            >
                <div style={{ display: "flex", gap: 8 }}> {/* Increased gap */}
                    <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#52525b" }} />
                    <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#52525b" }} />
                </div>
                <div
                    style={{
                        flex: 1,
                        backgroundColor: "#18181b",
                        borderRadius: 8, // Increased from 6
                        padding: "10px 16px", // Increased padding
                        fontSize: 20, // Increased from 16
                        fontFamily: "monospace",
                        color: "#a1a1aa",
                        overflow: "hidden",
                    }}
                >
                    vibe-app.com<span style={{ color: "#f87171" }}>/admin</span>
                </div>
            </div>

            {/* Door Animation - BIGGER */}
            <div style={{ position: "relative", display: "flex", alignItems: "flex-end" }}>
                {/* Door frame/void behind */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        border: "3px solid #3f3f46",
                        zIndex: 0,
                    }}
                />

                {/* Door that opens */}
                <div
                    style={{
                        width: 130,
                        height: 190,
                        backgroundColor: "#27272a",
                        border: "3px solid #52525b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        transformOrigin: "left center",
                        transform: `perspective(1000px) rotateY(${doorRotation}deg)`,
                        zIndex: 1,
                    }}
                >
                    {/* Door handle */}
                    <div
                        style={{
                            position: "absolute",
                            right: 12,
                            top: 85,
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: "#71717a",
                        }}
                    />
                </div>

                {/* Attacker walking in - BIGGER */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 0,
                        opacity: attackerProgress,
                        transform: `translateX(calc(-50% + ${attackerX}px)) scale(${attackerScale})`,
                        zIndex: 2,
                    }}
                >
                    {/* UserX icon */}
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="17" y1="8" x2="22" y2="13" />
                        <line x1="22" y1="8" x2="17" y2="13" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

// Terminal window - BIGGER
const Terminal: React.FC = () => {
    const frame = useScaledFrame();

    const lines = [
        { text: "$ curl example.com/admin", delay: 0.5 },
        { text: "200 OK - Dashboard loaded", delay: 1.2, color: COLORS.success },
        { text: "$ curl example.com/api/debug", delay: 1.8 },
        { text: "200 OK - All secrets exposed", delay: 2.5, color: COLORS.danger },
    ];

    return (
        <div
            style={{
                width: "95%",
                maxWidth: 750, // Increased from 620
                backgroundColor: "#0D0D0D",
                borderRadius: 24, // Increased from 20
                overflow: "hidden",
                border: `1px solid ${COLORS.border}`,
                boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                marginTop: 20, // Added margin top
            }}
        >
            {/* Terminal header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "18px 24px", // Increased padding
                    backgroundColor: "#1A1A1A",
                    borderBottom: `1px solid ${COLORS.border}`,
                }}
            >
                <div style={{ display: "flex", gap: 10 }}> {/* Increased gap */}
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                    <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#10B981" }} />
                </div>
                <span style={{ fontSize: 18, color: COLORS.textMuted, marginLeft: 16 }}>Terminal</span> {/* Increased font size */}
            </div>

            {/* Terminal content */}
            <div style={{ padding: 32, fontFamily: "monospace", fontSize: 24, lineHeight: 1.8 }}> {/* Increased padding and font size */}
                {lines.map((line, i) => {
                    const showLine = spring({
                        frame: frame - line.delay * fps,
                        fps,
                        config: SPRING_CONFIG.smooth,
                    });

                    return (
                        <div
                            key={i}
                            style={{
                                opacity: showLine,
                                transform: `translateX(${(1 - showLine) * 20}px)`,
                                color: line.color || COLORS.textPrimary,
                            }}
                        >
                            {line.text}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const Scene08Routes: React.FC = () => {
    return (
        <Background variant="danger">
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    gap: 24,
                }}
            >
                <SlideIn direction="top" delay={0.2}>
                    <div style={{ fontSize: 44, fontWeight: 700, color: COLORS.danger, marginBottom: 20 }}>
                        <Emoji symbol="🚪" label="door" /> Unprotected Routes
                    </div>
                </SlideIn>

                {/* Animation 7 - Door opening with attacker */}
                <FadeIn delay={0.3}>
                    <UnprotectedRouteAnimation />
                </FadeIn>

                <ScaleIn delay={0.5}>
                    <Terminal />
                </ScaleIn>

                <SlideIn direction="bottom" delay={3}>
                    <div style={{ fontSize: 28, color: COLORS.textSecondary, marginTop: 20, textAlign: "center" }}>
                        Debug endpoints left wide open
                    </div>
                </SlideIn>
            </AbsoluteFill>
        </Background>
    );
};
