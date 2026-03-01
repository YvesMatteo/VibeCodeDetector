import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function IncidentsGrid() {
    // Generate a grid of 16 items
    const items = Array.from({ length: 16 });

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-4 uppercase tracking-wider">9. Thousands of Incidents</h3>

            <motion.div
                className="grid grid-cols-4 gap-3 bg-zinc-900/30 p-4 rounded-xl"
                animate={{ scale: [1, 0.6] }}
                transition={{ delay: 2, duration: 2 }}
            >
                {items.map((_, i) => (
                    <div key={i} className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center relative">
                        <div className="w-6 h-6 rounded bg-zinc-700 opacity-50" />

                        <motion.div
                            className="absolute -top-1 -right-1 bg-zinc-950 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.15 + 0.5 }}
                        >
                            <AlertTriangle size={16} className="text-red-500 fill-red-500/20" />
                        </motion.div>
                    </div>
                ))}
            </motion.div>

            {/* Zoom out reveal text */}
            <motion.div
                className="absolute bottom-10 text-red-500 font-bold text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
            >
                WIDESPREAD VULNERABILITIES
            </motion.div>
        </div>
    );
}
