import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "../../config";
import { SlideIn, FadeIn, GlowText, ScannerRow } from "../animations";
import { NetworkTrafficAnimation } from "../animations/NetworkTrafficAnimation";

const { fontFamily } = loadFont();

const features = [
    { icon: "🔑", text: "Leaked API keys" },
    { icon: "🗄️", text: "Open and misconfigured databases" },
    { icon: "🔓", text: "Unprotected routes and missing auth" },
    { icon: "🤖", text: "Vulnerabilities AI quietly ships into production" },
];

// Scene 8: Features Showcase - What CheckVibe scans
export const Scene08Features: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: 60,
                fontFamily,
            }}
        >
            <div className="absolute inset-0 z-0 opacity-30">
                <NetworkTrafficAnimation />
            </div>

            <div className="z-10 relative flex flex-col items-center">
                <FadeIn delay={0.2}>
                    <div
                        style={{
                            fontSize: 36,
                            color: COLORS.textSecondary,
                            textAlign: "center",
                            marginBottom: 20,
                        }}
                    >
                        You drop in your app, and we do the scary part for you.
                    </div>
                </FadeIn>

                <SlideIn direction="bottom" delay={0.8}>
                    <div
                        style={{
                            fontSize: 44,
                            fontWeight: 700,
                            color: COLORS.textPrimary,
                            textAlign: "center",
                            marginBottom: 50,
                        }}
                    >
                        We scan your app for:
                    </div>
                </SlideIn>

                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {features.map((feature, index) => (
                        <div key={index} style={{ marginBottom: 20 }}>
                            <ScannerRow delay={1.2 + index * 0.4}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 24,
                                        fontSize: 28,
                                        fontWeight: 600,
                                    }}
                                >
                                    <span style={{ fontSize: 40 }}>{feature.icon}</span>
                                    <span>{feature.text}</span>
                                </div>
                            </ScannerRow>
                        </div>
                    ))}
                </div>
            </div>
        </AbsoluteFill>
    );
};

export default Scene08Features;
