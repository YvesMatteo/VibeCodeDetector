import { motion } from "framer-motion";
import { Key, MousePointer2 } from "lucide-react";

export default function PlainEnglishExplanation() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">18. Plain English + Fix</h3>

            <motion.div
                className="w-full max-w-sm bg-zinc-900 border border-red-500/30 rounded-xl overflow-hidden cursor-pointer"
                layout
            >
                {/* Expanded Card Header */}
                <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-3">
                    <Key className="text-red-400" size={20} />
                    <span className="text-red-200 font-medium">Critical: Leaked Stripe Key</span>
                </div>

                <div className="p-4 space-y-4">
                    {/* Plain English Explanation */}
                    <div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Explanation</div>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            You committed a live Stripe secret key to a public repository. Hackers can use this to charge your customers or refund payments.
                        </p>
                    </div>

                    {/* AI Fix Prompt */}
                    <div className="relative group">
                        <div className="text-xs text-emerald-500 uppercase tracking-wider mb-1">AI Fix Prompt</div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-400 group-hover:bg-zinc-900 transition-colors">
                            Rotate the Stripe key immediately and move it to a .env file. Use this code to load it securely...
                        </div>

                        {/* Cursor Hover Animation */}
                        <motion.div
                            className="absolute bottom-2 right-2"
                            initial={{ opacity: 0, x: 20, y: 20 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ delay: 2, duration: 1 }}
                        >
                            <MousePointer2 className="fill-white text-white drop-shadow-md" />
                        </motion.div>

                        {/* Highlight Effect */}
                        <motion.div
                            className="absolute inset-0 bg-blue-500/10 rounded pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3 }}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
