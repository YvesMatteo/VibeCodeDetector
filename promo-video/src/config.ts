// Video configuration constants
export const VIDEO_CONFIG = {
    WIDTH: 1080,
    HEIGHT: 1920,
    FPS: 30,
};

// Color palette - premium dark theme with electric blue accents
export const COLORS = {
    // Primary colors
    primary: "#00D4FF",
    primaryGlow: "#00D4FF80",

    // Semantic colors
    danger: "#FF4444",
    dangerGlow: "#FF444480",
    warning: "#FFB800",
    warningGlow: "#FFB80080",
    success: "#00FF88",
    successGlow: "#00FF8880",

    // Neutral colors
    background: "#0a0a0f",
    backgroundLight: "#12121a",
    surface: "#1a1a24",
    surfaceLight: "#252532",

    // Text colors
    textPrimary: "#FFFFFF",
    textSecondary: "#A0A0B0",
    textMuted: "#606070",
};

// Scene durations in seconds (converted to frames later)
export const SCENE_DURATIONS = {
    scene01Hook: 8,
    scene02Question: 4,
    scene03Problem: 10,
    scene04RealStory: 12,
    scene05Nightmare: 9,
    scene06Damage: 9,
    scene07Solution: 7,
    scene08Features: 12,
    scene09Output: 9,
    scene10CTA: 10,
};

// Transition duration in frames
export const TRANSITION_DURATION = 20;

// Spring configurations
export const SPRING_CONFIG = {
    smooth: { damping: 200 },
    snappy: { damping: 20, stiffness: 200 },
    bouncy: { damping: 8 },
    heavy: { damping: 15, stiffness: 80, mass: 2 },
};
