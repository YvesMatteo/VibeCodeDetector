import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function ApiKeyLeakAnimation() {
    const [leaked, setLeaked] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setLeaked(prev => !prev);
        }, 4000); // Toggle every 4 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/10 flex flex-col font-mono text-xs shadow-inner">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <div className="ml-auto text-zinc-500 text-[10px]">config.ts</div>
            </div>

            {/* Code Area */}
            <div className="flex-1 p-4 overflow-hidden relative">
                <motion.div
                    animate={{ y: leaked ? -80 : 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="space-y-1 text-zinc-400"
                >
                    <Line num={1} content="import { OpenAI } from 'openai';" />
                    <Line num={2} content="" />
                    <Line num={3} content="// Initialize client" />
                    <Line num={4} content="const client = new OpenAI({" />

                    <motion.div
                        className={`relative rounded px-1 transition-colors duration-300 ${leaked ? 'bg-red-500/20 text-red-200' : ''}`}
                    >
                        <div className="flex">
                            <span className="w-6 inline-block text-zinc-600 select-none">5</span>
                            <span>  apiKey: "sk-live-892301...",</span>
                        </div>
                        {/* Warning Flash */}
                        {leaked && (
                            <motion.div
                                layoutId="highlight"
                                className="absolute inset-0 border border-red-500 rounded animate-pulse"
                            />
                        )}
                    </motion.div>

                    <Line num={6} content="  dangerouslyAllowBrowser: true" />
                    <Line num={7} content="});" />
                    <Line num={8} content="" />
                    <Line num={9} content="export default client;" />
                </motion.div>

                {/* Alert Overlay */}
                <AnimatePresence>
                    {leaked && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-4 right-4 bg-red-500/90 text-white rounded px-3 py-2 border border-red-400 shadow-lg backdrop-blur-sm flex items-center gap-2 z-10"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>SECRET LEAK DETECTED</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Line({ num, content }: { num: number; content: string }) {
    return (
        <div className="flex">
            <span className="w-6 inline-block text-zinc-600 select-none">{num}</span>
            <span>{content}</span>
        </div>
    )
}
