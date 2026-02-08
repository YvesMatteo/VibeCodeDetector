import { motion } from 'framer-motion';

export default function IncidentImpactAnimation() {
    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">

            {/* Background Graph Crashing */}
            <div className="absolute inset-0 flex items-end opacity-20">
                <svg className="w-full h-full" preserveAspectRatio="none">
                    <motion.path
                        d="M0,50 Q100,20 200,80 T400,200"
                        fill="none"
                        stroke="red"
                        strokeWidth="4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2 }}
                    />
                    <path d="M0,50 L400,50" stroke="#333" strokeDasharray="4 4" />
                </svg>
            </div>

            {/* DM Notification */}
            <motion.div
                className="relative bg-zinc-800 border border-zinc-700 p-4 rounded-xl shadow-2xl w-64 z-10"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">?</div>
                    <div>
                        <div className="text-xs font-bold text-white">Unknown User</div>
                        <div className="text-[10px] text-zinc-400">Just now</div>
                    </div>
                </div>
                <div className="text-sm text-zinc-300">
                    "Hey, I can see all your users' data. You might want to fix that."
                </div>
            </motion.div>

            {/* Floating Emojis of Doom */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-10 right-10 text-2xl"
                    animate={{ y: [0, -20], opacity: [1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >💸</motion.div>
                <motion.div
                    className="absolute bottom-10 left-10 text-2xl"
                    animate={{ y: [0, -20], opacity: [1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                >📉</motion.div>
            </div>
        </div>
    );
}
