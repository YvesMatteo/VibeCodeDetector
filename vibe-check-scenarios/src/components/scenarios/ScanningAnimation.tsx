import { motion } from "framer-motion";
import { Search, Database, Key, Shield } from "lucide-react";

export default function ScanningAnimation() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">16. Scanning Animation</h3>

            <div className="relative flex items-center justify-center">
                {/* Central App Icon */}
                <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center z-10 relative">
                    <span className="text-2xl font-bold text-white">App</span>
                </div>

                {/* Radar Sweep */}
                <motion.div
                    className="absolute w-64 h-64 border-2 border-emerald-500/30 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    <div className="w-1/2 h-full bg-gradient-to-l from-emerald-500/20 to-transparent absolute right-0 top-0 origin-left"
                        style={{ borderRadius: "0 100% 100% 0" }} />
                </motion.div>

                {/* Found Items */}
                <ItemIcon icon={Key} delay={0.5} x={60} y={-40} color="text-red-400" />
                <ItemIcon icon={Database} delay={1.2} x={-50} y={50} color="text-yellow-400" />
                <ItemIcon icon={Shield} delay={2.0} x={-70} y={-30} color="text-blue-400" />
            </div>
        </div>
    );
}

function ItemIcon({ icon: Icon, delay, x, y, color }: { icon: any, delay: number, x: number, y: number, color: string }) {
    return (
        <motion.div
            className={`absolute bg-zinc-900 p-2 rounded-full border border-zinc-800 shadow-lg ${color}`}
            style={{ x, y }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
            transition={{ delay, duration: 0.5 }}
        >
            <Icon size={16} />
        </motion.div>
    )
}
