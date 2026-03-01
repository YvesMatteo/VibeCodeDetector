import { motion } from "framer-motion";
import { Database, Lock, LockOpen, Wifi } from "lucide-react";

export default function OpenDatabase() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">6. Open Database</h3>

            <div className="relative">
                {/* Database Icon */}
                <div className="relative z-10">
                    <Database size={80} className="text-zinc-400" strokeWidth={1.5} />

                    {/* Lock Animation */}
                    <motion.div
                        className="absolute -bottom-2 -right-2 bg-zinc-950 rounded-full p-1"
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: 50, rotate: 180 }}
                        transition={{ delay: 1, duration: 0.8 }}
                    >
                        <Lock size={32} className="text-green-500" />
                    </motion.div>
                </div>

                {/* Streaming Data Lines */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 h-0.5 bg-gradient-to-r from-red-500 to-transparent z-0"
                        style={{
                            width: "100px",
                            transformOrigin: "left center",
                            rotate: `${i * 45}deg`,
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: [0, 1.5], opacity: [0, 1, 0] }}
                        transition={{
                            delay: 1.8 + i * 0.1,
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 0.5
                        }}
                    />
                ))}

                {/* Database Turning Red */}
                <motion.div
                    className="absolute inset-0 rounded-full blur-xl bg-red-500/20 z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 0.5 }}
                />
            </div>
        </div>
    );
}
