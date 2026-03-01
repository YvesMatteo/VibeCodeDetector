import { motion } from "framer-motion";
import { Globe, Server, Unlock, ArrowRight } from "lucide-react";

export default function Scene04WeakCORS() {
    const attackOrigins = ["evil-site.com", "phish.io", "?.hack"];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <div className="flex items-center gap-6 w-full max-w-lg justify-center">
                {/* Browser Window */}
                <motion.div
                    className="macos-window w-36"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="macos-titlebar py-1 px-2">
                        <div className="macos-dot macos-dot-red" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-yellow" style={{ width: 8, height: 8 }} />
                        <div className="macos-dot macos-dot-green" style={{ width: 8, height: 8 }} />
                        <span className="text-[8px] text-[#a1a1a6] ml-auto">Browser</span>
                    </div>
                    <div className="p-3 flex flex-col items-center gap-2">
                        <Globe size={24} className="text-[#64d2ff]" />
                        <span className="text-[9px] text-[#a1a1a6]">Unknown origins</span>
                    </div>
                </motion.div>

                {/* Weak CORS Gate */}
                <div className="flex flex-col items-center gap-1 relative">
                    <motion.div
                        className="w-14 h-14 rounded-full border-2 border-[#ff9f0a] bg-[#ff9f0a]/10 flex items-center justify-center"
                        animate={{ borderColor: ["#ff9f0a", "#ff453a", "#ff9f0a"] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <Unlock size={22} className="text-[#ff9f0a]" />
                    </motion.div>
                    <span className="text-[10px] text-[#ff9f0a] font-semibold">Weak CORS</span>

                    {/* Attack arrows passing through */}
                    {attackOrigins.map((origin, i) => (
                        <motion.div
                            key={i}
                            className="absolute flex items-center gap-1"
                            style={{ top: `${-5 + i * 20}px` }}
                            initial={{ x: -80, opacity: 0 }}
                            animate={{ x: [- 80, 0, 80], opacity: [0, 1, 0.5] }}
                            transition={{ delay: 0.16 + i * 0.06, duration: 0.6, ease: "easeInOut" }}
                        >
                            <span className="text-[8px] text-[#ff453a] font-mono whitespace-nowrap">{origin}</span>
                            <ArrowRight size={10} className="text-[#ff453a]" />
                        </motion.div>
                    ))}
                </div>

                {/* Server */}
                <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 }}
                >
                    <div className="w-14 h-14 rounded-2xl bg-[#2c2c2e] border border-[#48484a] flex items-center justify-center">
                        <Server size={24} className="text-[#a1a1a6]" />
                    </div>
                    <span className="text-[10px] text-[#a1a1a6] font-medium">Your Server</span>
                </motion.div>
            </div>

            <motion.p
                className="text-xs text-[#ff9f0a] mt-6 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.44 }}
            >
                Anyone can access your API
            </motion.p>
        </div>
    );
}
