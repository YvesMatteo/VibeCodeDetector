import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, COLORS, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn } from "../animations";
import { Background } from "../common";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Open Database Animation - BIGGER
const OpenDatabaseAnimation: React.FC = () => {
    const frame = useScaledFrame();

    // Lock falls off after 1 second
    const lockDelay = 30;
    const lockFallProgress = interpolate(
        frame - lockDelay,
        [0, 24],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const lockY = lockFallProgress * 60;
    const lockRotate = lockFallProgress * 180;
    const lockOpacity = 1 - lockFallProgress;

    // Red glow appears after lock falls
    const glowOpacity = interpolate(
        frame,
        [54, 70],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Streaming data lines appear after 1.8s = 54 frames
    const dataLinesDelay = 54;

    return (
        <div style={{ position: "relative", marginBottom: 40 }}>
            {/* Red glow behind database */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 280,
                    height: 280,
                    transform: "translate(-50%, -50%)",
                    background: "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)",
                    opacity: glowOpacity,
                    filter: "blur(30px)",
                    zIndex: 0,
                }}
            />

            {/* Database icon - BIGGER */}
            <div style={{ position: "relative", zIndex: 10 }}>
                <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>

                {/* Lock that falls off */}
                <div
                    style={{
                        position: "absolute",
                        bottom: -15,
                        right: -15,
                        backgroundColor: "#09090b",
                        borderRadius: "50%",
                        padding: 8,
                        opacity: lockOpacity,
                        transform: `translateY(${lockY}px) rotate(${lockRotate}deg)`,
                    }}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
            </div>

            {/* Streaming data lines - 8 lines radiating outward */}
            {[...Array(8)].map((_, i) => {
                const lineDelay = dataLinesDelay + i * 3;
                const lineFrame = frame - lineDelay;
                const cycleFrame = lineFrame % 60;

                const scaleX = interpolate(
                    cycleFrame,
                    [0, 45],
                    [0, 1.8],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const opacity = lineFrame > 0
                    ? interpolate(cycleFrame, [0, 20, 45], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                    : 0;

                const angle = i * 45;

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: 180,
                            height: 4,
                            background: "linear-gradient(to right, #ef4444, transparent)",
                            transformOrigin: "left center",
                            transform: `rotate(${angle}deg) scaleX(${scaleX})`,
                            opacity,
                            zIndex: 0,
                        }}
                    />
                );
            })}
        </div>
    );
};

// Database visualization with data flowing out - BIGGER
const DatabaseViz: React.FC = () => {
    const frame = useScaledFrame();

    return (
        <div style={{ position: "relative" }}>
            {/* Open Database Animation */}
            <OpenDatabaseAnimation />

            {/* Data flowing out */}
            {[0, 1, 2].map((i) => {
                const delay = 1.5 + i * 0.3;
                const flowProgress = spring({
                    frame: frame - delay * fps,
                    fps,
                    config: SPRING_CONFIG.smooth,
                });

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            right: -320,
                            top: -40 + i * 80,
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            opacity: flowProgress,
                            transform: `translateX(${(1 - flowProgress) * 60}px)`,
                        }}
                    >
                        <div style={{ fontSize: 36, color: COLORS.danger }}>→</div>
                        <div
                            style={{
                                padding: "16px 24px",
                                backgroundColor: `${COLORS.danger}20`,
                                borderRadius: 12,
                                border: `1px solid ${COLORS.danger}40`,
                                fontFamily: "monospace",
                                fontSize: 22,
                                color: COLORS.textPrimary,
                            }}
                        >
                            {["user_data.json", "passwords.csv", "api_tokens.txt"][i]}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const Scene07OpenDB: React.FC = () => {
    return (
        <Background variant="danger">
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                }}
            >
                <SlideIn direction="top" delay={0.2}>
                    <div style={{ fontSize: 60, fontWeight: 700, color: COLORS.danger, marginBottom: 80 }}>
                        <Emoji symbol="🗄️" label="cabinet" /> Open Databases
                    </div>
                </SlideIn>

                <DatabaseViz />

                <SlideIn direction="bottom" delay={2.5}>
                    <div style={{ fontSize: 40, color: COLORS.textSecondary, marginTop: 100, textAlign: "center" }}>
                        No authentication required to access
                    </div>
                </SlideIn>
            </AbsoluteFill>
        </Background>
    );
};
