import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";

export default function BrandDamaged() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">10. Brand Damaged</h3>

            <div className="w-64 bg-zinc-900 rounded-xl border border-zinc-800 p-4 relative overflow-hidden">
                {/* Social Post Header */}
                <div className="flex items-center gap-3 mb-4">
                    <motion.div
                        className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
                        animate={{ filter: ["grayscale(0%)", "grayscale(100%)"] }}
                        transition={{ delay: 2, duration: 0.5 }}
                    >
                        <span className="text-white font-bold">V</span>
                    </motion.div>
                    <div>
                        <div className="h-2 w-24 bg-zinc-700 rounded mb-1" />
                        <div className="h-2 w-16 bg-zinc-800 rounded" />
                    </div>
                </div>

                {/* Content Placeholder */}
                <div className="h-24 bg-zinc-800/50 rounded mb-4 flex items-center justify-center text-zinc-600 text-xs">
                    Launch Announcement 🎉
                </div>

                {/* Likes Animation */}
                <div className="flex gap-4">
                    <div className="flex items-center gap-1 text-zinc-500 text-xs">
                        <Heart size={14} className="fill-red-500 text-red-500" />
                        <span>1,240</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500 text-xs">
                        <MessageCircle size={14} />
                        <span>85</span>
                    </div>
                </div>

                {/* Slash Data Leak Banner */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] bg-red-600 py-2 transform -rotate-12 flex items-center justify-center shadow-xl z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
                >
                    <span className="text-white font-black uppercase tracking-widest text-lg">
                        DATA LEAK DETECTED
                    </span>
                </motion.div>

                {/* Screen Crack Overlay */}
                <motion.div
                    className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 40% 40%, 60% 60%, 40% 60%, 60% 40%)"
                    }}
                    transition={{ delay: 1.5 }}
                />
            </div>
        </div>
    );
}
