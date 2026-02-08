import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
}

export function Card({ children, className = '', title, subtitle }: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-2xl ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {(title || subtitle) && (
                <div className="relative z-10 mb-6">
                    {title && (
                        <h3 className="text-lg font-semibold text-white tracking-tight">
                            {title}
                        </h3>
                    )}
                    {subtitle && (
                        <p className="text-sm text-zinc-400 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}
