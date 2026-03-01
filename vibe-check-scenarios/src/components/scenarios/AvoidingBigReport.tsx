import { motion } from "framer-motion";
import { FileText, CheckSquare } from "lucide-react";

export default function AvoidingBigReport() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">19. Avoiding Big Report</h3>

            <div className="relative flex items-center justify-center w-full h-40">
                {/* Big Stack of Papers - Dropping In */}
                <motion.div
                    className="absolute flex flex-col items-center"
                    initial={{ y: -300, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <div className="w-40 h-52 bg-white rounded shadow-2xl flex items-center justify-center border-4 border-zinc-200 relative z-10">
                        <div className="text-center">
                            <FileText size={48} className="mx-auto text-zinc-400 mb-2" />
                            <div className="font-bold text-black">SECURITY REPORT</div>
                            <div className="text-zinc-500 text-xs">127 Pages</div>
                        </div>
                    </div>
                    {/* Stack effect behind */}
                    <div className="w-40 h-52 bg-zinc-100 rounded border border-zinc-300 absolute top-2 -right-2 z-0"></div>
                    <div className="w-40 h-52 bg-zinc-200 rounded border border-zinc-300 absolute top-4 -right-4 -z-10"></div>
                </motion.div>

                {/* Flash/Vanish Transition */}
                <motion.div
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ delay: 2, duration: 0.3 }}
                />

                {/* New Simple Checklist UI */}
                <motion.div
                    className="absolute w-64 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 2.2, type: "spring" }}
                >
                    <div className="text-white font-bold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Action Plan
                    </div>
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded">
                                <CheckSquare size={16} className="text-zinc-500" />
                                <div className="h-2 bg-zinc-700 rounded w-full" />
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
