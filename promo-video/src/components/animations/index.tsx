import React from "react";
import {
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Easing,
} from "remotion";
import { SPRING_CONFIG } from "../../config";

// Fade In Animation
export const FadeIn: React.FC<{
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}> = ({ children, delay = 0, duration = 1 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.smooth,
        durationInFrames: duration * fps,
    });

    return <div style={{ opacity }}>{children}</div>;
};

// Slide In Animation
export const SlideIn: React.FC<{
    children: React.ReactNode;
    direction?: "left" | "right" | "top" | "bottom";
    delay?: number;
    distance?: number;
}> = ({ children, direction = "bottom", delay = 0, distance = 100 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.snappy,
    });

    const getTransform = () => {
        const offset = interpolate(progress, [0, 1], [distance, 0]);
        switch (direction) {
            case "left":
                return `translateX(${-offset}px)`;
            case "right":
                return `translateX(${offset}px)`;
            case "top":
                return `translateY(${-offset}px)`;
            case "bottom":
                return `translateY(${offset}px)`;
        }
    };

    return (
        <div style={{ transform: getTransform(), opacity: progress }}>
            {children}
        </div>
    );
};

// Scale In Animation
export const ScaleIn: React.FC<{
    children: React.ReactNode;
    delay?: number;
}> = ({ children, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    return (
        <div
            style={{
                transform: `scale(${scale})`,
                opacity: scale,
            }}
        >
            {children}
        </div>
    );
};

// Typewriter Text Animation
export const TypewriterText: React.FC<{
    text: string;
    startFrame?: number;
    charsPerSecond?: number;
    style?: React.CSSProperties;
}> = ({ text, startFrame = 0, charsPerSecond = 30, style }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const framesPerChar = fps / charsPerSecond;
    const elapsedFrames = Math.max(0, frame - startFrame);
    const charsToShow = Math.floor(elapsedFrames / framesPerChar);

    const displayText = text.slice(0, Math.min(charsToShow, text.length));
    const showCursor = frame % (fps / 2) < fps / 4;

    return (
        <span style={style}>
            {displayText}
            {charsToShow < text.length && (
                <span style={{ opacity: showCursor ? 1 : 0 }}>|</span>
            )}
        </span>
    );
};

// Glow Text Animation
export const GlowText: React.FC<{
    children: React.ReactNode;
    color?: string;
    intensity?: number;
    pulse?: boolean;
}> = ({ children, color = "#00D4FF", intensity = 20, pulse = false }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    let glowIntensity = intensity;
    if (pulse) {
        glowIntensity = interpolate(
            Math.sin((frame / fps) * Math.PI * 2),
            [-1, 1],
            [intensity * 0.5, intensity * 1.5]
        );
    }

    return (
        <span
            style={{
                textShadow: `0 0 ${glowIntensity}px ${color}, 0 0 ${glowIntensity * 2}px ${color}`,
                color: "#fff",
            }}
        >
            {children}
        </span>
    );
};

// Staggered List Reveal
export const StaggeredReveal: React.FC<{
    items: React.ReactNode[];
    staggerDelay?: number;
    startDelay?: number;
}> = ({ items, staggerDelay = 0.2, startDelay = 0 }) => {
    return (
        <>
            {items.map((item, index) => (
                <SlideIn
                    key={index}
                    direction="bottom"
                    delay={startDelay + index * staggerDelay}
                >
                    {item}
                </SlideIn>
            ))}
        </>
    );
};

// Pulse Glow Animation (for CTAs)
export const PulseGlow: React.FC<{
    children: React.ReactNode;
    color?: string;
}> = ({ children, color = "#00D4FF" }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pulse = interpolate(
        Math.sin((frame / fps) * Math.PI * 2),
        [-1, 1],
        [0.6, 1]
    );

    return (
        <div
            style={{
                boxShadow: `0 0 ${20 * pulse}px ${color}, 0 0 ${40 * pulse}px ${color}50`,
            }}
        >
            {children}
        </div>
    );
};
// ... existing exports ...

export { ScoreDashboardAnimation } from "./ScoreDashboardAnimation";
export { SecurityShieldAnimation } from "./SecurityShieldAnimation";
export { SecurityConfidenceAnimation } from "./SecurityConfidenceAnimation";
export { SocialMediaAnimation } from "./SocialMediaAnimation";
export {
    PlatformLogos,
    VulnerabilityVisuals,
    RapidCounter,
    ConsequenceIcons,
    ScannerRow,
    ActionableButton
} from "./MicroAnimations";
