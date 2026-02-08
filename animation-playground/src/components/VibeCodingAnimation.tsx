import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function VibeCodingAnimation() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col font-mono text-sm">
            {/* Editor Header */}
            <div className="h-8 bg-zinc-800 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <div className="ml-4 text-xs text-zinc-500">FastShip.tsx</div>
            </div>

            {/* Editor Body */}
            <div className="p-6 text-zinc-300 space-y-2 relative">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="text-purple-400">const</span> App = () ={'>'} {'{'}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : -10 }}
                    className="pl-4"
                >
                    <span className="text-blue-400">return</span> <span className="text-green-300">"Hello World!"</span>;
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: step >= 2 ? 1 : 0 }}
                >
                    {'}'};
                </motion.div>

                {/* AI Autocomplete Overlay */}
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-12 left-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2 rounded shadow-lg backdrop-blur-sm"
                    >
                        ✨ AI Generating...
                    </motion.div>
                )}

                {/* Success State */}
                {step === 3 && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                    >
                        <div className="bg-zinc-800 border border-emerald-500/50 p-4 rounded-xl flex flex-col items-center shadow-2xl">
                            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="text-emerald-400 font-bold">Shipped! 🚀</div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
