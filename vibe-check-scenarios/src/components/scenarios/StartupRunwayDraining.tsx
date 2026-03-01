import { motion } from "framer-motion";
import { TrendingDown, AlertOctagon } from "lucide-react";

export default function StartupRunwayDraining() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-12 uppercase tracking-wider">12. Runway Draining</h3>

            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400 font-mono uppercase text-sm">Runway</span>
                    <motion.span
                        className="font-mono font-bold text-lg"
                        initial={{ color: "#22c55e" }} // green-500
                        animate={{ color: "#ef4444" }} // red-500
                        transition={{ duration: 5 }}
                    >
                        Start: 12 Months
                    </motion.span>
                </div>

                {/* Progress Bar Container */}
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 relative">
                    <motion.div
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 6, ease: "linear" }}
                    />
                </div>

                {/* Out of Time Alert */}
                <motion.div
                    className="mt-8 flex flex-col items-center text-red-500 gap-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 6.2, type: "spring" }}
                >
                    <AlertOctagon size={48} />
                    <span className="text-2xl font-black uppercase tracking-widest">SHUTDOWN IMMINENT</span>
                </motion.div>
            </div>
        </div>
    );
}
