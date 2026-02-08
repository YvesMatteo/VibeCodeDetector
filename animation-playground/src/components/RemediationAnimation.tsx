import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function RemediationAnimation() {
    const [isFixed, setIsFixed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsFixed(true), 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center">

            {/* Scanner Beam */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none z-10"
                initial={{ y: '-100%' }}
                animate={{ y: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Central Status */}
            <motion.div
                className="relative z-20 bg-zinc-950 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 w-64 shadow-2xl"
                animate={{
                    borderColor: isFixed ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    boxShadow: isFixed ? '0 0 30px rgba(16, 185, 129, 0.2)' : '0 0 30px rgba(239, 68, 68, 0.2)'
                }}
            >
                <motion.div
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${isFixed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                >
                    {isFixed ? (
                        <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </motion.div>

                <div className="text-center">
                    <div className={`text-lg font-bold ${isFixed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isFixed ? 'SECURE' : 'VULNERABLE'}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                        {isFixed ? 'All threats neutralized' : 'Critical leaks detected'}
                    </div>
                </div>
            </motion.div>

            {/* Background Code Particles */}
            <div className="absolute inset-0 opacity-10 font-mono text-xs p-4 overflow-hidden">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={isFixed ? 'text-emerald-500' : 'text-red-500'}>
                        {isFixed ? '✓ sanitized_input()' : '⚠ exec(user_input)'}
                    </div>
                ))}
            </div>
        </div>
    );
}
