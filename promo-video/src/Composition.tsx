import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { Background } from "./components/common";
import {
    Scene01Hook,
    Scene02Question,
    Scene03Problem,
    Scene04RealStory,
    Scene05Nightmare,
    Scene06Damage,
    Scene07Solution,
    Scene08Features,
    Scene09Output,
    Scene10CTA,
} from "./components/scenes";
import { VIDEO_CONFIG, SCENE_DURATIONS, TRANSITION_DURATION } from "./config";

export const CheckVibePromo: React.FC = () => {
    // Use FPS from config instead of useVideoConfig to avoid context issues
    const fps = VIDEO_CONFIG.FPS;

    // Convert seconds to frames
    const toFrames = (seconds: number) => Math.round(seconds * fps);

    return (
        <AbsoluteFill>
            {/* Animated background */}
            <Background />

            {/* Scene transitions */}
            <TransitionSeries>
                {/* Scene 1: Hook */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene01Hook)}>
                    <Scene01Hook />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 2: Question */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene02Question)}>
                    <Scene02Question />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 3: Problem */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene03Problem)}>
                    <Scene03Problem />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-right" })}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 4: Real Story */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene04RealStory)}>
                    <Scene04RealStory />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 5: Nightmare */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene05Nightmare)}>
                    <Scene05Nightmare />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-left" })}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 6: Damage */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene06Damage)}>
                    <Scene06Damage />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 7: Solution */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene07Solution)}>
                    <Scene07Solution />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-bottom" })}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 8: Features */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene08Features)}>
                    <Scene08Features />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 9: Output */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene09Output)}>
                    <Scene09Output />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
                />

                {/* Scene 10: CTA */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_DURATIONS.scene10CTA)}>
                    <Scene10CTA />
                </TransitionSeries.Sequence>
            </TransitionSeries>
        </AbsoluteFill>
    );
};

export default CheckVibePromo;
