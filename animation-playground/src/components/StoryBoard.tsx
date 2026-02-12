import { motion } from 'framer-motion';
import VibeCodingAnimation from './VibeCodingAnimation';
import VulnerabilityRevealAnimation from './VulnerabilityRevealAnimation';
import IncidentImpactAnimation from './IncidentImpactAnimation';
import RemediationAnimation from './RemediationAnimation';
import NetworkTrafficAnimation from './NetworkTrafficAnimation';

// Define scene data with component functions, not instances
const SCENE_DATA = [
    {
        title: "The Vibe Code",
        text: "You just vibecoded your app in Replit, Lovable, or Cursor. It works. It looks good. You’re ready to ship.",
        color: "text-blue-400",
        Component: VibeCodingAnimation
    },
    {
        title: "The Uncomfortable Truth",
        text: "But… did you check your security? Or did you just trust that the AI 'kinda handled it'? Most vibecoded apps ship with possible leaked API keys and open databases.",
        color: "text-yellow-400",
        Component: VulnerabilityRevealAnimation
    },
    {
        title: "The Nightmare",
        text: "You post your big launch tweet. Then someone DMs you: 'Hey, I can see all your users’ data.' Your brand? Damaged. Your startup? Maybe over.",
        color: "text-red-500",
        Component: IncidentImpactAnimation
    },
    {
        title: "The Solution: CheckVibe",
        text: "CheckVibe scans your app for leaked keys, open DBs, and missing auth. We tell you what's wrong and exactly how to fix it.",
        color: "text-emerald-400",
        Component: RemediationAnimation
    },
    {
        title: "Total Protection",
        text: "Don’t get hacked for your vibecoded startup. Protect your users. Protect your idea. Protect your money.",
        color: "text-indigo-400",
        Component: NetworkTrafficAnimation
    }
];

export default function StoryBoard() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans py-20 px-4">
            <div className="max-w-4xl mx-auto space-y-32">

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
                        className="flex flex-col md:flex-row items-center gap-12"
                    >
                        {/* Text Side (Alternating) */}
                        <div className={`flex-1 space-y-4 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                            <div className={`text-xl font-bold ${scene.color}`}>{scene.title}</div>
                            <p className="text-2xl font-light leading-relaxed text-zinc-100">
                                {scene.text}
                            </p>
                        </div>

                        {/* Animation Side */}
                        <div className="flex-1 w-full">
                            <div className="bg-zinc-900/50 p-2 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
                                <scene.Component />
                            </div>
                        </div>
                    </motion.div>
                ))}

                <div className="h-40" /> {/* Spacer */}
            </div>
        </div>
    );
}
