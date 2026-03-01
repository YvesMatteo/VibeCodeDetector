import { motion } from 'framer-motion';
import { Player } from '@remotion/player';
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
} from '../remotion/scenes';
import { SCENE_DURATIONS, VIDEO_CONFIG } from '../remotion/config';

// Wrapper for Remotion Player
const RemotionPlayer = ({ component, durationInFrames }: { component: React.FC<any>, durationInFrames: number }) => (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[9/16] w-full max-h-[600px] mx-auto bg-black">
        <Player
            component={component}
            durationInFrames={durationInFrames}
            fps={VIDEO_CONFIG.FPS}
            compositionWidth={VIDEO_CONFIG.WIDTH}
            compositionHeight={VIDEO_CONFIG.HEIGHT}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay
            loop
        />
    </div>
);

const SCENE_DATA = [
    {
        title: "The Vibe Code",
        text: "You just vibecoded your app in Replit, Lovable, or Cursor. It works. It looks good. You’re ready to ship.",
        color: "text-blue-400",
        Component: Scene01Hook,
        duration: SCENE_DURATIONS.scene01Hook * VIDEO_CONFIG.FPS
    },
    {
        title: "The Uncomfortable Question",
        text: "But... did you check your security? Or did you just trust that the AI 'kinda handled it'?",
        color: "text-yellow-400",
        Component: Scene02Question,
        duration: SCENE_DURATIONS.scene02Question * VIDEO_CONFIG.FPS
    },
    {
        title: "The Hidden Problem",
        text: "Most vibecoded apps ship with dangerous mistakes. Leaked keys, open DBs, and debug routes left live.",
        color: "text-red-400",
        Component: Scene03Problem,
        duration: SCENE_DURATIONS.scene03Problem * VIDEO_CONFIG.FPS
    },
    {
        title: "A Real Story",
        text: "It happens everyday. You're focused on shipping, not securing.",
        color: "text-orange-400",
        Component: Scene04RealStory,
        duration: SCENE_DURATIONS.scene04RealStory * VIDEO_CONFIG.FPS
    },
    {
        title: "The Nightmare Scenario",
        text: "You post your big launch tweet. Then someone DMs you: 'Hey, I can see all your users’ data.'",
        color: "text-red-500",
        Component: Scene05Nightmare,
        duration: SCENE_DURATIONS.scene05Nightmare * VIDEO_CONFIG.FPS
    },
    {
        title: "The Damage",
        text: "Brand? Damaged. Startup? Maybe over. Credit Card? Drained. All because of one missed vulnerability.",
        color: "text-red-600",
        Component: Scene06Damage,
        duration: SCENE_DURATIONS.scene06Damage * VIDEO_CONFIG.FPS
    },
    {
        title: "The Solution: CheckVibe",
        text: "It doesn't have to be like that. Meet CheckVibe. Built for vibecoded startups.",
        color: "text-emerald-400",
        Component: Scene07Solution,
        duration: SCENE_DURATIONS.scene07Solution * VIDEO_CONFIG.FPS
    },
    {
        title: "Complete Features",
        text: "We scan your app for everything: Leaked API keys, open databases, unprotected routes, and AI-shipped vulnerabilities.",
        color: "text-emerald-300",
        Component: Scene08Features,
        duration: SCENE_DURATIONS.scene08Features * VIDEO_CONFIG.FPS
    },
    {
        title: "Clear Output",
        text: "We explain what's wrong in plain English. No security jargon. Just the fix.",
        color: "text-blue-300",
        Component: Scene09Output,
        duration: SCENE_DURATIONS.scene09Output * VIDEO_CONFIG.FPS
    },
    {
        title: "Call to Action",
        text: "Vibe coding is fast. Vibe hacking is faster. Don't ship without a CheckVibe.",
        color: "text-indigo-400",
        Component: Scene10CTA,
        duration: SCENE_DURATIONS.scene10CTA * VIDEO_CONFIG.FPS
    }
];

export default function StoryBoard() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-32">

                {/* Header */}
                <div className="text-center space-y-4 mb-20">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        The VibeCheck Story
                    </h1>
                    <p className="text-zinc-400 max-w-lg mx-auto">
                        Why automated security scanning is critical for the AI-coding era.
                    </p>
                </div>

                {SCENE_DATA.map((scene, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-20%" }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col lg:flex-row items-center gap-12"
                    >
                        {/* Text Side */}
                        <div className={`flex-1 space-y-4 max-w-lg ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                            <div className={`text-xl font-bold ${scene.color}`}>{scene.title}</div>
                            <p className="text-2xl font-light leading-relaxed text-zinc-100">
                                {scene.text}
                            </p>
                        </div>

                        {/* Animation Side */}
                        <div className="flex-1 w-full flex justify-center">
                            <RemotionPlayer component={scene.Component} durationInFrames={scene.duration} />
                        </div>
                    </motion.div>
                ))}

                <div className="h-40" /> {/* Spacer */}
            </div>
        </div>
    );
}
