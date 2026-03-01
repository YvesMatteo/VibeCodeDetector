'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Clock,
    Bell,
    AlertTriangle,
    TrendingDown,
    Shield,
    Save,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format-date';

const FREQUENCIES = [
    { value: 'every_6h', label: 'Every 6h' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ALERT_TYPES = [
    { type: 'score_drop', label: 'Score Drop', description: 'Alert when score drops by more than threshold points', icon: TrendingDown, defaultThreshold: 10 },
    { type: 'new_critical', label: 'New Critical Finding', description: 'Alert when new critical severity issues are found', icon: AlertTriangle, defaultThreshold: null },
    { type: 'score_below', label: 'Score Below Threshold', description: 'Alert when score falls below a set value', icon: Shield, defaultThreshold: 50 },
];

export default function MonitoringPage() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;

    const [loading, setLoading] = useState(true);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [savingAlert, setSavingAlert] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Schedule state
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [frequency, setFrequency] = useState('weekly');
    const [hourUtc, setHourUtc] = useState(6);
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [nextRun, setNextRun] = useState<string | null>(null);

    // Alert state
    const [alerts, setAlerts] = useState<Record<string, { enabled: boolean; threshold: number | null; email: string }>>({
        score_drop: { enabled: false, threshold: 10, email: '' },
        new_critical: { enabled: false, threshold: null, email: '' },
        score_below: { enabled: false, threshold: 50, email: '' },
    });

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/monitoring?projectId=${projectId}`);
                const data = await res.json();

                if (data.schedule) {
                    setScheduleEnabled(data.schedule.enabled);
                    setFrequency(data.schedule.frequency);
                    setHourUtc(data.schedule.hour_utc);
                    setDayOfWeek(data.schedule.day_of_week ?? 1);
                    setNextRun(data.schedule.next_run_at);
                }

                if (data.alerts) {
                    const alertMap = { ...alerts };
                    for (const alert of data.alerts) {
                        alertMap[alert.type] = {
                            enabled: alert.enabled,
                            threshold: alert.threshold,
                            email: alert.notify_email || '',
                        };
                    }
                    setAlerts(alertMap);
                }
            } catch {
                setError('Failed to load monitoring settings. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        }
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    async function saveSchedule() {
        setSavingSchedule(true);
        try {
            const res = await fetch('/api/monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    type: 'schedule',
                    frequency,
                    hourUtc,
                    dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
                    enabled: scheduleEnabled,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setNextRun(data.next_run_at);
            toast.success('Schedule saved');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save scan schedule. Please try again.');
        } finally {
            setSavingSchedule(false);
        }
    }

    async function saveAlert(alertType: string) {
        setSavingAlert(true);
        try {
            const alert = alerts[alertType];
            const res = await fetch('/api/monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    type: 'alert',
                    alertType,
                    threshold: alert.threshold,
                    notifyEmail: alert.email || undefined,
                    enabled: alert.enabled,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success('Alert rule saved');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to save alert rule. Please try again.');
        } finally {
            setSavingAlert(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
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
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full space-y-8">
            {/* Scheduled Scans */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                        <Clock className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Monitoring Schedule</h3>
                        <p className="text-xs text-zinc-500">Automatically run security checks on a recurring schedule</p>
                    </div>
                    <label className="ml-auto flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={scheduleEnabled}
                            onChange={(e) => setScheduleEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-sky-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                    </label>
                </div>

                {scheduleEnabled && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-xs text-zinc-400 mb-1.5 block">Frequency</label>
                            <div className="flex gap-2">
                                {FREQUENCIES.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setFrequency(f.value)}
                                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                                            frequency === f.value
                                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                                : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:border-white/[0.1]'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {frequency === 'weekly' && (
                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Day of Week</label>
                                <select
                                    value={dayOfWeek}
                                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-zinc-300 w-full sm:max-w-xs min-h-[44px]"
                                >
                                    {DAYS.map((d, i) => (
                                        <option key={i} value={i}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-zinc-400 mb-1.5 block">Time (UTC)</label>
                            <select
                                value={hourUtc}
                                onChange={(e) => setHourUtc(Number(e.target.value))}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-zinc-300 w-full sm:max-w-xs min-h-[44px]"
                            >
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00 UTC</option>
                                ))}
                            </select>
                        </div>

                        {nextRun && (
                            <p className="text-xs text-zinc-500">
                                Next check: {formatDate(nextRun, 'datetime')}
                            </p>
                        )}
                    </div>
                )}

                <Button
                    size="sm"
                    onClick={saveSchedule}
                    disabled={savingSchedule}
                    className="bg-sky-500 hover:bg-sky-400 text-white"
                >
                    {savingSchedule ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save Schedule
                </Button>
            </div>

            {/* Alert Rules */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <Bell className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Alert Rules</h3>
                        <p className="text-xs text-zinc-500">Get notified when security conditions change</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {ALERT_TYPES.map(({ type, label, description, icon: Icon, defaultThreshold }) => {
                        const alert = alerts[type];
                        return (
                            <div key={type} className="border-b border-white/[0.04] pb-6 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 rounded-lg bg-white/[0.03] mt-0.5">
                                            <Icon className="h-3.5 w-3.5 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{label}</p>
                                            <p className="text-xs text-zinc-500">{description}</p>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={alert.enabled}
                                            onChange={(e) => setAlerts({
                                                ...alerts,
                                                [type]: { ...alert, enabled: e.target.checked },
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-sky-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                                    </label>
                                </div>

                                {alert.enabled && (
                                    <div className="ml-0 sm:ml-10 mt-3 space-y-3">
                                        {defaultThreshold !== null && (
                                            <div>
                                                <label className="text-xs text-zinc-400 mb-1 block">Threshold</label>
                                                <input
                                                    type="number"
                                                    value={alert.threshold ?? defaultThreshold}
                                                    onChange={(e) => setAlerts({
                                                        ...alerts,
                                                        [type]: { ...alert, threshold: Number(e.target.value) },
                                                    })}
                                                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-zinc-300 w-24 min-h-[44px]"
                                                    min={1}
                                                    max={100}
                                                />
                                                <span className="text-xs text-zinc-500 ml-2">
                                                    {type === 'score_drop' ? 'points' : 'score'}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-xs text-zinc-400 mb-1 block">Notify email</label>
                                            <input
                                                type="email"
                                                value={alert.email}
                                                onChange={(e) => setAlerts({
                                                    ...alerts,
                                                    [type]: { ...alert, email: e.target.value },
                                                })}
                                                placeholder="your@email.com"
                                                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-zinc-300 w-full sm:max-w-sm placeholder:text-zinc-600 min-h-[44px]"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => saveAlert(type)}
                                            disabled={savingAlert}
                                            className="text-xs"
                                        >
                                            {savingAlert ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                            Save
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
