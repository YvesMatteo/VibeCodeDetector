import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SCENE_TIMING, toFrames } from "./config";
import { useColors } from "./ThemeContext";
import {
    Scene01Hook,
    Scene02Success,
    Scene03Question,
    Scene04Trust,
    Scene05Truth,
    Scene06LeakedKeys,
    Scene07OpenDB,
    Scene08Routes,
    Scene09Moltbook,
    Scene10Nightmare,
    Scene11Damage,
    Scene12Relief,
    Scene13CheckVibe,
    Scene14HowItWorks,
    Scene15PlainEnglish,
    Scene16AIReady,
    Scene17CTA,
} from "./components/scenes";

export const CheckVibePromo: React.FC = () => {
    const COLORS = useColors();
    return (
        <AbsoluteFill style={{ backgroundColor: COLORS.bgDark }}>
            <TransitionSeries>
                {/* Act 1: The Hook */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_01_HOOK.duration)}>
                    <Scene01Hook />
                </TransitionSeries.Sequence>

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_02_SUCCESS.duration)}>
                    <Scene02Success />
                </TransitionSeries.Sequence>

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_03_QUESTION.duration)}>
                    <Scene03Question />
                </TransitionSeries.Sequence>

                {/* Act 2: The Fear */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_04_TRUST.duration)}>
                    <Scene04Trust />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: 10 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_05_TRUTH.duration)}>
                    <Scene05Truth />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-bottom" })}
                    timing={linearTiming({ durationInFrames: 15 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_06_LEAKED_KEYS.duration)}>
                    <Scene06LeakedKeys />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={wipe({ direction: "from-right" })}
                    timing={linearTiming({ durationInFrames: 15 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_07_OPEN_DB.duration)}>
                    <Scene07OpenDB />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-right" })}
                    timing={linearTiming({ durationInFrames: 15 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_08_ROUTES.duration)}>
                    <Scene08Routes />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: 10 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_09_MOLTBOOK.duration)}>
                    <Scene09Moltbook />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={wipe({ direction: "from-top" })}
                    timing={linearTiming({ durationInFrames: 20 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_10_NIGHTMARE.duration)}>
                    <Scene10Nightmare />
                </TransitionSeries.Sequence>

                {/* Act 3: Consequences */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_11_DAMAGE.duration)}>
                    <Scene11Damage />
                </TransitionSeries.Sequence>

                {/* Act 4: Solution */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_12_RELIEF.duration)}>
                    <Scene12Relief />
                </TransitionSeries.Sequence>

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_13_CHECKVIBE.duration)}>
                    <Scene13CheckVibe />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-bottom" })}
                    timing={linearTiming({ durationInFrames: 20 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_14_HOW_IT_WORKS.duration)}>
                    <Scene14HowItWorks />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={wipe({ direction: "from-left" })}
                    timing={linearTiming({ durationInFrames: 20 })}
                />

                {/* Act 5: Value */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_15_PLAIN_ENGLISH.duration)}>
                    <Scene15PlainEnglish />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={slide({ direction: "from-right" })}
                    timing={linearTiming({ durationInFrames: 15 })}
                />

                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_16_AI_READY.duration)}>
                    <Scene16AIReady />
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition
                    presentation={fade()}
                    timing={linearTiming({ durationInFrames: 15 })}
                />

                {/* Act 6: CTA */}
                <TransitionSeries.Sequence durationInFrames={toFrames(SCENE_TIMING.SCENE_17_CTA.duration)}>
                    <Scene17CTA />
                </TransitionSeries.Sequence>

            </TransitionSeries>
        </AbsoluteFill>
    );
};
