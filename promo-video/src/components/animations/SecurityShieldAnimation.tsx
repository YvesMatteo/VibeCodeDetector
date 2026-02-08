import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { motion } from 'framer-motion';

export const SecurityShieldAnimation: React.FC = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Shield Svg */}
            <div className="relative z-10 transform scale-150">
                <svg width="120" height="140" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Base Outline */}
                    <motion.path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        stroke="#3f3f46"
                        strokeWidth="1"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2 }}
                    />

                    {/* Filling Animation */}
                    <motion.path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                        fill="url(#shieldGeneric)"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 2, ease: "easeOut" }}
                    />

                    {/* Inner Glowing Core */}
                    <motion.path
                        d="M12 6L12 18M7 9L17 9M9 14L15 14"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 2, duration: 1.5 }}
                    />

                    <defs>
                        <linearGradient id="shieldGeneric" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#10b981" stopOpacity="0.1" />
                            <stop offset="1" stopColor="#10b981" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Animated Glow Behind */}
                <motion.div
                    className="absolute inset-0 bg-emerald-500/20 blur-3xl -z-10 rounded-full"
                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
            </div>

            {/* Floating "Shield" Particles */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute border border-emerald-500/10 rounded-full"
                    style={{ width: 180 + i * 50, height: 180 + i * 50 }}
                    animate={{ rotate: i % 2 === 0 ? 360 : -360, opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
                >
                    <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-emerald-500/50 rounded-full" />
                </motion.div>
            ))}
        </div>
    );
};
