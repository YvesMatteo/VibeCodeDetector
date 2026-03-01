import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Scene07LeakedAPIKeys() {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="relative w-full max-w-lg"
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.06, duration: 0.6 }}
            >
                {/* Code Editor Window */}
                <motion.div
                    className="macos-window relative z-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="macos-titlebar">
                        <div className="macos-dot macos-dot-red" />
                        <div className="macos-dot macos-dot-yellow" />
                        <div className="macos-dot macos-dot-green" />
                        <span className="text-[10px] text-[#a1a1a6] ml-2 font-mono">.env.local</span>
                    </div>
                    <div className="p-4 font-mono text-sm space-y-2">
                        <div className="text-[#a1a1a6]">{"// Configuration"}</div>
                        <div className="text-[#a1a1a6]">DATABASE_URL="postgresql://..."</div>
                        <motion.div
                            className="bg-[#ff453a]/15 border border-[#ff453a]/40 rounded px-2 py-1 -mx-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.16, duration: 0.6 }}
                        >
                            <span className="text-[#ff453a] font-bold">API_KEY="sk_live_example_key_for_video_demo"</span>
                        </motion.div>
                        <div className="text-[#a1a1a6]">NEXT_PUBLIC_APP_URL="..."</div>
                    </div>
                </motion.div>

                {/* Browser DevTools - zooms out to reveal */}
                <motion.div
                    className="absolute -right-8 -bottom-4 w-56 macos-window z-20"
                    initial={{ opacity: 0, x: 40, y: 20 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2c2c2e] border-b border-[#48484a]">
                        <span className="text-[9px] text-[#a1a1a6] font-medium">DevTools — Network</span>
                        <Search size={10} className="text-[#a1a1a6] ml-auto" />
                    </div>
                    <div className="p-2 font-mono text-[10px] space-y-1.5">
                        <div className="text-[#64d2ff]">GET /api/data</div>
                        <div className="text-[#a1a1a6] pl-2">Headers ▾</div>
                        <motion.div
                            className="bg-[#ff9f0a]/15 text-[#ff9f0a] pl-3 rounded py-0.5"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            Authorization: Bearer sk_live_4eC3...
                        </motion.div>
                        <div className="text-[#a1a1a6] pl-2">Response ▾</div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
