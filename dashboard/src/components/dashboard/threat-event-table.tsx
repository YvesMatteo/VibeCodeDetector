'use client';

import { formatDate } from '@/lib/format-date';

interface ThreatEvent {
    id: string;
    event_type: string;
    severity: string;
    source_ip: string | null;
    request_path: string | null;
    payload_snippet: string | null;
    created_at: string;
}

interface ThreatEventTableProps {
    events: ThreatEvent[];
    total: number;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
    xss: 'XSS',
    sqli: 'SQLi',
    csrf: 'CSRF',
    bot: 'Bot',
    brute_force: 'Brute Force',
    path_traversal: 'Path Traversal',
    other: 'Other',
};

const SEVERITY_STYLES: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    info: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

const TYPE_STYLES: Record<string, string> = {
    xss: 'bg-red-500/10 text-red-300',
    sqli: 'bg-orange-500/10 text-orange-300',
    csrf: 'bg-amber-500/10 text-amber-300',
    bot: 'bg-violet-500/10 text-violet-300',
    brute_force: 'bg-pink-500/10 text-pink-300',
    path_traversal: 'bg-cyan-500/10 text-cyan-300',
    other: 'bg-zinc-500/10 text-zinc-300',
};

export function ThreatEventTable({ events, total, page, totalPages, onPageChange }: ThreatEventTableProps) {
    if (events.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                No threat events found
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Severity</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Source IP</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Path</th>
                            <th className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((evt) => (
                            <tr key={evt.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3 text-xs text-zinc-400 whitespace-nowrap">
                                    {formatDate(evt.created_at, 'datetime')}
                                </td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full ${TYPE_STYLES[evt.event_type] || TYPE_STYLES.other}`}>
                                        {TYPE_LABELS[evt.event_type] || evt.event_type}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border ${SEVERITY_STYLES[evt.severity] || SEVERITY_STYLES.info}`}>
                                        {evt.severity}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-zinc-400 font-mono">
                                    {evt.source_ip || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-zinc-400 max-w-[200px] truncate">
                                    {evt.request_path || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-zinc-500 max-w-[250px] truncate">
                                    {evt.payload_snippet || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-xs text-zinc-500">
                        {total.toLocaleString()} total events
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 disabled:opacity-40 hover:border-white/[0.1] transition-colors min-h-[32px]"
                        >
                            Prev
                        </button>
                        <span className="px-3 py-1.5 text-xs text-zinc-500">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 disabled:opacity-40 hover:border-white/[0.1] transition-colors min-h-[32px]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
