import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../config";
import { SlideIn, GlowText } from "../components/animations";
import { ScanItem, RadarScanner } from "../components/premium";



export const Scene08Features: React.FC = () => {


    const features = [
        { icon: "🔑", text: "Leaked API keys", delay: 1.5 },
        { icon: "🗄️", text: "Open & misconfigured databases", delay: 2 },
        { icon: "🚪", text: "Unprotected routes & missing auth", delay: 2.5 },
        { icon: "🤖", text: "AI-shipped vulnerabilities", delay: 3 },
    ];

    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                gap: 30,
                backgroundColor: COLORS.background,
            }}
        >
            {/* Title */}
            <SlideIn direction="bottom" delay={0.2}>
                <div style={{ fontSize: 40, fontWeight: 600, color: COLORS.textPrimary, textAlign: "center" }}>
                    We scan your app for <GlowText color={COLORS.primary}>everything</GlowText>
                </div>
            </SlideIn>

            {/* Radar Scanner */}
            <div style={{ marginTop: 10, marginBottom: 20 }}>
                <RadarScanner
                    size={240}
                    pings={[
                        { x: -60, y: -40, delay: 0.5 },
                        { x: 50, y: 30, delay: 1.2 },
                        { x: -30, y: 60, delay: 2 },
                    ]}
                />
            </div>

            {/* Feature List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 700 }}>
                {features.map((feature, index) => (
                    <ScanItem
                        key={index}
                        icon={feature.icon}
                        text={feature.text}
                        delay={feature.delay}
                        status="complete"
                    />
                ))}
            </div>
        </AbsoluteFill>
    );
};
