'use client';

import {
    ShieldAlert,
    AlertTriangle,
    Globe,
    Zap,
} from 'lucide-react';

interface ThreatStatsCardsProps {
    totalEvents: number;
    criticalHighCount: number;
    topAttackType: string | null;
    uniqueIps: number;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    xss: 'XSS',
    sqli: 'SQL Injection',
    csrf: 'CSRF',
    bot: 'Bot Detection',
    brute_force: 'Brute Force',
    path_traversal: 'Path Traversal',
    other: 'Other',
};

export function ThreatStatsCards({ totalEvents, criticalHighCount, topAttackType, uniqueIps }: ThreatStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Events */}
            <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent p-5">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30">
                        <ShieldAlert className="h-4 w-4 text-sky-400" />
                    </div>
                </div>
                <div className="relative">
                    <p className="text-3xl font-bold tracking-tight text-white mb-1">
                        {totalEvents.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-sky-400/80">Total Events Detected</p>
                </div>
            </div>

            {/* Critical + High */}
            <div className={`relative overflow-hidden rounded-xl border p-5 ${criticalHighCount > 0
                ? 'border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent'
                : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent'
                }`}>
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none ${criticalHighCount > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`} />
                <div className="flex items-center justify-between mb-4 relative">
                    <div className={`p-2 rounded-lg border ${criticalHighCount > 0
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-emerald-500/20 border-emerald-500/30'
                        }`}>
                        <AlertTriangle className={`h-4 w-4 ${criticalHighCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                    </div>
                </div>
                <div className="relative">
                    <p className="text-3xl font-bold tracking-tight text-white mb-1">
                        {criticalHighCount.toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium ${criticalHighCount > 0 ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                        Critical & High Severity
                    </p>
                </div>
            </div>

            {/* Top Attack Type */}
            <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                        <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                </div>
                <div className="relative">
                    <p className="text-xl font-bold tracking-tight text-white mb-1 h-9 flex items-center">
                        {topAttackType ? (EVENT_TYPE_LABELS[topAttackType] || topAttackType) : 'None'}
                    </p>
                    <p className="text-xs font-medium text-amber-400/80 mt-1">Top Attack Vector</p>
                </div>
            </div>

            {/* Unique IPs */}
            <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
                        <Globe className="h-4 w-4 text-violet-400" />
                    </div>
                </div>
                <div className="relative">
                    <p className="text-3xl font-bold tracking-tight text-white mb-1">
                        {uniqueIps.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-violet-400/80">Unique Source IPs</p>
                </div>
            </div>
        </div>
    );
}
