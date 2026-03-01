import React from "react";
import { Composition } from "remotion";
import { CheckVibePromo } from "./Composition";
import { VIDEO_CONFIG } from "./config";
import { ThemeProvider } from "./ThemeContext";
import "./style.css";

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="CheckVibePromo"
                component={CheckVibePromo}
                durationInFrames={VIDEO_CONFIG.DURATION_IN_FRAMES}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />

            <Composition
                id="CheckVibePromoLight"
                component={() => (
                    <ThemeProvider theme="light">
                        <CheckVibePromo />
                    </ThemeProvider>
                )}
                durationInFrames={VIDEO_CONFIG.DURATION_IN_FRAMES}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />
            <Composition
                id="CheckVibePromoIOS"
                component={() => (
                    <ThemeProvider theme="dark" emojiStyle="apple">
                        <CheckVibePromo />
                    </ThemeProvider>
                )}
                durationInFrames={VIDEO_CONFIG.DURATION_IN_FRAMES}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />
            <Composition
                id="CheckVibePromoLightIOS"
                component={() => (
                    <ThemeProvider theme="light" emojiStyle="apple">
                        <CheckVibePromo />
                    </ThemeProvider>
                )}
                durationInFrames={VIDEO_CONFIG.DURATION_IN_FRAMES}
                fps={VIDEO_CONFIG.FPS}
                width={VIDEO_CONFIG.WIDTH}
                height={VIDEO_CONFIG.HEIGHT}
            />
        </>
    );
};
