import React from "react";
import { Series } from "remotion";
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
    Scene10CTA
} from "./scenes";
import { SCENE_DURATIONS, VIDEO_CONFIG } from "./config";

export const VibePromo: React.FC = () => {
    return (
        <Series>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene01Hook * VIDEO_CONFIG.FPS}>
                <Scene01Hook />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene02Question * VIDEO_CONFIG.FPS}>
                <Scene02Question />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene03Problem * VIDEO_CONFIG.FPS}>
                <Scene03Problem />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene04RealStory * VIDEO_CONFIG.FPS}>
                <Scene04RealStory />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene05Nightmare * VIDEO_CONFIG.FPS}>
                <Scene05Nightmare />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene06Damage * VIDEO_CONFIG.FPS}>
                <Scene06Damage />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene07Solution * VIDEO_CONFIG.FPS}>
                <Scene07Solution />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene08Features * VIDEO_CONFIG.FPS}>
                <Scene08Features />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene09Output * VIDEO_CONFIG.FPS}>
                <Scene09Output />
            </Series.Sequence>
            <Series.Sequence durationInFrames={SCENE_DURATIONS.scene10CTA * VIDEO_CONFIG.FPS}>
                <Scene10CTA />
            </Series.Sequence>
        </Series>
    );
};
