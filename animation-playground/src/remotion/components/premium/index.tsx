import React from "react";
import {
    useCurrentFrame,
    spring,
    interpolate,
} from "remotion";
import { COLORS, SPRING_CONFIG, VIDEO_CONFIG } from "../../config";

// Use FPS from config to avoid useVideoConfig context issues
const fps = VIDEO_CONFIG.FPS;

// ===============================
// Premium Animation Components
// Adapted from animation-playground for Remotion
// ===============================

// Code Editor Animation - shows code being typed with syntax highlighting
export const CodeEditorAnimation: React.FC<{
    lines: { content: React.ReactNode; delay?: number }[];
    filename?: string;
    highlightLine?: number;
    highlightColor?: string;
}> = ({ lines, filename = "config.ts", highlightLine, highlightColor = COLORS.danger }) => {
    const frame = useCurrentFrame();

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 900,
                background: "rgba(24, 24, 27, 0.95)",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
        >
            {/* Window Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "16px 20px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
            >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF5F56" }} />
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#27C93F" }} />
                <div style={{ marginLeft: "auto", color: "#71717a", fontSize: 13 }}>{filename}</div>
            </div>

            {/* Code Lines */}
            <div style={{ padding: "24px 28px" }}>
                {lines.map((line, index) => {
                    const lineDelay = (line.delay ?? index * 0.15) * fps;
                    const lineOpacity = interpolate(
                        frame - lineDelay,
                        [0, 10],
                        [0, 1],
                        { extrapolateRight: "clamp" }
                    );
                    const lineX = interpolate(
                        frame - lineDelay,
                        [0, 10],
                        [-20, 0],
                        { extrapolateRight: "clamp" }
                    );

                    const isHighlighted = highlightLine === index + 1;

                    return (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                opacity: lineOpacity,
                                transform: `translateX(${lineX}px)`,
                                padding: "4px 8px",
                                marginLeft: -8,
                                borderRadius: 6,
                                background: isHighlighted ? `${highlightColor}20` : "transparent",
                                borderLeft: isHighlighted ? `3px solid ${highlightColor}` : "3px solid transparent",
                            }}
                        >
                            <span style={{ width: 40, color: "#52525b", fontSize: 15, userSelect: "none" }}>
                                {index + 1}
                            </span>
                            <span style={{ color: "#a1a1aa", fontSize: 15 }}>{line.content}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Radar Scanner Animation
export const RadarScanner: React.FC<{
    size?: number;
    pings?: { x: number; y: number; delay: number }[];
}> = ({ size = 300, pings = [] }) => {
    const frame = useCurrentFrame();

    const rotation = (frame / fps) * 90; // 90 degrees per second

    return (
        <div
            style={{
                width: size,
                height: size,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* Radar circles */}
            {[0.3, 0.5, 0.7, 0.9].map((scale, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        width: size * scale,
                        height: size * scale,
                        border: `1px solid ${COLORS.primary}${i === 3 ? '40' : '20'}`,
                        borderRadius: "50%",
                    }}
                />
            ))}

            {/* Crosshairs */}
            <div style={{ position: "absolute", width: "100%", height: 1, background: `${COLORS.primary}15` }} />
            <div style={{ position: "absolute", width: 1, height: "100%", background: `${COLORS.primary}15` }} />

            {/* Rotating sweep */}
            <div
                style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, ${COLORS.primary}50 360deg)`,
                }}
            />

            {/* Pings */}
            {pings.map((ping, i) => {
                const pingFrame = frame - ping.delay * fps;
                const pingOpacity = interpolate(
                    pingFrame % (fps * 2.5),
                    [0, fps * 0.5, fps * 2],
                    [0, 1, 0],
                    { extrapolateRight: "clamp" }
                );
                const pingScale = interpolate(
                    pingFrame % (fps * 2.5),
                    [0, fps * 2],
                    [0.5, 1.5],
                    { extrapolateRight: "clamp" }
                );

                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `calc(50% + ${ping.x}px)`,
                            top: `calc(50% + ${ping.y}px)`,
                            width: 16,
                            height: 16,
                            background: COLORS.primary,
                            borderRadius: "50%",
                            opacity: pingOpacity,
                            transform: `translate(-50%, -50%) scale(${pingScale})`,
                            boxShadow: `0 0 20px ${COLORS.primary}`,
                        }}
                    />
                );
            })}

            {/* Status indicator */}
            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "rgba(6, 182, 212, 0.1)",
                    border: `1px solid ${COLORS.primary}30`,
                    borderRadius: 8,
                    backdropFilter: "blur(10px)",
                }}
            >
                <div
                    style={{
                        width: 8,
                        height: 8,
                        background: COLORS.primary,
                        borderRadius: "50%",
                        boxShadow: `0 0 10px ${COLORS.primary}`,
                    }}
                />
                <span style={{ color: COLORS.primary, fontSize: 14, fontFamily: "monospace", fontWeight: 600 }}>
                    ACTIVE SCAN
                </span>
            </div>
        </div>
    );
};

// DM Notification Animation (for nightmare scene)
export const DMNotification: React.FC<{
    message: string;
    delay?: number;
}> = ({ message, delay = 0 }) => {
    const frame = useCurrentFrame();

    const entryProgress = spring({
        frame: frame - delay * fps,
        fps,
        config: { damping: 15, stiffness: 100 },
    });

    const shake = frame > (delay + 1) * fps && frame < (delay + 1.5) * fps
        ? Math.sin(frame * 0.8) * 4
        : 0;

    return (
        <div
            style={{
                background: "rgba(39, 39, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: 20,
                width: 500,
                boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                transform: `translateY(${interpolate(entryProgress, [0, 1], [50, 0])}px) translateX(${shake}px)`,
                opacity: entryProgress,
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "white",
                        fontSize: 22,
                    }}
                >
                    ?
                </div>
                <div>
                    <div style={{ fontWeight: 700, color: "white", fontSize: 16 }}>Unknown User</div>
                    <div style={{ color: "#71717a", fontSize: 13 }}>Just now</div>
                </div>
            </div>

            {/* Message */}
            <div style={{ color: "#d4d4d8", fontSize: 18, lineHeight: 1.5 }}>
                "{message}"
            </div>
        </div>
    );
};

// Consequence Icon Animation (shaking emoji)
export const ConsequenceIcon: React.FC<{
    emoji: string;
    label: string;
    delay?: number;
}> = ({ emoji, label, delay = 0 }) => {
    const frame = useCurrentFrame();

    const entryProgress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    // Continuous shake after entry
    const shake = frame > (delay + 0.5) * fps
        ? Math.sin(frame * 0.5) * 3
        : 0;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: entryProgress,
                transform: `scale(${entryProgress}) rotate(${shake}deg)`,
            }}
        >
            <div style={{ fontSize: 80 }}>{emoji}</div>
            <div style={{ color: COLORS.danger, fontSize: 18, fontWeight: 600 }}>{label}</div>
        </div>
    );
};

// Security Shield Animation
export const SecurityShield: React.FC<{
    secured?: boolean;
    delay?: number;
}> = ({ secured = false, delay = 0 }) => {
    const frame = useCurrentFrame();

    const drawProgress = interpolate(
        frame - delay * fps,
        [0, fps * 2],
        [0, 1],
        { extrapolateRight: "clamp" }
    );

    const fillProgress = interpolate(
        frame - (delay + 2) * fps,
        [0, fps * 1.5],
        [0, 1],
        { extrapolateRight: "clamp" }
    );

    const glowPulse = Math.sin((frame / fps) * 2) * 0.3 + 0.7;
    const color = secured ? COLORS.success : COLORS.primary;

    return (
        <div style={{ position: "relative", width: 200, height: 240 }}>
            {/* Glow */}
            <div
                style={{
                    position: "absolute",
                    inset: -40,
                    background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                    opacity: fillProgress * glowPulse,
                    filter: "blur(30px)",
                }}
            />

            {/* Shield SVG */}
            <svg width="200" height="240" viewBox="0 0 24 28" fill="none">
                {/* Outline */}
                <path
                    d="M12 26s10-5 10-12.5V4L12 1 2 4v9.5C2 21 12 26 12 26z"
                    stroke={color}
                    strokeWidth="1"
                    fill="none"
                    strokeDasharray="80"
                    strokeDashoffset={80 * (1 - drawProgress)}
                />

                {/* Fill */}
                <path
                    d="M12 26s10-5 10-12.5V4L12 1 2 4v9.5C2 21 12 26 12 26z"
                    fill={`${color}20`}
                    opacity={fillProgress}
                />

                {/* Checkmark */}
                {secured && (
                    <path
                        d="M8 14l3 3 5-6"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="20"
                        strokeDashoffset={20 * (1 - fillProgress)}
                    />
                )}
            </svg>
        </div>
    );
};

// Scan Item with checkmark animation
export const ScanItem: React.FC<{
    icon: string;
    text: string;
    delay?: number;
    status?: "pending" | "scanning" | "complete";
}> = ({ icon, text, delay = 0, status = "complete" }) => {
    const frame = useCurrentFrame();

    const entryProgress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.snappy,
    });

    const scanProgress = interpolate(
        frame - (delay + 0.3) * fps,
        [0, fps * 0.8],
        [0, 1],
        { extrapolateRight: "clamp" }
    );

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 28px",
                background: status === "complete" ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.03)",
                borderRadius: 16,
                border: `1px solid ${status === "complete" ? COLORS.success + "40" : "rgba(255,255,255,0.1)"}`,
                opacity: entryProgress,
                transform: `translateX(${interpolate(entryProgress, [0, 1], [40, 0])}px)`,
            }}
        >
            <span style={{ fontSize: 32 }}>{icon}</span>
            <span style={{ flex: 1, color: COLORS.textPrimary, fontSize: 22, fontWeight: 500 }}>{text}</span>

            {/* Checkmark */}
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: COLORS.success,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${scanProgress})`,
                    boxShadow: `0 0 20px ${COLORS.success}50`,
                }}
            >
                <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>✓</span>
            </div>
        </div>
    );
};

// Platform Logo Component
export const PlatformLogo: React.FC<{
    name: string;
    color: string;
    delay?: number;
}> = ({ name, color, delay = 0 }) => {
    const frame = useCurrentFrame();

    const entryProgress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: entryProgress,
                transform: `scale(${entryProgress}) translateY(${interpolate(entryProgress, [0, 1], [30, 0])}px)`,
            }}
        >
            <div
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 24,
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "white",
                    fontSize: 40,
                    boxShadow: `0 10px 40px ${color}50`,
                }}
            >
                {name[0]}
            </div>
            <span style={{ color: "#a1a1aa", fontSize: 18, fontWeight: 500 }}>{name}</span>
        </div>
    );
};

// Rapid Counter Animation
export const RapidCounter: React.FC<{
    endValue: number;
    duration?: number;
    delay?: number;
    prefix?: string;
    suffix?: string;
}> = ({ endValue, duration = 2, delay = 0, prefix = "", suffix = "" }) => {
    const frame = useCurrentFrame();

    const progress = interpolate(
        frame - delay * fps,
        [0, duration * fps],
        [0, 1],
        { extrapolateRight: "clamp" }
    );

    const currentValue = Math.round(progress * endValue);

    return (
        <span>
            {prefix}{currentValue.toLocaleString()}{suffix}
        </span>
    );
};

// Glitch Text Effect
export const GlitchText: React.FC<{
    children: string;
    intensity?: number;
}> = ({ children, intensity = 1 }) => {
    const frame = useCurrentFrame();

    const glitchX = Math.sin(frame * 0.7) * 3 * intensity;
    const glitchY = Math.cos(frame * 0.5) * 2 * intensity;
    const shouldGlitch = Math.random() > 0.92;

    return (
        <span style={{ position: "relative", display: "inline-block" }}>
            {shouldGlitch && (
                <>
                    <span
                        style={{
                            position: "absolute",
                            left: glitchX,
                            top: glitchY,
                            color: COLORS.danger,
                            opacity: 0.8,
                            clipPath: "inset(0 0 50% 0)",
                        }}
                    >
                        {children}
                    </span>
                    <span
                        style={{
                            position: "absolute",
                            left: -glitchX,
                            top: -glitchY,
                            color: COLORS.primary,
                            opacity: 0.8,
                            clipPath: "inset(50% 0 0 0)",
                        }}
                    >
                        {children}
                    </span>
                </>
            )}
            {children}
        </span>
    );
};

// Alert Badge Animation
export const AlertBadge: React.FC<{
    text: string;
    type?: "danger" | "warning" | "success";
    delay?: number;
}> = ({ text, type = "danger", delay = 0 }) => {
    const frame = useCurrentFrame();

    const colors = {
        danger: { bg: "rgba(239, 68, 68, 0.9)", border: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
        warning: { bg: "rgba(245, 158, 11, 0.9)", border: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" },
        success: { bg: "rgba(16, 185, 129, 0.9)", border: "#10b981", glow: "rgba(16, 185, 129, 0.4)" },
    };

    const c = colors[type];

    const entryProgress = spring({
        frame: frame - delay * fps,
        fps,
        config: { damping: 12, stiffness: 120 },
    });

    const pulse = Math.sin((frame / fps) * 4) * 0.15 + 0.85;

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 24px",
                background: c.bg,
                border: `2px solid ${c.border}`,
                borderRadius: 12,
                boxShadow: `0 0 30px ${c.glow}`,
                transform: `scale(${entryProgress * pulse})`,
                opacity: entryProgress,
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{text}</span>
        </div>
    );
};
