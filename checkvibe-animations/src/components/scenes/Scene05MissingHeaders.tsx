import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function Scene05MissingHeaders() {
    const headers = [
        { name: "X-Content-Type-Options", value: "nosniff", delay: 0.1 },
        { name: "X-Frame-Options", value: "DENY", delay: 0.16 },
        { name: "Strict-Transport-Security", value: "max-age=31536000", delay: 0.22 },
        { name: "Content-Security-Policy", value: "default-src 'self'", delay: 0.28 },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            {/* HTTP Response Panel */}
            <motion.div
                className="macos-window w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="macos-titlebar">
                    <div className="macos-dot macos-dot-red" />
                    <div className="macos-dot macos-dot-yellow" />
                    <div className="macos-dot macos-dot-green" />
                    <span className="text-[10px] text-[#a1a1a6] ml-2">HTTP Response Headers</span>
                </div>
                <div className="p-4 font-mono text-xs space-y-2">
                    <div className="text-[#30d158]">HTTP/1.1 200 OK</div>
                    <div className="text-[#a1a1a6]">Content-Type: application/json</div>
                    <div className="h-px bg-[#3a3a3c] my-2" />

                    {/* Headers that fade out */}
                    {headers.map((header, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-2"
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: [0.8, 0.3, 0], x: [0, 10, 30] }}
                            transition={{ delay: header.delay, duration: 0.6 }}
                        >
                            <span className="text-[#64d2ff]">{header.name}:</span>
                            <span className="text-[#a1a1a6]">{header.value}</span>
                            <motion.span
                                className="text-[#ff453a] ml-auto"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: header.delay + 0.06 }}
                            >
                                ✕
                            </motion.span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* "Missing headers" stamp */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                initial={{ opacity: 0, scale: 2, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: -12 }}
                transition={{ delay: 0.44, type: "spring", stiffness: 300 }}
            >
                <div className="border-3 border-[#ff453a] text-[#ff453a] px-6 py-2 rounded-lg font-black text-xl uppercase tracking-widest bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Missing Headers
                </div>
            </motion.div>
        </div>
    );
}
