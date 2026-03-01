import { motion } from "framer-motion";
import { DoorOpen, UserX } from "lucide-react";

export default function UnprotectedDebugRoute() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">7. Unprotected Route</h3>

            {/* Browser Bar */}
            <div className="w-64 bg-zinc-800 rounded-lg p-2 mb-8 flex items-center gap-2 shadow-xl border border-zinc-700">
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                </div>
                <div className="flex-1 bg-zinc-900 rounded px-2 py-1 text-xs text-zinc-400 font-mono overflow-hidden">
                    vibe-app.com<span className="text-red-400">/admin</span>
                </div>
            </div>

            <div className="relative flex items-end">
                {/* Door Animation */}
                <div className="relative">
                    <motion.div
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: -100 }}
                        transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
                        style={{ transformOrigin: "left center", perspective: 1000 }}
                    >
                        <div className="w-24 h-36 bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center relative">
                            <div className="absolute right-2 top-16 w-2 h-2 rounded-full bg-zinc-500" /> {/* Handle */}
                        </div>
                    </motion.div>

                    {/* Door Frame/Void */}
                    <div className="absolute inset-0 bg-black/50 border-2 border-zinc-700 -z-10" />
                </div>

                {/* Attacker Walking In */}
                <motion.div
                    className="absolute left-4 bottom-0 text-red-500"
                    initial={{ opacity: 0, x: -50, scale: 0.8 }}
                    animate={{ opacity: 1, x: 10, scale: 1 }}
                    transition={{ delay: 2.2, duration: 1.5 }}
                >
                    <UserX size={48} />
                </motion.div>
            </div>
        </div>
    );
}
