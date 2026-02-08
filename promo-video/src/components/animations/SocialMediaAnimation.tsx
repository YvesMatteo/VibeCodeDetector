import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { motion } from 'framer-motion';

interface SocialMediaAnimationProps {
    type?: 'disaster' | 'success';
    username?: string;
    handle?: string;
    content?: React.ReactNode;
    showDm?: boolean;
}

export const SocialMediaAnimation: React.FC<SocialMediaAnimationProps> = ({
    type = 'disaster',
    username = 'Moltbook App',
    handle = '@moltbook_official',
    content = <>We are thrilled to announce our Series A raise of $15M! 🚀<br /><br />Join the future of Molting. #growth #startup</>,
    showDm = false
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const triggerFrame = fps * 1.5; // Event triggers at 1.5s
    const isTriggered = frame > triggerFrame;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Tweet Card */}
            <div className="w-[600px] bg-white text-zinc-900 rounded-xl p-8 shadow-2xl relative z-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full ${type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <div>
                        <div className="font-bold text-lg">{username}</div>
                        <div className="text-zinc-500">{handle}</div>
                    </div>
                    <div className="ml-auto text-zinc-400">2h ago</div>
                </div>

                {/* Content */}
                <div className="text-2xl mb-6">
                    {content}
                </div>

                {/* Engagement Stats - Animated */}
                <div className="flex gap-8 text-zinc-500 font-medium text-lg border-t border-zinc-100 pt-4">
                    <div className="flex items-center gap-2">
                        <span>❤️</span>
                        <span>{isTriggered && type === 'disaster' ? "10.5K" : Math.min(1500, Math.floor(frame * (type === 'success' ? 20 : 10)))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>🔁</span>
                        <span>{isTriggered && type === 'disaster' ? "5.2K" : Math.min(500, Math.floor(frame * (type === 'success' ? 5 : 3)))}</span>
                    </div>
                </div>
            </div>

            {/* Disaster Overlay */}
            {isTriggered && type === 'disaster' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                    {/* Darken/Red Overlay */}
                    <div className="absolute inset-0 bg-red-900/20 backdrop-blur-[2px] animate-pulse" />

                    {/* Stamp */}
                    <motion.div
                        initial={{ scale: 2, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: -15 }}
                        transition={{ type: 'spring', damping: 10 }}
                        className="bg-red-600 text-white font-black text-6xl px-8 py-4 border-4 border-white shadow-xl transform -rotate-12 z-30"
                    >
                        DATABASE LEAKED
                    </motion.div>

                    {/* Replies Flooding */}
                    <div className="absolute bottom-10 right-10 bg-zinc-800 text-white p-4 rounded-lg shadow-xl border border-red-500 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-red-500 rounded-full" />
                            <span className="font-bold text-sm">AngryUser123</span>
                        </div>
                        <div className="text-sm">Why is my home address on pastebin??? Explain!!! 🤬</div>
                    </div>

                    <div className="absolute top-10 left-10 bg-zinc-800 text-white p-4 rounded-lg shadow-xl border border-red-500 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-yellow-500 rounded-full" />
                            <span className="font-bold text-sm">SecurityResearcher</span>
                        </div>
                        <div className="text-sm">Found an open elasticsearch instance. DM me ASAP.</div>
                    </div>
                </div>
            )}

            {/* Success/DM Overlay */}
            {showDm && isTriggered && (
                <div className="absolute -bottom-20 -right-20 z-30">
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-zinc-800 text-white p-6 rounded-2xl shadow-2xl border border-zinc-700 max-w-md"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-purple-500 rounded-full" />
                            <span className="font-bold">Anon User</span>
                            <span className="text-xs text-zinc-400 ml-auto">Just now</span>
                        </div>
                        <div className="text-lg italic text-zinc-300">
                            "Hey, I found a way to see everyone's data. You might want to fix this..."
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
