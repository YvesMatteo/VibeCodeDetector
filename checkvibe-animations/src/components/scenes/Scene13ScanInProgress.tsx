import { motion } from "framer-motion";
import { Key, Database, Shield } from "lucide-react";

export default function Scene13ScanInProgress() {
    const items = [
        { icon: Key, delay: 0.16, x: 55, y: -35, color: "#ff453a", label: "API Key" },
        { icon: Database, delay: 0.28, x: -50, y: 45, color: "#ff9f0a", label: "Database" },
        { icon: Shield, delay: 0.4, x: -65, y: -25, color: "#0a84ff", label: "Auth" },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="relative flex items-center justify-center">
                {/* Central App Icon */}
                <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2c2c2e] to-[#3a3a3c] border border-[#48484a] flex items-center justify-center z-10 relative shadow-xl"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <span className="text-lg font-bold text-[#f5f5f7]">🔍</span>
                </motion.div>

                {/* Radar circles */}
                {[1, 2, 3].map((ring) => (
                    <motion.div
                        key={ring}
                        className="absolute rounded-full border"
                        style={{
                            width: `${ring * 70}px`,
                            height: `${ring * 70}px`,
                            borderColor: `rgba(10, 132, 255, ${0.3 / ring})`,
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.04 * ring, duration: 0.6 }}
                    />
                ))}

                {/* Radar sweep */}
                <motion.div
                    className="absolute w-52 h-52"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                >
                    <div
                        className="w-1/2 h-full absolute right-0 top-0 origin-left"
                        style={{
                            background: 'linear-gradient(to left, rgba(10, 132, 255, 0.2), transparent)',
                            borderRadius: '0 100% 100% 0',
                        }}
                    />
                </motion.div>

                {/* Found Items */}
                {items.map((item, i) => (
                    <motion.div
                        key={i}
                        className="absolute flex flex-col items-center gap-1"
                        style={{ x: item.x, y: item.y }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                        transition={{ delay: item.delay, duration: 0.6 }}
                    >
                        <div
                            className="p-2 rounded-xl border shadow-lg"
                            style={{
                                backgroundColor: `${item.color}15`,
                                borderColor: `${item.color}40`,
                            }}
                        >
                            <item.icon size={16} style={{ color: item.color }} />
                        </div>
                        <span className="text-[8px] font-medium" style={{ color: item.color }}>{item.label}</span>
                    </motion.div>
                ))}
            </div>

            <motion.p
                className="text-xs text-[#0a84ff] mt-8 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                Scanning for vulnerabilities...
            </motion.p>
        </div>
    );
}
