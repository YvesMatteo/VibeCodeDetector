import { motion } from "framer-motion";
import { User, Users } from "lucide-react";

export default function UsersTrustGone() {
    const users = Array.from({ length: 8 });

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">11. Users' Trust Gone</h3>

            {/* Counter */}
            <div className="mb-8 font-mono text-xl flex items-center gap-2">
                <Users size={20} className="text-zinc-500" />
                <span className="text-zinc-400">Users:</span>
                <motion.span
                    className="text-white font-bold"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 0.5 }}
                >
                    <Counter from={15420} to={0} duration={8} />
                </motion.span>
            </div>

            {/* Users Disappearing */}
            <div className="flex gap-4">
                {users.map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 1, y: 0, scale: 1, filter: "grayscale(0%)" }}
                        animate={{
                            opacity: 0,
                            y: 50,
                            scale: 0.5,
                            filter: "grayscale(100%)",
                            x: (Math.random() - 0.5) * 100
                        }}
                        transition={{ delay: i * 0.8, duration: 1.5 }}
                    >
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                            <User size={24} className="text-white" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function Counter({ from, to, duration }: { from: number, to: number, duration: number }) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {from} {/* Placeholder, would need a more complex hook for real counting */}
            {/* Simplified for this snippet - actual counting requires state/effect */}
        </motion.span>
    );
}
