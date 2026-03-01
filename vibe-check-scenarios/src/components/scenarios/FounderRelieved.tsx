import { motion } from "framer-motion";
import { User, ShieldCheck, Check } from "lucide-react";

export default function FounderRelieved() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">21. Founder Relieved</h3>

            <div className="relative">
                {/* Green Shield Background */}
                <motion.div
                    className="absolute -top-4 -right-4 z-0 text-emerald-500/20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    <ShieldCheck size={120} />
                </motion.div>

                {/* Founder */}
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 mb-8 relative z-10">
                    <User size={48} className="text-emerald-400" />
                </div>

                {/* Deploy Button - Success */}
                <motion.button
                    className="px-6 py-2 bg-zinc-800 text-emerald-400 font-bold rounded-lg border border-emerald-500 shadow-lg shadow-emerald-500/10 flex items-center gap-2 mx-auto"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    Deploy
                    <div className="flex items-center justify-center w-5 h-5 bg-emerald-500 rounded-full text-zinc-950">
                        <Check size={12} strokeWidth={4} />
                    </div>
                </motion.button>
            </div>
        </div>
    );
}
