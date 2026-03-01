import { motion } from "framer-motion";
import { User, HelpCircle, Lock } from "lucide-react";

export default function SecurityDoubtBeat() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">3. Security Doubt Beat</h3>

            {/* Darkening Overlay */}
            <motion.div
                className="absolute inset-0 bg-black/60 z-20 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
            />

            <div className="relative z-10 flex flex-col items-center">
                {/* Founder - Frozen Happy State */}
                <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500 mb-8 grayscale-[50%]">
                    <User size={48} className="text-blue-400" />
                </div>

                {/* Question Mark */}
                <motion.div
                    className="absolute -top-4 -right-8 z-30"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
                    transition={{ delay: 1, duration: 0.5 }}
                >
                    <HelpCircle size={80} className="text-yellow-500 drop-shadow-lg" strokeWidth={3} />
                </motion.div>

                {/* Flickering Padlock */}
                <motion.div
                    className="absolute -bottom-2 -left-8 z-30"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 1, 0.5, 1, 0.8],
                        scale: [0.8, 1, 1]
                    }}
                    transition={{ delay: 1.5, duration: 2, times: [0, 0.2, 0.4, 0.6, 1] }}
                >
                    <Lock size={64} className="text-red-500/80 drop-shadow-lg" />
                </motion.div>
            </div>
        </div>
    );
}
