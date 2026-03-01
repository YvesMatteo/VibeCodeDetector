import React from "react";
import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, useScaledFrame } from "../../config";
import { SlideIn } from "../animations";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";

const fps = VIDEO_CONFIG.FPS;

// Globe icon
const GlobeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

// Key icon
const KeyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

// Database icon
const DatabaseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
);

// Shield alert icon
const ShieldAlertIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
    </svg>
);

// Animation 15: Entering App URL - Full width, no background
const EnteringAppUrl: React.FC<{ delay: number }> = ({ delay }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const showCard = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    const urlText = "mycoolapp.com";
    const typedLength = Math.min(
        urlText.length,
        Math.floor(interpolate(frame - (delay + 0.3) * fps, [0, 1.5 * fps], [0, urlText.length], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        }))
    );
    const displayedUrl = urlText.slice(0, typedLength);
    const cursorVisible = Math.floor(frame / 15) % 2 === 0;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 40,
                width: "100%",
                transform: `scale(${showCard})`,
                opacity: showCard,
                paddingLeft: 60,
                paddingRight: 60,
            }}
        >
            <div
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: `${COLORS.primary}20`,
                    border: `2px solid ${COLORS.primary}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 700,
                    color: COLORS.primary,
                    flexShrink: 0,
                }}
            >
                1
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 16 }}>
                    Drop in your URL
                </div>
                <div
                    style={{
                        backgroundColor: "rgba(24, 24, 27, 0.6)",
                        border: "1px solid #3f3f46",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        padding: "20px 24px",
                        maxWidth: 500,
                    }}
                >
                    <div style={{ color: "#71717a", marginRight: 16 }}><GlobeIcon size={28} /></div>
                    <div style={{ fontFamily: "monospace", fontSize: 28, color: COLORS.textSecondary }}>
                        {displayedUrl}
                        <span style={{ opacity: cursorVisible ? 1 : 0, color: COLORS.success }}>|</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Animation 16: Scanning Animation with Radar - Full width, no background
const ScanningAnimation: React.FC<{ delay: number }> = ({ delay }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const showRadar = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.smooth,
    });

    const rotation = ((frame - delay * fps) * 3) % 360;

    const foundItems = [
        { color: "#f87171", x: 90, y: -65, itemDelay: 0.5, Icon: KeyIcon },
        { color: "#fbbf24", x: -80, y: 70, itemDelay: 1.2, Icon: DatabaseIcon },
        { color: "#60a5fa", x: -95, y: -45, itemDelay: 1.9, Icon: ShieldAlertIcon },
    ];

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 40,
                width: "100%",
                transform: `scale(${showRadar})`,
                opacity: showRadar,
                paddingLeft: 60,
                paddingRight: 60,
            }}
        >
            <div
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: `${COLORS.primary}20`,
                    border: `2px solid ${COLORS.primary}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 700,
                    color: COLORS.primary,
                    flexShrink: 0,
                }}
            >
                2
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 40 }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: COLORS.textPrimary }}>
                    We scan everything
                </div>

                {/* Radar container */}
                <div
                    style={{
                        position: "relative",
                        width: 220,
                        height: 220,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    {/* Central App Icon */}
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            backgroundColor: "rgba(24, 24, 27, 0.8)",
                            borderRadius: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                            fontWeight: 700,
                            color: COLORS.textPrimary,
                            zIndex: 10,
                            border: `1px solid ${COLORS.border}`,
                        }}
                    >
                        App
                    </div>

                    {/* Radar circles */}
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                width: 60 * i,
                                height: 60 * i,
                                border: `2px solid ${COLORS.success}40`,
                                borderRadius: "50%",
                            }}
                        />
                    ))}

                    {/* Radar sweep */}
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            width: 90,
                            height: 3,
                            background: `linear-gradient(to right, ${COLORS.success}, transparent)`,
                            transformOrigin: "left center",
                            transform: `translateY(-50%) rotate(${rotation}deg)`,
                            opacity: 0.8,
                        }}
                    />

                    {/* Found items */}
                    {foundItems.map((item, idx) => {
                        const itemShow = spring({
                            frame: frame - (delay + item.itemDelay) * fps,
                            fps,
                            config: SPRING_CONFIG.bouncy,
                        });

                        return (
                            <div
                                key={idx}
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) scale(${itemShow})`,
                                    backgroundColor: "rgba(24, 24, 27, 0.9)",
                                    padding: 12,
                                    borderRadius: "50%",
                                    border: `1px solid ${COLORS.border}`,
                                    color: item.color,
                                    opacity: itemShow,
                                }}
                            >
                                <item.Icon size={24} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Animation 17: Issue Cards Appearing - Full width, no background
const IssueCardsAppearing: React.FC<{ delay: number }> = ({ delay }) => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    const showCard = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    const cards = [
        { Icon: KeyIcon, title: "Leaked API Key", color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" },
        { Icon: DatabaseIcon, title: "Open Database", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.3)" },
        { Icon: ShieldAlertIcon, title: "Unprotected Route", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)", border: "rgba(251, 146, 60, 0.3)" },
    ];

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 40,
                width: "100%",
                transform: `scale(${showCard})`,
                opacity: showCard,
                paddingLeft: 60,
                paddingRight: 60,
            }}
        >
            <div
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: `${COLORS.primary}20`,
                    border: `2px solid ${COLORS.primary}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 700,
                    color: COLORS.primary,
                    flexShrink: 0,
                }}
            >
                3
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 16 }}>
                    Get clear results
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                    {cards.map((card, i) => {
                        const cardProgress = spring({
                            frame: frame - (delay + 0.5 + i * 0.4) * fps,
                            fps,
                            config: SPRING_CONFIG.smooth,
                        });
                        const y = interpolate(cardProgress, [0, 1], [30, 0]);

                        return (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "18px 24px",
                                    backgroundColor: card.bg,
                                    border: `2px solid ${card.border}`,
                                    borderRadius: 14,
                                    opacity: cardProgress,
                                    transform: `translateY(${y}px)`,
                                }}
                            >
                                <div style={{ color: card.color }}><card.Icon size={28} /></div>
                                <span style={{ color: COLORS.textPrimary, fontWeight: 600, fontSize: 20 }}>{card.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const Scene14HowItWorks: React.FC = () => {
    const COLORS = useColors();
    return (
        <Background>
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 50,
                }}
            >
                <SlideIn direction="top" delay={0.1}>
                    <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.textPrimary }}>
                        How it works
                    </div>
                </SlideIn>

                {/* Vertical stack - fills the screen */}
                <EnteringAppUrl delay={0.3} />
                <ScanningAnimation delay={1.5} />
                <IssueCardsAppearing delay={2.7} />

                {/* Spacer for bottom */}
                <div style={{ height: 20 }} />
            </AbsoluteFill>
        </Background>
    );
};
