import { AbsoluteFill, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, useScaledFrame } from "../../config";
import { Background } from "../common";
import { useColors } from "../../ThemeContext";
import { Emoji } from "../common/Emoji";

const fps = VIDEO_CONFIG.FPS;

// Confetti particle component - BIGGER
const ConfettiParticle: React.FC<{
    index: number;
    startFrame: number;
}> = ({ index, startFrame }) => {
    const frame = useScaledFrame();

    // Each particle has a random direction
    const angle = (index / 12) * Math.PI * 2;
    const distance = 180 + (index % 3) * 60;

    const progress = interpolate(
        frame - startFrame,
        [0, 24],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    const scale = interpolate(progress, [0, 0.3, 1], [0, 1, 0]);
    const x = Math.cos(angle) * distance * progress;
    const y = Math.sin(angle) * distance * progress;

    const colors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"];
    const color = colors[index % colors.length];

    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: color,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity: scale,
            }}
        />
    );
};

// Mouse cursor component - BIGGER
const MouseCursor: React.FC = () => {
    const frame = useScaledFrame();

    // Move cursor from off-screen to button center
    const moveProgress = spring({
        frame: frame - 15,
        fps,
        config: { damping: 15, stiffness: 80 },
    });

    // Move from bottom-right toward center of button
    const x = interpolate(moveProgress, [0, 1], [220, 0]);
    const y = interpolate(moveProgress, [0, 1], [180, 0]);

    // Click animation - cursor shrinks slightly on click
    const isClicking = frame > 55 && frame < 70;
    const clickScale = isClicking
        ? interpolate(frame, [55, 60, 65, 70], [1, 0.7, 0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : 1;

    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${clickScale})`,
                opacity: interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" }),
                zIndex: 20,
                pointerEvents: "none",
            }}
        >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="#000" strokeWidth="0.5">
                <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
            </svg>
        </div>
    );
};

export const Scene02Success: React.FC = () => {
    const frame = useScaledFrame();
    const COLORS = useColors();

    // Button pulse animation
    const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.03 + 1;

    // Button scale on "click" at frame 60
    const clickScale = frame > 60 && frame < 75
        ? spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 300 } })
        : 0;
    const buttonScale = pulse - clickScale * 0.08;

    // Button glow
    const glowPulse = Math.sin((frame / fps) * Math.PI * 2) * 0.3 + 0.5;

    // Click flash
    const flashOpacity = interpolate(
        frame,
        [60, 65, 75],
        [0, 0.4, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Background glow after click
    const bgGlowOpacity = interpolate(
        frame,
        [60, 90, 150],
        [0, 0.6, 0.4],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <Background>
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                }}
            >
                {/* Background glow */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: 500,
                        height: 500,
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
                        opacity: bgGlowOpacity,
                        filter: "blur(80px)",
                    }}
                />

                {/* Button container */}
                <div style={{ position: "relative" }}>
                    {/* Launch button - BIGGER */}
                    <div
                        style={{
                            padding: "40px 80px",
                            background: `linear-gradient(135deg, ${COLORS.primary} 0%, #6366f1 100%)`,
                            color: "white",
                            fontSize: 56,
                            fontWeight: 700,
                            borderRadius: 24,
                            transform: `scale(${buttonScale})`,
                            boxShadow: `0 0 ${50 * glowPulse}px ${COLORS.primaryGlow}`,
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        Launch Project <Emoji symbol="🚀" label="rocket" />

                        {/* Click flash overlay */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                backgroundColor: "white",
                                opacity: flashOpacity,
                            }}
                        />
                    </div>

                    {/* Mouse cursor */}
                    <MouseCursor />

                    {/* Confetti particles */}
                    {[...Array(12)].map((_, i) => (
                        <ConfettiParticle key={i} index={i} startFrame={65} />
                    ))}
                </div>

                {/* Success text after click - BIGGER */}
                <div
                    style={{
                        marginTop: 100,
                        fontSize: 48,
                        fontWeight: 700,
                        opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                        transform: `translateY(${interpolate(frame, [80, 100], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                        background: "linear-gradient(90deg, #60a5fa, #38bdf8, #818cf8, #60a5fa, #38bdf8)",
                        backgroundSize: "200% 100%",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        animation: "shimmer 2.5s linear infinite",
                    }}
                >
                    <Emoji symbol="✨" label="sparkles" /> It works! Looks amazing!
                </div>
                <style>
                    {`
                        @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                        }
                    `}
                </style>
            </AbsoluteFill>
        </Background>
    );
};
