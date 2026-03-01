import { motion } from "framer-motion";
import { User, UserX, Shield } from "lucide-react";

export default function ShieldProtection() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">22. Shield Protection</h3>

            <div className="flex items-center justify-between w-full max-w-sm relative">
                {/* Founder (Left) */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500">
                        <User size={32} className="text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-400 font-bold">YOU</span>
                </div>

                {/* Shield (Center) - Growing */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1, type: "spring", stiffness: 100 }}
                    >
                        <div className="w-24 h-32 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)] border-4 border-emerald-300">
                            <Shield size={48} className="text-white fill-white/20" />
                        </div>
                    </motion.div>
                </div>

                {/* Attacker (Right) - Being Pushed Away */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    animate={{ x: [0, 50], opacity: [1, 0] }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                >
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500">
                        <UserX size={32} className="text-red-400" />
                    </div>
                    <span className="text-xs text-red-400 font-bold">ATTACKER</span>
                </motion.div>
            </div>
        </div>
    );
}
