import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SPRING_CONFIG } from "../../config";
import { SlideIn, ScaleIn, GlowText, ConsequenceIcons } from "../animations";
import { IncidentImpactAnimation } from "../animations/IncidentImpactAnimation";

const { fontFamily } = loadFont();

const consequences = [
    { label: "Your brand?", result: "Damaged.", type: "brand" },
    { label: "Your users' trust?", result: "Gone.", type: "trust" },
    { label: "Your startup?", result: "Over.", type: "startup" },
    { label: "Your Credit Card?", result: "Drained.", type: "money" },
];

// Scene 6: The Damage - Consequences
export const Scene06Damage: React.FC = () => {
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'center', maxWidth: 900 }}>
                {consequences.map((item, i) => (
                    <ScaleIn key={i} delay={0.5 + i * 0.3}>
                        <div className="flex flex-col items-center gap-4 bg-zinc-800/50 p-6 rounded-2xl border border-red-900/30 w-64">
                            <ConsequenceIcons type={item.type as any} />
                            <div className="text-xl text-zinc-400 font-medium">{item.label}</div>
                            <div className="text-2xl text-red-500 font-bold">{item.result}</div>
                        </div>
                    </ScaleIn>
                ))}
            </div>
        </AbsoluteFill>
    );
};

export default Scene06Damage;
