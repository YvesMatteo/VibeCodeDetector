import { Composition } from "remotion";
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
import { VIDEO_CONFIG, SCENE_DURATIONS } from "./config";
import { VibePromo } from "./VibePromo";
import "./index.css";

// Calculate total duration in frames
const totalDurationInFrames = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) * VIDEO_CONFIG.FPS;



export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="VibePromo"
                component={VibePromo}
                durationInFrames={totalDurationInFrames}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />
            {/* Scene 01: Hook */}
            <Composition
                id="Scene01Hook"
                component={Scene01Hook}
                durationInFrames={SCENE_DURATIONS.scene01Hook * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 02: Question */}
            <Composition
                id="Scene02Question"
                component={Scene02Question}
                durationInFrames={SCENE_DURATIONS.scene02Question * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 03: Problem */}
            <Composition
                id="Scene03Problem"
                component={Scene03Problem}
                durationInFrames={SCENE_DURATIONS.scene03Problem * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 04: Real Story */}
            <Composition
                id="Scene04RealStory"
                component={Scene04RealStory}
                durationInFrames={SCENE_DURATIONS.scene04RealStory * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 05: Nightmare */}
            <Composition
                id="Scene05Nightmare"
                component={Scene05Nightmare}
                durationInFrames={SCENE_DURATIONS.scene05Nightmare * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 06: Damage */}
            <Composition
                id="Scene06Damage"
                component={Scene06Damage}
                durationInFrames={SCENE_DURATIONS.scene06Damage * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 07: Solution */}
            <Composition
                id="Scene07Solution"
                component={Scene07Solution}
                durationInFrames={SCENE_DURATIONS.scene07Solution * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 08: Features */}
            <Composition
                id="Scene08Features"
                component={Scene08Features}
                durationInFrames={SCENE_DURATIONS.scene08Features * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 09: Output */}
            <Composition
                id="Scene09Output"
                component={Scene09Output}
                durationInFrames={SCENE_DURATIONS.scene09Output * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            {/* Scene 10: CTA */}
            <Composition
                id="Scene10CTA"
                component={Scene10CTA}
                durationInFrames={SCENE_DURATIONS.scene10CTA * VIDEO_CONFIG.FPS}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />
        </>
    );
};
