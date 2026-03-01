'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    ShieldAlert,
    Copy,
    Check,
    Loader2,
    Lock,
    ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ThreatStatsCards } from '@/components/dashboard/threat-stats-cards';
import { ThreatTimelineChart } from '@/components/dashboard/threat-timeline-chart';
import { ThreatEventTable } from '@/components/dashboard/threat-event-table';
import Link from 'next/link';

interface ThreatSettings {
    enabled: boolean;
    alert_frequency?: string;
    alert_email?: string;
    snippet_token?: string;
    project_id: string;
}

interface Stats {
    total_events: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    unique_ips: number;
    top_attack_type: string | null;
}

interface TopIp {
    ip: string;
    count: number;
    lastSeen: string;
}

export default function ThreatsPage() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Settings
    const [settings, setSettings] = useState<ThreatSettings>({ enabled: false, project_id: projectId });
    const [alertFrequency] = useState('immediate');
    const [alertEmail, setAlertEmail] = useState('');

    // Snippet
    const [snippet, setSnippet] = useState('');

    // Stats
    const [stats, setStats] = useState<Stats | null>(null);
    const [timeSeries, setTimeSeries] = useState<{ hour: string; critical: number; high: number; medium: number; low: number; total: number }[]>([]);
    const [topIps, setTopIps] = useState<TopIp[]>([]);

    // Events
    const [events, setEvents] = useState<{ id: string; event_type: string; severity: string; source_ip: string | null; request_path: string | null; payload_snippet: string | null; created_at: string }[]>([]);
    const [eventPage, setEventPage] = useState(1);
    const [eventTotal, setEventTotal] = useState(0);
    const [eventTotalPages, setEventTotalPages] = useState(0);
    const [typeFilter, setTypeFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    // Plan gating placeholder
    const [hasPlan, setHasPlan] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch(`/api/threats/settings?projectId=${projectId}`);
            if (!res.ok) {
                if (res.status === 403) {
                    setHasPlan(false);
                    return;
                }
                throw new Error('Failed to load settings');
            }
            const data = await res.json();
            setSettings(data);
            // Alert frequency is always immediate
            setAlertEmail(data.alert_email || '');

            if (data.enabled && data.snippet_token) {
                const snippetRes = await fetch(`/api/threats/snippet?projectId=${projectId}`);
                if (snippetRes.ok) {
                    const snippetData = await snippetRes.json();
                    setSnippet(snippetData.snippet);
                }
            }
        } catch {
            setError('Failed to load threat detection settings.');
        }
    }, [projectId]);

    const loadStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/threats/stats?projectId=${projectId}&hours=24`);
            if (!res.ok) return;
            const data = await res.json();
            setStats(data.stats);
            setTimeSeries(data.timeSeries || []);
            setTopIps(data.topIps || []);
        } catch {
            // Non-critical
        }
    }, [projectId]);

    const loadEvents = useCallback(async (page: number) => {
        try {
            let url = `/api/threats?projectId=${projectId}&page=${page}`;
            if (typeFilter) url += `&type=${typeFilter}`;
            if (severityFilter) url += `&severity=${severityFilter}`;

            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            setEvents(data.events || []);
            setEventTotal(data.total || 0);
            setEventTotalPages(data.totalPages || 0);
            setEventPage(data.page || 1);
        } catch {
            // Non-critical
        }
    }, [projectId, typeFilter, severityFilter]);

    useEffect(() => {
        async function init() {
            setLoading(true);
            await loadSettings();
            await Promise.all([loadStats(), loadEvents(1)]);
            setLoading(false);
        }
        init();
    }, [loadSettings, loadStats, loadEvents]);

    useEffect(() => {
        loadEvents(1);
    }, [typeFilter, severityFilter, loadEvents]);

    async function saveSettings(enabled: boolean) {
        setSaving(true);
        try {
            const res = await fetch('/api/threats/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    enabled,
                    alertFrequency,
                    alertEmail: alertEmail || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSettings(data);
            toast.success(enabled ? 'Threat detection enabled' : 'Threat detection disabled');

            // Fetch snippet after enabling
            if (enabled && data.snippet_token) {
                const snippetRes = await fetch(`/api/threats/snippet?projectId=${projectId}`);
                if (snippetRes.ok) {
                    const snippetData = await snippetRes.json();
                    setSnippet(snippetData.snippet);
                }
            }
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    function copySnippet() {
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        toast.success('Snippet copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!hasPlan) {
        return (
            <div className="px-4 md:px-8 py-12 max-w-3xl mx-auto w-full">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                        <Lock className="h-5 w-5 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Real-Time Threat Detection</h3>
                    <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                        Monitor your website for live hacking attempts including XSS, SQL injection, brute force attacks, and more. Available on Starter plans and above.
                    </p>
                    <Link href="/dashboard/credits">
                        <Button className="bg-sky-500 hover:bg-sky-400 text-white">
                            Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                    className="text-xs"
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full space-y-6">
            {/* Setup bar */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Threat Detection</h3>
                        <p className="text-xs text-zinc-500">Monitor your website for live attacks</p>
                    </div>
                    <label className="ml-auto flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => saveSettings(e.target.checked)}
                            disabled={saving}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-sky-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                    </label>
                </div>

                {settings.enabled && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-zinc-400 mb-1.5 block">Alert Frequency</label>
                                <div className="px-3 py-2 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30 inline-block min-h-[36px] leading-[20px]">
                                    Immediate
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-zinc-400 mb-1.5 block">Alert Email</label>
                                <input
                                    type="email"
                                    value={alertEmail}
                                    onChange={(e) => setAlertEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-zinc-300 w-full placeholder:text-zinc-600 min-h-[36px]"
                                />
                            </div>
                        </div>

                        <Button
                            size="sm"
                            onClick={() => saveSettings(true)}
                            disabled={saving}
                            className="bg-sky-500 hover:bg-sky-400 text-white text-xs"
                        >
                            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Save Settings
                        </Button>

                        {snippet && (
                            <div className="mt-4">
                                <label className="text-xs text-zinc-400 mb-1.5 block">Embed this snippet in your website&apos;s &lt;head&gt;</label>
                                <div className="relative">
                                    <pre className="bg-black/40 border border-white/[0.06] rounded-lg p-3 pr-12 text-xs text-emerald-400 font-mono overflow-x-auto">
                                        {snippet}
                                    </pre>
                                    <button
                                        onClick={copySnippet}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats cards */}
            {settings.enabled && stats && (
                <ThreatStatsCards
                    totalEvents={stats.total_events || 0}
                    criticalHighCount={(stats.critical_count || 0) + (stats.high_count || 0)}
                    topAttackType={stats.top_attack_type}
                    uniqueIps={stats.unique_ips || 0}
                />
            )}

            {/* Timeline chart */}
            {settings.enabled && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Threat Timeline (24h)</h3>
                    <ThreatTimelineChart data={timeSeries} />
                </div>
            )}

            {/* Event feed table */}
            {settings.enabled && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-white">Event Feed</h3>
                        <div className="flex gap-2">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 min-h-[32px]"
                            >
                                <option value="">All types</option>
                                <option value="xss">XSS</option>
                                <option value="sqli">SQLi</option>
                                <option value="csrf">CSRF</option>
                                <option value="bot">Bot</option>
                                <option value="brute_force">Brute Force</option>
                                <option value="path_traversal">Path Traversal</option>
                                <option value="other">Other</option>
                            </select>
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 min-h-[32px]"
                            >
                                <option value="">All severities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="info">Info</option>
                            </select>
                        </div>
                    </div>
                    <ThreatEventTable
                        events={events}
                        total={eventTotal}
                        page={eventPage}
                        totalPages={eventTotalPages}
                        onPageChange={(p) => loadEvents(p)}
                    />
                </div>
            )}

            {/* Top Source IPs */}
            {settings.enabled && topIps.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Top Source IPs</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">IP Address</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Events</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topIps.map((ip) => (
                                <tr key={ip.ip} className="border-b border-white/[0.03]">
                                    <td className="py-2 px-3 text-xs text-zinc-300 font-mono">{ip.ip}</td>
                                    <td className="py-2 px-3 text-xs text-zinc-400">{ip.count.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-xs text-zinc-500">
                                        {new Date(ip.lastSeen).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
