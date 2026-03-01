import { motion } from "framer-motion";
import { Key, Globe, Shield, AlertCircle } from "lucide-react";

export default function Scene14FindingsList() {
    const findings = [
        { icon: Key, label: "Leaked API key", severity: "Critical", color: "#ff453a", delay: 0.1 },
        { icon: Globe, label: "Weak CORS", severity: "High", color: "#ff9f0a", delay: 0.2 },
        { icon: Shield, label: "Missing headers", severity: "Medium", color: "#ffd60a", delay: 0.3 },
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] overflow-hidden relative p-8">
            <motion.div
                className="macos-window w-full max-w-sm"
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 80 }}
            >
                <div className="macos-titlebar">
                    <div className="macos-dot macos-dot-red" />
                    <div className="macos-dot macos-dot-yellow" />
                    <div className="macos-dot macos-dot-green" />
                    <span className="text-[10px] text-[#a1a1a6] ml-2">Security Report</span>
                    <AlertCircle size={12} className="text-[#ff453a] ml-auto" />
                </div>
                <div className="p-4 space-y-2">
                    <div className="text-xs text-[#a1a1a6] mb-3 font-medium uppercase tracking-wider">Issues Found</div>

                    {findings.map((finding, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl border"
                            style={{
                                backgroundColor: `${finding.color}08`,
                                borderColor: `${finding.color}25`,
                            }}
                            initial={{ x: 40, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: finding.delay, type: "spring", stiffness: 100 }}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${finding.color}15` }}
                            >
                                <finding.icon size={16} style={{ color: finding.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#f5f5f7]">{finding.label}</div>
                            </div>
                            <div
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${finding.color}15`, color: finding.color }}
                            >
                                {finding.severity}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
