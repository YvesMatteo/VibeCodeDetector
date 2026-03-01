import { motion } from "framer-motion";
import { ExternalLink, Shield, Sparkles, Check } from "lucide-react";

export default function Scene18CTA() {
    // Floating particles data
    const particles = Array.from({ length: 20 }, (_, i) => ({
        x: Math.cos((i / 20) * Math.PI * 2) * (120 + Math.random() * 80),
        y: Math.sin((i / 20) * Math.PI * 2) * (120 + Math.random() * 80),
        size: 2 + Math.random() * 3,
        delay: i * 0.04,
        duration: 3 + Math.random() * 2,
    }));

    const features = [
        "API Key Detection",
        "CORS Analysis",
        "Auth Scanning",
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            {/* Multi-layered background */}
            {/* Deep radial glow */}
            <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(26, 54, 93, 0.25) 0%, rgba(42, 74, 127, 0.08) 40%, transparent 70%)',
                }}
            />

            {/* Animated concentric rings */}
            {[1, 2, 3].map((ring) => (
                <motion.div
                    key={ring}
                    className="absolute rounded-full border"
                    style={{
                        width: 150 + ring * 100,
                        height: 150 + ring * 100,
                        borderColor: `rgba(74, 122, 181, ${0.12 - ring * 0.03})`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + ring * 0.12, duration: 0.8, ease: "easeOut" }}
                />
            ))}

            {/* Orbiting particles */}
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        background: `rgba(107, 147, 214, ${0.3 + Math.random() * 0.4})`,
                        filter: 'blur(0.5px)',
                    }}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                        x: [0, p.x * 0.5, p.x, p.x * 0.5, 0],
                        y: [0, p.y * 0.5, p.y, p.y * 0.5, 0],
                        opacity: [0, 0.8, 0.4, 0.8, 0],
                    }}
                    transition={{
                        delay: p.delay,
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* Sweeping light beam */}
            <motion.div
                className="absolute w-[200%] h-[1px]"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(107, 147, 214, 0.4), transparent)',
                    transformOrigin: 'center',
                }}
                initial={{ rotate: -45, scaleX: 0, opacity: 0 }}
                animate={{ rotate: [-45, 45], scaleX: [0, 1, 0], opacity: [0, 0.6, 0] }}
                transition={{ delay: 0.3, duration: 2, ease: "easeInOut" }}
            />

            {/* Main content */}
            <motion.div
                className="flex flex-col items-center gap-5 z-10 relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                {/* Shield icon with glow burst */}
                <motion.div
                    className="relative"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
                >
                    {/* Glow behind icon */}
                    <motion.div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                            background: 'radial-gradient(circle, rgba(42, 74, 127, 0.6) 0%, transparent 70%)',
                            transform: 'scale(2.5)',
                        }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Icon container with glassmorphism */}
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1a365d] to-[#2a4a7f] flex items-center justify-center shadow-2xl shadow-blue-900/50 relative overflow-hidden">
                        {/* Shimmer effect */}
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                            }}
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ delay: 0.8, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                        />
                        <img
                            src="/checkvibe-icon.png"
                            alt="CheckVibe"
                            className="w-14 h-14 object-contain relative z-10"
                        />
                    </div>

                    {/* Sparkle accents */}
                    {[
                        { x: -28, y: -8, delay: 0.5 },
                        { x: 32, y: -12, delay: 0.7 },
                        { x: 28, y: 20, delay: 0.9 },
                    ].map((spark, i) => (
                        <motion.div
                            key={i}
                            className="absolute"
                            style={{ left: `calc(50% + ${spark.x}px)`, top: `calc(50% + ${spark.y}px)` }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                            transition={{ delay: spark.delay, duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                        >
                            <Sparkles size={10} className="text-[#6b93d6]" />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Brand name with letter-by-letter reveal */}
                <motion.div className="flex items-center gap-0 overflow-hidden">
                    {"CheckVibe".split("").map((char, i) => (
                        <motion.span
                            key={i}
                            className="text-3xl font-bold bg-gradient-to-r from-[#4a7ab5] to-[#6b93d6] bg-clip-text text-transparent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + i * 0.04, duration: 0.4, ease: "easeOut" }}
                        >
                            {char}
                        </motion.span>
                    ))}
                    <motion.span
                        className="text-3xl font-bold text-[#4a7ab5]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + 9 * 0.04, duration: 0.4 }}
                    >
                        .dev
                    </motion.span>
                </motion.div>

                {/* Tagline with fade-up */}
                <motion.p
                    className="text-sm text-[#a1a1a6] text-center max-w-xs leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    Security scanning for vibe-coded apps
                </motion.p>

                {/* Feature pills */}
                <motion.div
                    className="flex gap-2 flex-wrap justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75 }}
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c1c1e] border border-[#2a4a7f]/30 backdrop-blur-sm"
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                        >
                            <Check size={10} className="text-[#30d158]" />
                            <span className="text-[10px] text-[#a1a1a6] font-medium">{feature}</span>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA Button — cinematic entrance */}
                <motion.div
                    className="relative mt-2"
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1.1, duration: 0.5, ease: "easeOut" }}
                >
                    {/* Animated glow ring behind button */}
                    <motion.div
                        className="absolute -inset-1 rounded-2xl opacity-50"
                        style={{
                            background: 'linear-gradient(135deg, #1a365d, #2a4a7f, #4a7ab5, #2a4a7f, #1a365d)',
                            backgroundSize: '200% 200%',
                        }}
                        animate={{
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />

                    {/* Pulse ring */}
                    <motion.div
                        className="absolute -inset-2 rounded-2xl border border-[#2a4a7f]/30"
                        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <motion.button
                        className="relative px-8 py-3.5 bg-gradient-to-r from-[#1a365d] via-[#234b82] to-[#2a4a7f] rounded-2xl text-sm font-semibold text-white flex items-center gap-2 shadow-xl shadow-blue-900/40 overflow-hidden"
                        whileHover={{ scale: 1.04 }}
                        animate={{ scale: [1, 1.015, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Button shimmer */}
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                            }}
                            animate={{ x: ['-150%', '250%'] }}
                            transition={{ delay: 1.5, duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        />
                        <Shield size={15} className="relative z-10" />
                        <span className="relative z-10">Scan Your App Now</span>
                    </motion.button>
                </motion.div>

                {/* Bottom tool logos */}
                <motion.div
                    className="flex items-center gap-3 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.5 }}
                >
                    <div className="flex -space-x-1">
                        {/* Cursor logo */}
                        <motion.div
                            className="w-6 h-6 rounded-full border border-[#2c2c2e] bg-[#f0efed] flex items-center justify-center overflow-hidden"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.5, type: "spring", stiffness: 300 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" fill="#3a3a3c" />
                                <path d="M12 2L4 7l8 5 8-5-8-5z" fill="#636366" />
                                <path d="M12 12l8-5v10l-8 5V12z" fill="#4a4a4e" />
                            </svg>
                        </motion.div>

                        {/* Lovable logo */}
                        <motion.div
                            className="w-6 h-6 rounded-full border border-[#2c2c2e] bg-white flex items-center justify-center overflow-hidden"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.58, type: "spring", stiffness: 300 }}
                        >
                            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                                <rect x="1" y="0" width="4" height="4" rx="1" fill="#F56B1A" />
                                <rect x="6" y="5" width="4" height="4" rx="1" fill="#F56B1A" />
                                <rect x="1" y="10" width="4" height="4" rx="1" fill="#F56B1A" />
                            </svg>
                        </motion.div>

                        {/* Bolt logo */}
                        <motion.div
                            className="w-6 h-6 rounded-full border border-[#2c2c2e] bg-[#E07B5B] flex items-center justify-center overflow-hidden"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.66, type: "spring", stiffness: 300 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                {Array.from({ length: 12 }, (_, i) => {
                                    const angle = (i * 30 * Math.PI) / 180;
                                    const innerR = 3;
                                    const outerR = i % 2 === 0 ? 10 : 7;
                                    return (
                                        <line
                                            key={i}
                                            x1={12 + Math.cos(angle) * innerR}
                                            y1={12 + Math.sin(angle) * innerR}
                                            x2={12 + Math.cos(angle) * outerR}
                                            y2={12 + Math.sin(angle) * outerR}
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    );
                                })}
                            </svg>
                        </motion.div>
                    </div>
                    <span className="text-[10px] text-[#636366]">for vibecoded apps</span>
                </motion.div>
            </motion.div>
        </div>
    );
}
