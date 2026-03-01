import { motion } from "framer-motion";
import { Key, Database, ShieldAlert } from "lucide-react";

export default function IssueCardsAppearing() {
    const cards = [
        { icon: Key, title: "Leaked API Key", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        { icon: Database, title: "Open Database", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        { icon: ShieldAlert, title: "Unprotected Route", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    ];

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 h-full w-full rounded-xl overflow-hidden relative">
            <h3 className="text-zinc-500 text-sm mb-8 uppercase tracking-wider">17. Issue Cards Appearing</h3>

            <div className="w-full max-w-xs space-y-3">
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        className={`flex items-center gap-3 p-4 rounded-lg border ${card.bg} ${card.border}`}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.4, type: "spring" }}
                    >
                        <card.icon className={card.color} size={20} />
                        <span className="text-zinc-200 font-medium">{card.title}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
