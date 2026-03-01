import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Scenes from './scenes';

const SCENE_LIST = [
    { id: 1, component: Scenes.Scene01Opener, title: '"AI startup is cooked" opener' },
    { id: 2, component: Scenes.Scene02VibecodeToProduction, title: "Vibecoding to production" },
    { id: 3, component: Scenes.Scene03InvisibleVulnerabilities, title: "Invisible vulnerabilities shipped" },
    { id: 4, component: Scenes.Scene04WeakCORS, title: "Weak CORS example" },
    { id: 5, component: Scenes.Scene05MissingHeaders, title: "Missing headers example" },
    { id: 6, component: Scenes.Scene06AuthIssues, title: "Auth issues example" },
    { id: 7, component: Scenes.Scene07LeakedAPIKeys, title: "Leaked API keys example" },
    { id: 8, component: Scenes.Scene08ShipFast, title: '"Ship fast → miss stuff" beat' },
    { id: 9, component: Scenes.Scene09CreditCard, title: "Drain your credit card" },
    { id: 10, component: Scenes.Scene10AbuseAPIs, title: "Abuse your APIs" },
    { id: 11, component: Scenes.Scene11StealData, title: "Steal your users' data" },
    { id: 12, component: Scenes.Scene12ScanStart, title: "CheckVibe scan start" },
    { id: 13, component: Scenes.Scene13ScanInProgress, title: "Scan in progress" },
    { id: 14, component: Scenes.Scene14FindingsList, title: "Exact findings list" },
    { id: 15, component: Scenes.Scene15ClearScore, title: "Clear score" },
    { id: 16, component: Scenes.Scene16FixPrompt, title: "Copy-paste AI fix prompt" },
    { id: 17, component: Scenes.Scene17BestAppBadSecurity, title: "Best app, bad security" },
    { id: 18, component: Scenes.Scene18CTA, title: "Call to action – CheckVibe.dev" },
];

export default function ScenariosGrid() {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Focus view for a single animation
    if (selectedId !== null) {
        const selectedScene = SCENE_LIST.find(s => s.id === selectedId);
        if (!selectedScene) return null;
        const Component = selectedScene.component;

        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Navigation */}
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                        <button
                            onClick={() => setSelectedId(null)}
                            className="text-[#a1a1a6] hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] px-4 py-2 rounded-full text-sm font-medium transition-all border border-[#48484a]"
                        >
                            ← Back to Grid
                        </button>
                        <span className="text-[#a1a1a6] text-sm font-medium">
                            {selectedScene.id} / {SCENE_LIST.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedId(Math.max(1, selectedId - 1))}
                                disabled={selectedId <= 1}
                                className="text-[#a1a1a6] hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] px-3 py-2 rounded-full text-sm font-medium transition-all border border-[#48484a] disabled:opacity-30"
                            >
                                ‹ Prev
                            </button>
                            <button
                                onClick={() => setSelectedId(Math.min(SCENE_LIST.length, selectedId + 1))}
                                disabled={selectedId >= SCENE_LIST.length}
                                className="text-[#a1a1a6] hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] px-3 py-2 rounded-full text-sm font-medium transition-all border border-[#48484a] disabled:opacity-30"
                            >
                                Next ›
                            </button>
                        </div>
                    </div>

                    <div className="w-full max-w-3xl aspect-video bg-[#0a0a0a] rounded-2xl border border-[#48484a] overflow-hidden shadow-2xl">
                        <Component key={selectedId} />
                    </div>

                    <div className="absolute bottom-6 text-center">
                        <span className="text-sm text-[#a1a1a6]">{selectedScene.title}</span>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <div className="min-h-screen bg-black text-[#f5f5f7] font-sans p-8 md:p-12">
            <header className="mb-12 text-center">
                <motion.h1
                    className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#0a84ff] to-[#30d158] bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    CheckVibe Animations
                </motion.h1>
                <motion.p
                    className="text-[#a1a1a6] text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    18 promo scenes • Apple UI Kit styling
                </motion.p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {SCENE_LIST.map((scene) => (
                    <motion.div
                        key={scene.id}
                        className="group relative aspect-video bg-[#1c1c1e] rounded-2xl border border-[#48484a]/50 overflow-hidden hover:border-[#0a84ff]/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer"
                        onClick={() => setSelectedId(scene.id)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: scene.id * 0.05 }}
                    >
                        {/* Render Component Scaled Down */}
                        <div className="absolute inset-0 pointer-events-none transform scale-50 origin-top-left w-[200%] h-[200%]">
                            <scene.component />
                        </div>

                        {/* Overlay & Label */}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-3 border-t border-[#48484a]/30">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#0a84ff] font-bold">{String(scene.id).padStart(2, '0')}</span>
                                <span className="text-xs font-medium text-[#f5f5f7] group-hover:text-white truncate">
                                    {scene.title}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
