'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface TimeSeriesBucket {
    hour: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

interface ThreatTimelineChartProps {
    data: TimeSeriesBucket[];
}

function formatHour(hour: unknown): string {
    try {
        const d = new Date(String(hour) + ':00Z');
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
    } catch {
        return String(hour);
    }
}

export function ThreatTimelineChart({ data }: ThreatTimelineChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                No threat events in this time period
            </div>
        );
    }

    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        axisLine={{ stroke: '#27272A' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#18181B',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#fff',
                        }}
                        labelFormatter={formatHour}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Bar dataKey="critical" stackId="a" fill="#EF4444" name="Critical" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="high" stackId="a" fill="#F97316" name="High" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="medium" stackId="a" fill="#EAB308" name="Medium" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="low" stackId="a" fill="#3B82F6" name="Low" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
