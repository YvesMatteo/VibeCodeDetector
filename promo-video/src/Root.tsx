import { Composition } from "remotion";
import { CheckVibePromo } from "./Composition";

// 9:16 aspect ratio for vertical video (TikTok, Reels, Stories)
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
// ~2 minutes video
const DURATION_IN_FRAMES = 120 * FPS; // 3600 frames = 2 minutes

export const RemotionRoot: React.FC = () => {
    return (
        <Composition
            id="CheckVibePromo"
            component={CheckVibePromo}
            durationInFrames={DURATION_IN_FRAMES}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
        />
    );
};
