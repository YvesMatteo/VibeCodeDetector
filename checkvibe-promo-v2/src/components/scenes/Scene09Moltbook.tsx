import React from "react";
import { AbsoluteFill, spring, interpolate, Img, staticFile } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

// Leaking key animation - BIGGER
const LeakingKey: React.FC<{ index: number }> = ({ index }) => {
    const frame = useScaledFrame();
    const delay = 45 + index * 12;
    const cycleLength = 60;
    const cycleFrame = (frame - delay) % cycleLength;

    const progress = frame > delay ? interpolate(cycleFrame, [0, cycleLength], [0, 1]) : 0;
    const opacity = frame > delay
        ? interpolate(progress, [0, 0.3, 1], [0, 1, 0])
        : 0;

    const xOffset = ((index * 17) % 100) - 50;
    const yOffset = -80 - ((index * 23) % 120);
    const x = xOffset * progress;
    const y = yOffset * progress;

    return (
        <div
            style={{
                position: "absolute",
                bottom: "50%",
                left: "50%",
                transform: `translate(${x}px, ${y}px)`,
                opacity,
            }}
        >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#eab308cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
        </div>
    );
};

export const Scene09Moltbook: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();
    const sceneDuration = 6 * fps; // 6 seconds = 180 frames

    // Shake starts in the middle of the scene (3 seconds = 90 frames)
    const shakeStartFrame = sceneDuration / 2;
    const isShaking = frame > shakeStartFrame;

    // Calculate shake offset - ONLY moves a few pixels, always returns to center
    const shakeX = isShaking ? Math.sin(frame * 0.5) * 5 : 0;
    const shakeY = isShaking ? Math.cos(frame * 0.7) * 3 : 0;

    // Animation timings
    const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Moltbook card appears after title
    const cardOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const cardScale = spring({ frame: frame - 15, fps, config: SPRING_CONFIG.smooth });

    // Badge with "~150,000 API Keys" appears
    const badgeProgress = spring({ frame: frame - 35, fps, config: SPRING_CONFIG.snappy });
    const badgeY = interpolate(badgeProgress, [0, 1], [10, 0]);

    // Grid appears after Moltbook
    const gridDelay = 60;
    const gridOpacity = interpolate(frame, [gridDelay, gridDelay + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Grid zooms out
    const gridScale = interpolate(frame, [gridDelay + 60, gridDelay + 90], [1, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // "WIDESPREAD VULNERABILITIES" text appears after zoom
    const textOpacity = interpolate(frame, [gridDelay + 80, gridDelay + 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    const gridItems = Array.from({ length: 16 });

    return (
        <Background variant="danger">
            {/* Everything permanently centered - NO SHAKE WRAPPER */}
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                }}
            >
                {/* Content container with shake applied directly */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: `translate(${shakeX}px, ${shakeY}px)`,
                    }}
                >
                    {/* "Real example:" title - BIGGER */}
                    <div
                        style={{
                            fontSize: 56,
                            fontWeight: 600,
                            color: COLORS.textSecondary,
                            textAlign: "center",
                            marginBottom: 36,
                            opacity: titleOpacity,
                            transform: `translateY(${titleY}px)`,
                        }}
                    >
                        Real example:
                    </div>

                    {/* Animation 8: Moltbook Example - BIGGER */}
                    <div
                        style={{
                            border: "2px solid #27272a",
                            backgroundColor: "rgba(24, 24, 27, 0.5)",
                            borderRadius: 36, // Increased from 28
                            padding: 48, // Increased from 36
                            width: 650, // Increased from 500
                            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            opacity: cardOpacity,
                            transform: `scale(${Math.min(cardScale, 1)})`,
                            marginBottom: 40, // Increased from 32
                        }}
                    >
                        {/* Moltbook Logo - WAY BIGGER */}
                        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}> {/* Increased gap and margin */}
                            <Img
                                src={staticFile("Moltbook-A-Social-Network-for-AI-Agents.webp")}
                                style={{ height: 140, objectFit: "contain" }} // Increased from 100
                            />
                        </div>

                        {/* Database with leaking keys - BIGGER */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "20px 0" }}>
                            <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"> {/* Increased from 100 */}
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                            </svg>

                            <div
                                style={{
                                    marginTop: 24, // Increased from 16
                                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                                    color: "#f87171",
                                    fontSize: 32, // Increased from 24
                                    fontWeight: 700,
                                    padding: "16px 36px", // Increased padding
                                    borderRadius: 16, // Increased from 12
                                    border: "2px solid rgba(239, 68, 68, 0.3)",
                                    opacity: badgeProgress,
                                    transform: `translateY(${badgeY}px)`,
                                }}
                            >
                                ~150,000 API Keys
                            </div>

                            {/* Leaking keys animation */}
                            {[...Array(6)].map((_, i) => (
                                <LeakingKey key={i} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Animation 9: Incidents Grid - BIGGER */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            opacity: gridOpacity,
                            transform: `scale(${gridScale})`,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: 14,
                                backgroundColor: "rgba(24, 24, 27, 0.3)",
                                padding: 24,
                                borderRadius: 20,
                            }}
                        >
                            {gridItems.map((_, i) => {
                                const alertDelay = gridDelay + 10 + i * 3;
                                const alertScale = spring({ frame: frame - alertDelay, fps, config: SPRING_CONFIG.bouncy });

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            backgroundColor: "#27272a",
                                            borderRadius: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                        }}
                                    >
                                        <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: "#3f3f46", opacity: 0.5 }} />
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: -6,
                                                right: -6,
                                                backgroundColor: "#09090b",
                                                borderRadius: "50%",
                                                transform: `scale(${alertScale})`,
                                            }}
                                        >
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                                <line x1="12" y1="9" x2="12" y2="13" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* WIDESPREAD VULNERABILITIES text - BIGGER */}
                        <div
                            style={{
                                textAlign: "center",
                                marginTop: 24,
                                color: "#ef4444",
                                fontWeight: 700,
                                fontSize: 26,
                                textTransform: "uppercase",
                                letterSpacing: 4,
                                opacity: textOpacity,
                            }}
                        >
                            WIDESPREAD VULNERABILITIES
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </Background>
    );
};
