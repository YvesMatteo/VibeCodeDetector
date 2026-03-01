import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import { VIDEO_CONFIG, SPRING_CONFIG, getScaledFrame } from "../../config";

const fps = VIDEO_CONFIG.FPS;

// Fade In Animation
export const FadeIn: React.FC<{
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}> = ({ children, delay = 0, duration = 0.5 }) => {
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);

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
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);

    const progress = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.snappy,
    });

    const getTransform = () => {
        const offset = interpolate(progress, [0, 1], [distance, 0]);
        switch (direction) {
            case "left": return `translateX(${-offset}px)`;
            case "right": return `translateX(${offset}px)`;
            case "top": return `translateY(${-offset}px)`;
            case "bottom": return `translateY(${offset}px)`;
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
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);

    const scale = spring({
        frame: frame - delay * fps,
        fps,
        config: SPRING_CONFIG.bouncy,
    });

    return (
        <div style={{ transform: `scale(${scale})`, opacity: scale }}>
            {children}
        </div>
    );
};

// Glow Text Component
export const GlowText: React.FC<{
    children: React.ReactNode;
    color?: string;
}> = ({ children, color = "#37A8FF" }) => {
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);
    const pulse = Math.sin((frame / fps) * 2) * 0.15 + 1;

    return (
        <span
            style={{
                color,
                textShadow: `0 0 ${20 * pulse}px ${color}, 0 0 ${40 * pulse}px ${color}40`,
                fontWeight: 700,
            }}
        >
            {children}
        </span>
    );
};

// Typewriter Text
export const TypewriterText: React.FC<{
    text: string;
    delay?: number;
    speed?: number;
}> = ({ text, delay = 0, speed = 0.05 }) => {
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);
    const startFrame = delay * fps;
    const charsToShow = Math.floor(Math.max(0, (frame - startFrame) / (speed * fps)));
    const displayText = text.slice(0, Math.min(charsToShow, text.length));

    return <span>{displayText}</span>;
};

// Shake Effect
export const Shake: React.FC<{
    children: React.ReactNode;
    intensity?: number;
    active?: boolean;
}> = ({ children, intensity = 5, active = true }) => {
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);

    if (!active) return <>{children}</>;

    const x = Math.sin(frame * 0.5) * intensity;
    const y = Math.cos(frame * 0.7) * intensity * 0.5;

    return (
        <div style={{ transform: `translate(${x}px, ${y}px)` }}>
            {children}
        </div>
    );
};

// Pulse Animation
export const Pulse: React.FC<{
    children: React.ReactNode;
    speed?: number;
    intensity?: number;
}> = ({ children, speed = 2, intensity = 0.05 }) => {
    const rawFrame = useCurrentFrame();
    const frame = getScaledFrame(rawFrame);
    const scale = 1 + Math.sin((frame / fps) * speed * Math.PI * 2) * intensity;

    return (
        <div style={{ transform: `scale(${scale})` }}>
            {children}
        </div>
    );
};
