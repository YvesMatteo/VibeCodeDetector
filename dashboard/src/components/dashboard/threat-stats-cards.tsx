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
    const cards = [
        {
            label: 'Total Events',
            value: totalEvents,
            icon: ShieldAlert,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10',
        },
        {
            label: 'Critical + High',
            value: criticalHighCount,
            icon: AlertTriangle,
            color: criticalHighCount > 0 ? 'text-red-400' : 'text-emerald-400',
            bg: criticalHighCount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
        },
        {
            label: 'Top Attack Type',
            value: topAttackType ? (EVENT_TYPE_LABELS[topAttackType] || topAttackType) : 'None',
            icon: Zap,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            isText: true,
        },
        {
            label: 'Unique IPs',
            value: uniqueIps,
            icon: Globe,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`p-1.5 rounded-lg ${card.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                            </div>
                            <span className="text-xs text-zinc-500">{card.label}</span>
                        </div>
                        <p className={`text-2xl font-semibold tracking-tight ${card.isText ? 'text-sm' : ''} text-white`}>
                            {card.isText ? card.value : Number(card.value).toLocaleString()}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
