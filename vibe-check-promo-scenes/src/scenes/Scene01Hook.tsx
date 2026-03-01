import React from "react";
import { AbsoluteFill, staticFile, Img } from "remotion";
import { COLORS } from "../config";
import { SlideIn, FadeIn, GlowText, ScaleIn } from "../components/animations";



export const Scene01Hook: React.FC = () => {


    return (
        <AbsoluteFill
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 60,
                gap: 60,
                backgroundColor: COLORS.background, // Ensure background color
            }}
        >
            {/* Main Hook Text */}
            <div style={{ textAlign: "center", maxWidth: 900 }}>
                <SlideIn direction="bottom" delay={0.3}>
                    <div style={{ fontSize: 48, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.3 }}>
                        You just <GlowText color={COLORS.primary}>vibecoded</GlowText> your app
                    </div>
                </SlideIn>

                <SlideIn direction="bottom" delay={0.6}>
                    <div style={{ fontSize: 44, fontWeight: 500, color: COLORS.textSecondary, marginTop: 20 }}>
                        in Replit, Lovable, or Cursor
                    </div>
                </SlideIn>
            </div>

            {/* Platform Icons - Using actual logos */}
            <div style={{ display: "flex", gap: 60, marginTop: 20, alignItems: "center" }}>
                <ScaleIn delay={1.2}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <Img
                            src={staticFile("replit-logo.webp")}
                            style={{ width: 80, height: 80, objectFit: "contain" }}
                        />
                        <span style={{ color: "#F26207", fontSize: 20, fontWeight: 600 }}>Replit</span>
                    </div>
                </ScaleIn>
                <ScaleIn delay={1.4}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <Img
                            src={staticFile("lovable-logo.avif")}
                            style={{ width: 80, height: 80, objectFit: "contain" }}
                        />
                        <span style={{ color: "#FF4A8D", fontSize: 20, fontWeight: 600 }}>Lovable</span>
                    </div>
                </ScaleIn>
                <ScaleIn delay={1.6}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <Img
                            src={staticFile("cursor-logo.webp")}
                            style={{ width: 80, height: 80, objectFit: "contain" }}
                        />
                        <span style={{ color: "#3799FF", fontSize: 20, fontWeight: 600 }}>Cursor</span>
                    </div>
                </ScaleIn>
            </div>

            {/* Success States */}
            <SlideIn direction="bottom" delay={2.2}>
                <div style={{ display: "flex", gap: 40, marginTop: 30 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "16px 28px",
                            background: "rgba(16, 185, 129, 0.1)",
                            border: `1px solid ${COLORS.success}40`,
                            borderRadius: 100,
                        }}
                    >
                        <span style={{ fontSize: 28 }}>✅</span>
                        <span style={{ color: COLORS.success, fontSize: 22, fontWeight: 600 }}>It works</span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "16px 28px",
                            background: "rgba(16, 185, 129, 0.1)",
                            border: `1px solid ${COLORS.success}40`,
                            borderRadius: 100,
                        }}
                    >
                        <span style={{ fontSize: 28 }}>✨</span>
                        <span style={{ color: COLORS.success, fontSize: 22, fontWeight: 600 }}>It looks good</span>
                    </div>
                </div>
            </SlideIn>

            {/* Ready to Ship */}
            <FadeIn delay={3}>
                <div
                    style={{
                        fontSize: 56,
                        fontWeight: 700,
                        color: COLORS.primary,
                        textShadow: `0 0 40px ${COLORS.primaryGlow}`,
                        marginTop: 20,
                    }}
                >
                    You're ready to ship. 🚀
                </div>
            </FadeIn>
        </AbsoluteFill>
    );
};
