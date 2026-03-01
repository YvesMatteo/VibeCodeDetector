import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Scenarios from './scenarios';

const SCENARIO_LIST = [
    { id: 1, component: Scenarios.FounderVibecoding, title: "Founder Vibecoding" },
    { id: 2, component: Scenarios.HappyLaunchClick, title: "Happy Launch Click" },
    { id: 3, component: Scenarios.SecurityDoubtBeat, title: "Security Doubt Beat" },
    { id: 4, component: Scenarios.GlitchingPadlock, title: "Glitching Padlock" },
    { id: 5, component: Scenarios.LeakedApiKey, title: "Leaked API Key" },
    { id: 6, component: Scenarios.OpenDatabase, title: "Open Database" },
    { id: 7, component: Scenarios.UnprotectedDebugRoute, title: "Unprotected Route" },
    { id: 8, component: Scenarios.MoltbookExample, title: "Moltbook Exposure" },
    { id: 9, component: Scenarios.IncidentsGrid, title: "Incidents Grid" },
    { id: 10, component: Scenarios.BrandDamaged, title: "Brand Damaged" },
    { id: 11, component: Scenarios.UsersTrustGone, title: "Users Trust Gone" },
    { id: 12, component: Scenarios.StartupRunwayDraining, title: "Runway Draining" },
    { id: 13, component: Scenarios.CreditCardDrained, title: "Credit Card Drained" },
    { id: 14, component: Scenarios.ToneShiftToSafety, title: "Tone Shift to Safety" },
    { id: 15, component: Scenarios.EnteringAppUrl, title: "Entering App URL" },
    { id: 16, component: Scenarios.ScanningAnimation, title: "Scanning Animation" },
    { id: 17, component: Scenarios.IssueCardsAppearing, title: "Issue Cards" },
    { id: 18, component: Scenarios.PlainEnglishExplanation, title: "Plain English Fix" },
    { id: 19, component: Scenarios.AvoidingBigReport, title: "Avoiding Big Report" },
    { id: 20, component: Scenarios.CopyPromptToAI, title: "Copy Prompt to AI" },
    { id: 21, component: Scenarios.FounderRelieved, title: "Founder Relieved" },
    { id: 22, component: Scenarios.ShieldProtection, title: "Shield Protection" },
];

export default function ScenariosGrid() {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Focus view for a single animation
    if (selectedId !== null) {
        const selectedScenario = SCENARIO_LIST.find(s => s.id === selectedId);
        if (!selectedScenario) return null;
        const Component = selectedScenario.component;

        return (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8">
                <button
                    onClick={() => setSelectedId(null)}
                    className="absolute top-8 right-8 text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full font-bold"
                >
                    Close View
                </button>

                <div className="w-full max-w-2xl aspect-[16/9] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
                    <Component />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-8 md:p-12">
            <header className="mb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                    VibeCheck Scenarios
                </h1>
                <p className="text-zinc-400">
                    22 newly requested animations for the promo video sequence.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {SCENARIO_LIST.map((scenario) => (
                    <motion.div
                        key={scenario.id}
                        layoutId={`card-${scenario.id}`}
                        className="group relative aspect-video bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => setSelectedId(scenario.id)}
                        whileHover={{ scale: 1.02 }}
                    >
                        {/* Render Component Scaled Down */}
                        <div className="absolute inset-0 pointer-events-none transform scale-50 origin-top-left w-[200%] h-[200%]">
                            <scenario.component />
                        </div>

                        {/* Overlay Label */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-sm p-3 border-t border-zinc-800">
                            <div className="text-sm font-medium text-zinc-300 group-hover:text-white">
                                {scenario.id}. {scenario.title}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
