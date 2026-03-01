import { motion } from "framer-motion";
import { Lock, LockOpen } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

export default function GlitchingPadlock() {
    const [isBroken, setIsBroken] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsBroken(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">4. Glitching Padlock</h3>

            <div className="relative">
                <motion.div
                    animate={isBroken ? {
                        x: [0, -5, 5, -5, 5, 0],
                        color: ["#ef4444", "#ffffff", "#ef4444"], // Red glitch
                        filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
                    } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {isBroken ? (
                        <LockOpen size={96} className="text-red-500" />
                    ) : (
                        <Lock size={96} className="text-zinc-300" />
                    )}
                </motion.div>

                {/* Glitch Overlay Effect */}
                {isBroken && (
                    <>
                        <motion.div
                            className="absolute inset-0 bg-red-500/20 mix-blend-overlay"
                            animate={{ opacity: [0, 1, 0, 1, 0] }}
                            transition={{ duration: 0.2 }}
                        />
                        <motion.div
                            className="absolute top-0 left-0 w-full h-1 bg-white opacity-50"
                            animate={{ top: ["0%", "100%"] }}
                            transition={{ duration: 0.2 }}
                        />
                    </>
                )}
            </div>

            {isBroken && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-red-500 font-mono font-bold tracking-widest uppercase"
                >
                    SECURITY COMPROMISED
                </motion.div>
            )}
        </div>
    );
}
