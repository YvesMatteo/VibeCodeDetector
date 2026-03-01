// Video Configuration - 9:16 Vertical Format (TikTok, Reels, Stories)
export const VIDEO_CONFIG = {
    WIDTH: 1080,
    HEIGHT: 1920,
    FPS: 30,
    // 60 seconds of actual video
    DURATION_IN_FRAMES: 1900, // Extended to accommodate longer CTA
    // Original video was 99.5 seconds - this scales time so animations
    // progress 1.605x faster, reaching the same end state in 60s + 2s transition overlap (4 transitions)
    TIME_SCALE: 1.605,
} as const;

// Premium Color Palette
export const COLORS = {
    // Primary Brand
    primary: "#37A8FF",
    primaryGlow: "rgba(55, 168, 255, 0.5)",

    // States
    success: "#10B981",
    successGlow: "rgba(16, 185, 129, 0.4)",
    danger: "#EF4444",
    dangerGlow: "rgba(239, 68, 68, 0.5)",
    warning: "#F59E0B",
    warningGlow: "rgba(245, 158, 11, 0.4)",

    // Text
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",

    // Backgrounds
    bgDark: "#09090B",
    bgCard: "#18181B",
    bgCardHover: "#27272A",
    bgOverlay: "rgba(0, 0, 0, 0.8)",

    // Accents
    border: "rgba(255, 255, 255, 0.1)",
    borderHover: "rgba(255, 255, 255, 0.2)",
} as const;

export const COLORS_LIGHT = {
    // Primary Brand - Darker blue for contrast on white
    primary: "#2563EB", // Blue-600
    primaryGlow: "rgba(37, 99, 235, 0.3)",

    // States
    success: "#059669", // Emerald-600
    successGlow: "rgba(5, 150, 105, 0.3)",
    danger: "#DC2626", // Red-600
    dangerGlow: "rgba(220, 38, 38, 0.3)",
    warning: "#D97706", // Amber-600
    warningGlow: "rgba(217, 119, 6, 0.3)",

    // Text
    textPrimary: "#18181B", // Zinc-950
    textSecondary: "#52525B", // Zinc-600
    textMuted: "#A1A1AA", // Zinc-400

    // Backgrounds
    bgDark: "#FFFFFF", // White
    bgCard: "#F4F4F5", // Zinc-100
    bgCardHover: "#E4E4E7", // Zinc-200
    bgOverlay: "rgba(255, 255, 255, 0.8)",

    // Accents
    border: "rgba(0, 0, 0, 0.1)",
    borderHover: "rgba(0, 0, 0, 0.2)",
} as const;

// Spring Animation Configs
export const SPRING_CONFIG = {
    // Smooth and elegant
    smooth: {
        damping: 30,
        mass: 1,
        stiffness: 100,
    },
    // Snappy UI response
    snappy: {
        damping: 25,
        mass: 0.8,
        stiffness: 200,
    },
    // Bouncy entrance
    bouncy: {
        damping: 12,
        mass: 1,
        stiffness: 150,
    },
    // Heavy impact
    impact: {
        damping: 20,
        mass: 1.5,
        stiffness: 300,
    },
} as const;

// Scene Timing - ORIGINAL TIMINGS (98.5 seconds of content, time-scaled to 60s playback)
// These are "logical" times - they get scaled by TIME_SCALE for actual frame calculation
export const SCENE_TIMING = {
    // Act 1: The Hook (0-15s logical)
    SCENE_01_HOOK: { start: 0, duration: 5 },
    SCENE_02_SUCCESS: { start: 5, duration: 5 },
    SCENE_03_QUESTION: { start: 10, duration: 5 },

    // Act 2: The Fear (15-55.8s logical)
    SCENE_04_TRUST: { start: 15, duration: 5 },
    SCENE_05_TRUTH: { start: 20, duration: 7 },
    SCENE_06_LEAKED_KEYS: { start: 27, duration: 5 },
    SCENE_07_OPEN_DB: { start: 32, duration: 5.5 },
    SCENE_08_ROUTES: { start: 37.5, duration: 4.6 },
    SCENE_09_MOLTBOOK: { start: 42.1, duration: 6.8 },
    SCENE_10_NIGHTMARE: { start: 48.9, duration: 7 },

    // Act 3: The Consequences (55.9-67.9s logical)
    SCENE_11_DAMAGE: { start: 55.9, duration: 12 },

    // Act 4: The Solution (67.9-86.9s logical)
    SCENE_12_RELIEF: { start: 67.9, duration: 4 },
    SCENE_13_CHECKVIBE: { start: 71.9, duration: 6 },
    SCENE_14_HOW_IT_WORKS: { start: 77.9, duration: 9 },

    // Act 5: The Value (86.9-96.2s logical)
    SCENE_15_PLAIN_ENGLISH: { start: 86.9, duration: 4.3 },
    SCENE_16_AI_READY: { start: 91.2, duration: 5 },

    // Act 6: CTA (96.2-101.2s logical)
    SCENE_17_CTA: { start: 96.2, duration: 5.0 },
} as const;

// Helper to convert logical seconds to actual frames (applies time scaling)
export const toFrames = (seconds: number): number =>
    Math.round((seconds / VIDEO_CONFIG.TIME_SCALE) * VIDEO_CONFIG.FPS);

// Helper to get scaled frame (for use in animations)
export const getScaledFrame = (frame: number): number =>
    frame * VIDEO_CONFIG.TIME_SCALE;

export const FONT_FAMILY = "Inter, sans-serif";

// Re-export useCurrentFrame as useScaledFrame with scaling applied
// Scenes should import { useScaledFrame } from "../../config" instead of useCurrentFrame
import { useCurrentFrame as useRawCurrentFrame } from "remotion";
export const useScaledFrame = (): number => getScaledFrame(useRawCurrentFrame());
