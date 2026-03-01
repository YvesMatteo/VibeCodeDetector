import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function ToneShiftToSafety() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider relative z-20">14. Tone Shift - CheckVibe</h3>

            {/* Screen Wipe */}
            <motion.div
                className="absolute inset-0 bg-white z-0"
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
            />

            {/* Dark background coming back slightly for contrast or staying light based on prompt? 
          Prompt says "wipes from dark to bright". So keep it white/bright. 
      */}

            <motion.div
                className="relative z-10 flex flex-col items-center gap-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
            >
                <div className="w-32 h-32 bg-zinc-900 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20" />
                    <ShieldCheck size={64} className="text-emerald-500" />
                </div>

                <motion.div
                    className="text-4xl font-bold text-zinc-900 tracking-tight"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.5 }}
                >
                    CheckVibe
                </motion.div>
            </motion.div>
        </div>
    );
}
