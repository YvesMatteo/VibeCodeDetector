import { motion } from "framer-motion";
import { CreditCard, Cloud, AlertCircle } from "lucide-react";

export default function CreditCardDrained() {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">13. Credit Card Drained</h3>

            <div className="relative">
                {/* Credit Card */}
                <div className="w-80 h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-zinc-700 shadow-2xl p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex gap-2 items-center">
                            <Cloud size={24} className="text-blue-400" />
                            <span className="font-bold text-zinc-300">AWS / Cloud</span>
                        </div>
                        <CreditCard size={32} className="text-zinc-500" />
                    </div>
                    <div className="font-mono text-zinc-400 tracking-widest text-lg mb-4">
                        •••• •••• •••• 4242
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-zinc-500 uppercase">Card Holder<br /><span className="text-zinc-300 text-sm normal-case">Founder Name</span></div>
                        <div className="text-xs text-zinc-500 uppercase">Expires<br /><span className="text-zinc-300 text-sm normal-case">12/28</span></div>
                    </div>
                </div>

                {/* Bill Popup */}
                <motion.div
                    className="absolute -top-12 -right-12 bg-white text-black p-4 rounded shadow-xl rotate-12 border-2 border-red-500"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                >
                    <div className="text-xs font-bold uppercase mb-1">Invoice #9921</div>
                    <div className="text-3xl font-black text-red-600">$12,402.10</div>
                    <div className="text-xs text-red-500 font-bold mt-1">OVER LIMIT</div>
                </motion.div>

                {/* Declined Stamp */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 px-6 py-2 rounded-lg font-black text-4xl uppercase tracking-widest -rotate-12 bg-zinc-950/80 backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2.5, type: "spring", stiffness: 300 }}
                >
                    DECLINED
                </motion.div>
            </div>
        </div>
    );
}
