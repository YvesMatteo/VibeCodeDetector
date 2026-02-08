import React, { useState, useEffect } from 'react';
import { motion, useTransform, useMotionValue, animate } from 'framer-motion';

// Common Colors
const COLORS = {
    success: "#00FF9D",
    textPrimary: "#F4F4F5",
};

// 1. Platform Logos
export const PlatformLogos: React.FC = () => {
    const icons = [
        { name: "Replit", color: "#F26207", delay: 0 },
        { name: "Lovable", color: "#000000", delay: 0.2 },
        { name: "Cursor", color: "#3799FF", delay: 0.4 },
    ];

    return (
        <div className="flex gap-12 items-center justify-center mt-8">
            {icons.map((icon, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0, y: 20, opacity: 0 }}
                    whileInView={{ scale: 1, y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                        delay: icon.delay,
                        type: "spring",
                        damping: 12
                    }}
                    className="flex flex-col items-center gap-2"
                >
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-2xl"
                        style={{ backgroundColor: icon.color }}
                    >
                        {icon.name[0]}
                    </div>
                    <span className="text-zinc-400 font-medium">{icon.name}</span>
                </motion.div>
            ))}
        </div>
    );
};

// 2. Vulnerability Visuals
export const VulnerabilityVisuals: React.FC<{ index: number }> = ({ index }) => {
    // API Keys
    if (index === 0) {
        return (
            <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden relative border border-zinc-700">
                <motion.div
                    animate={{ y: [-20, 0, -20] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute top-2 left-2 text-[8px] text-zinc-500 font-mono leading-none"
                >
                    API_KEY=<span className="text-red-500">sk_live_...</span><br />
                    DB_PASS=<span className="text-red-500">secret</span><br />
                    AWS_KEY=<span className="text-red-500">AKIA...</span>
                </motion.div>
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
            </div>
        );
    }
    // Databases
    if (index === 1) {
        return (
            <div className="w-16 h-16 flex items-center justify-center">
                <div className="relative">
                    <span className="text-4xl">🗄️</span>
                    <motion.div
                        className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full"
                        animate={{ scale: [1, 2], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                </div>
            </div>
        );
    }
    // Debug Routes
    return (
        <div className="w-16 h-16 flex items-center justify-center bg-zinc-800 rounded-lg border border-red-500/50">
            <div className="text-xs font-mono text-red-500 font-bold">DEBUG: ON</div>
        </div>
    );
};

// 3. Rapid Counter
export const RapidCounter: React.FC<{ value: number, duration?: number }> = ({ value, duration = 2 }) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

    // Only animate when in view
    return (
        <motion.span
            onViewportEnter={() => {
                animate(count, value, { duration: duration });
            }}
        >
            {rounded}
        </motion.span>
    );
};

// 4. Consequence Icons
export const ConsequenceIcons: React.FC<{ type: 'brand' | 'trust' | 'startup' | 'money' }> = ({ type }) => {
    const icons = {
        brand: "💔",
        trust: "📉",
        startup: "💀",
        money: "💸"
    };

    return (
        <motion.div
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 0.2 }}
            style={{ fontSize: 60 }}
        >
            {icons[type]}
        </motion.div>
    );
};

// 5. Scanner Row
export const ScannerRow: React.FC<{ children: React.ReactNode, delay?: number }> = ({ children, delay = 0 }) => {
    const [scanned, setScanned] = useState(false);

    return (
        <motion.div
            className="relative overflow-hidden p-4 rounded-xl"
            onViewportEnter={() => {
                const timer = setTimeout(() => setScanned(true), delay * 1000);
                return () => clearTimeout(timer);
            }}
            viewport={{ once: true }}
        >
            {/* Background Scan Sweep */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                    delay: delay,
                    duration: 1.5,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 3
                }}
            />

            {/* Content reveals/turns green */}
            <motion.div
                animate={{
                    color: scanned ? COLORS.success : COLORS.textPrimary,
                    opacity: scanned ? 1 : 0.5,
                    x: scanned ? 0 : 20
                }}
                transition={{ delay: delay + 0.5 }}
            >
                {children}
            </motion.div>

            {/* Checkmark appears */}
            <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: scanned ? 1 : 0, scale: scanned ? 1 : 0 }}
                transition={{ delay: delay + 0.5 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl"
            >
                ✓
            </motion.div>
        </motion.div>
    );
};

// 6. Actionable Button
export const ActionableButton: React.FC<{ label?: string, onClickLabel?: string }> = ({
    label = "Copy to Cursor",
    onClickLabel = "Copied!"
}) => {
    const [clicked, setClicked] = useState(false);

    return (
        <motion.div
            className="flex flex-col items-center gap-4 mt-8 relative"
            onViewportEnter={() => {
                const timer = setTimeout(() => setClicked(true), 1000); // Faster click
                return () => clearTimeout(timer);
            }}
            viewport={{ once: true }}
        >
            <motion.div
                animate={{ scale: clicked ? [1, 0.9, 1] : 1 }}
                className={`
                    px-8 py-4 rounded-xl font-bold text-xl flex items-center gap-3 transition-colors duration-300
                    ${clicked ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-900'}
                `}
            >
                {clicked ? (
                    <>
                        <span>✓</span>
                        <span>{onClickLabel}</span>
                    </>
                ) : (
                    <>
                        <span>📋</span>
                        <span>{label}</span>
                    </>
                )}
            </motion.div>

            {/* Cursor Hand */}
            <motion.div
                initial={{ x: 100, y: 100, opacity: 0 }}
                animate={{
                    x: clicked ? 0 : 100,
                    y: clicked ? 0 : 100,
                    opacity: clicked ? [0, 1, 0] : 0
                }}
                transition={{ duration: 1, times: [0, 0.8, 1] }}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    fontSize: 24
                }}
            >
                👆
            </motion.div>
        </motion.div>
    );
};
