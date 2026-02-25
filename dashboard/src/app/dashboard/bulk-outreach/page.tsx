'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { processAuditData } from '@/lib/audit-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';

type UrlStatus = 'pending' | 'scanning' | 'finding_contacts' | 'generating' | 'sending' | 'done' | 'error' | 'skipped';

interface UrlEntry {
    url: string;
    status: UrlStatus;
    score: number | null;
    emails: string[];
    error: string | null;
    sentCount: number;
    failedCount: number;
}

function normalizeUrl(raw: string): string {
    let u = raw.trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try { return new URL(u).href; } catch { return ''; }
}

function StatusBadge({ status }: { status: UrlStatus }) {
    switch (status) {
        case 'pending':
            return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Pending</Badge>;
        case 'scanning':
            return <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" />Scanning</Badge>;
        case 'finding_contacts':
            return <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" />Finding contacts</Badge>;
        case 'generating':
            return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" />Generating email</Badge>;
        case 'sending':
            return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20"><Loader2 className="h-3 w-3 animate-spin mr-1" />Sending</Badge>;
        case 'done':
            return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>;
        case 'error':
            return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
        case 'skipped':
            return <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700">Skipped</Badge>;
    }
}

export default function BulkOutreachPage() {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [input, setInput] = useState('');
    const [entries, setEntries] = useState<UrlEntry[]>([]);
    const [running, setRunning] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const abortRef = useRef(false);
    const supabase = createClient();

    // Auth check
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setAuthorized(user?.email === OWNER_EMAIL);
        })();
    }, []);

    // beforeunload warning
    useEffect(() => {
        if (!running) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [running]);

    const updateEntry = useCallback((idx: number, patch: Partial<UrlEntry>) => {
        setEntries(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
    }, []);

    // ── Parse NDJSON stream and extract scan results + score ──
    async function runScan(url: string): Promise<{ results: Record<string, any>; score: number } | null> {
        const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Scan failed' }));
            if (res.status === 402) throw new Error('QUOTA_EXHAUSTED');
            throw new Error(err.error || `Scan failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: any = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nlIdx: number;
            while ((nlIdx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nlIdx).trim();
                buffer = buffer.slice(nlIdx + 1);
                if (!line) continue;
                try {
                    const chunk = JSON.parse(line);
                    if (chunk.type === 'result') finalResult = chunk;
                    else if (chunk.type === 'error') throw new Error(chunk.error || 'Scan failed');
                } catch (e) {
                    if (e instanceof Error && !e.message.startsWith('Unexpected')) throw e;
                }
            }
        }

        if (!finalResult?.results) return null;
        return { results: finalResult.results, score: finalResult.overallScore ?? 0 };
    }

    // ── Scrape emails ──
    async function scrapeEmails(url: string): Promise<string[]> {
        const res = await fetch('/api/outreach/scrape-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error('Email scrape failed');
        const data = await res.json();
        return (data.emails || []).map((e: any) => e.email);
    }

    // ── Generate outreach email (with retry on 429) ──
    async function generateEmail(scanResults: Record<string, any>, projectUrl: string) {
        const audit = processAuditData(scanResults as any);
        const payload = {
            scanResults,
            projectUrl,
            issueCount: audit.issueCount,
            severityBreakdown: audit.totalFindings,
        };

        for (let attempt = 0; attempt < 3; attempt++) {
            const res = await fetch('/api/outreach/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) return res.json() as Promise<{ subject: string; body: string }>;

            const err = await res.json().catch(() => ({}));
            const msg = err.error || '';
            const is429 = res.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit');

            if (is429 && attempt < 2) {
                await sleep(15000 * (attempt + 1)); // 15s, then 30s
                continue;
            }

            throw new Error(msg || `Email generation failed (${res.status})`);
        }
        throw new Error('Email generation failed after retries');
    }

    // ── Send email ──
    async function sendEmail(to: string[], subject: string, body: string) {
        const res = await fetch('/api/outreach/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body }),
        });
        if (!res.ok) throw new Error('Send failed');
        return res.json() as Promise<{ sent: number; failed: number }>;
    }

    // ── Main batch process ──
    async function startBatch() {
        const urls = input
            .split(/[,\n]+/)
            .map(s => normalizeUrl(s))
            .filter(Boolean);

        if (urls.length === 0) return;

        const initial: UrlEntry[] = urls.map(url => ({
            url, status: 'pending', score: null, emails: [], error: null, sentCount: 0, failedCount: 0,
        }));
        setEntries(initial);
        setRunning(true);
        abortRef.current = false;

        for (let i = 0; i < urls.length; i++) {
            if (abortRef.current) break;

            try {
                // 1. Scan
                updateEntry(i, { status: 'scanning' });
                const scanData = await runScan(urls[i]);
                if (!scanData) {
                    updateEntry(i, { status: 'error', error: 'No scan results' });
                    continue;
                }
                updateEntry(i, { score: scanData.score });

                if (abortRef.current) break;

                // 2. Scrape emails + Generate email in parallel
                updateEntry(i, { status: 'finding_contacts' });
                const [emails, generated] = await Promise.all([
                    scrapeEmails(urls[i]),
                    generateEmail(scanData.results, urls[i]),
                ]);

                updateEntry(i, { emails });

                if (emails.length === 0) {
                    updateEntry(i, { status: 'skipped', error: 'No real emails found' });
                    await sleep(500);
                    continue;
                }

                if (abortRef.current) break;

                // 3. Send
                updateEntry(i, { status: 'sending' });
                const sendResult = await sendEmail(emails, generated.subject, generated.body);
                updateEntry(i, { status: 'done', sentCount: sendResult.sent, failedCount: sendResult.failed });

            } catch (err: any) {
                const msg = err?.message || 'Unknown error';
                if (msg === 'QUOTA_EXHAUSTED') {
                    updateEntry(i, { status: 'error', error: 'Scan quota exhausted' });
                    // Mark remaining as skipped
                    for (let j = i + 1; j < urls.length; j++) {
                        updateEntry(j, { status: 'skipped', error: 'Batch stopped (quota exhausted)' });
                    }
                    break;
                }
                updateEntry(i, { status: 'error', error: msg });
            }

            // 2s pause between URLs
            if (i < urls.length - 1 && !abortRef.current) {
                await sleep(2000);
            }
        }

        setRunning(false);
    }

    function handleStop() {
        abortRef.current = true;
    }

    // Summary
    const doneCount = entries.filter(e => e.status === 'done').length;
    const errorCount = entries.filter(e => e.status === 'error').length;
    const skippedCount = entries.filter(e => e.status === 'skipped').length;
    const totalSent = entries.reduce((s, e) => s + e.sentCount, 0);
    const totalFailed = entries.reduce((s, e) => s + e.failedCount, 0);
    const isComplete = running === false && entries.length > 0 && entries.every(e => e.status !== 'pending');

    const parsedUrls = input.split(/[,\n]+/).map(s => normalizeUrl(s)).filter(Boolean);

    if (authorized === null) {
        return <div className="p-8 text-zinc-500">Loading...</div>;
    }

    if (!authorized) {
        return (
            <div className="p-8">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 max-w-md">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Access denied</span>
                    </div>
                    <p className="text-sm text-zinc-400">This tool is restricted to the owner account.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-white">Bulk Outreach</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Paste URLs, scan each site, find contacts, and auto-send outreach emails.
                </p>
            </div>

            {/* Input */}
            {!confirmed && (
                <div className="space-y-4">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Paste URLs separated by commas or newlines..."
                        rows={6}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                    />
                    {parsedUrls.length > 0 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {parsedUrls.length} URL{parsedUrls.length !== 1 ? 's' : ''} detected — will use {parsedUrls.length} scan credit{parsedUrls.length !== 1 ? 's' : ''}.
                            </p>
                            <Button
                                onClick={() => { setConfirmed(true); startBatch(); }}
                                className="bg-sky-500 hover:bg-sky-400 text-white border-0"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Start batch
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Stop button */}
            {running && (
                <div className="mb-4">
                    <Button onClick={handleStop} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <Square className="h-4 w-4 mr-2" />
                        Stop batch
                    </Button>
                </div>
            )}

            {/* Summary bar */}
            {isComplete && (
                <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex flex-wrap gap-4 text-sm">
                    <span className="text-emerald-400">{totalSent} sent</span>
                    {totalFailed > 0 && <span className="text-red-400">{totalFailed} send failures</span>}
                    <span className="text-zinc-400">{doneCount} completed</span>
                    {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                    {skippedCount > 0 && <span className="text-zinc-500">{skippedCount} skipped</span>}
                    <button
                        onClick={() => { setConfirmed(false); setEntries([]); }}
                        className="ml-auto text-sky-400 hover:text-sky-300 transition-colors"
                    >
                        Run another batch
                    </button>
                </div>
            )}

            {/* Progress table */}
            {entries.length > 0 && (
                <div className="rounded-lg border border-white/[0.08] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-8">#</th>
                                <th className="px-4 py-2.5 text-left text-zinc-500 font-medium">URL</th>
                                <th className="px-4 py-2.5 text-center text-zinc-500 font-medium w-16">Score</th>
                                <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-32">Emails</th>
                                <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-40">Status</th>
                                <th className="px-4 py-2.5 text-center text-zinc-500 font-medium w-16">Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, i) => (
                                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                                    <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-2.5 text-white truncate max-w-[300px] font-mono text-xs">
                                        {entry.url.replace(/^https?:\/\//, '')}
                                    </td>
                                    <td className="px-4 py-2.5 text-center tabular-nums">
                                        {entry.score !== null ? (
                                            <span className={entry.score >= 70 ? 'text-emerald-400' : entry.score >= 40 ? 'text-amber-400' : 'text-red-400'}>
                                                {entry.score}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-700">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {entry.emails.length > 0 ? (
                                            <span className="text-zinc-300 flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-zinc-500" />
                                                {entry.emails.length}
                                            </span>
                                        ) : entry.status === 'skipped' ? (
                                            <span className="text-zinc-600 text-xs">none found</span>
                                        ) : (
                                            <span className="text-zinc-700">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <StatusBadge status={entry.status} />
                                        {entry.error && entry.status === 'error' && (
                                            <p className="text-[10px] text-red-400/60 mt-0.5 truncate max-w-[160px]">{entry.error}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-center tabular-nums">
                                        {entry.sentCount > 0 ? (
                                            <span className="text-emerald-400">{entry.sentCount}</span>
                                        ) : (
                                            <span className="text-zinc-700">—</span>
                                        )}
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
