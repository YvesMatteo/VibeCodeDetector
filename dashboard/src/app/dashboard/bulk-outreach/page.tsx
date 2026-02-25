'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { processAuditData } from '@/lib/audit-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Play, Square, CheckCircle, XCircle, AlertTriangle,
    Mail, RotateCcw, Clock, ChevronDown, ChevronRight, Trash2, X,
} from 'lucide-react';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';

type UrlStatus = 'pending' | 'scanning' | 'finding_contacts' | 'generating' | 'sending' | 'done' | 'error' | 'skipped';

interface UrlEntry {
    id: string;
    url: string;
    domain: string;
    status: UrlStatus;
    score: number | null;
    emails: string[];
    error: string | null;
    sentCount: number;
    failedCount: number;
    scanResults: Record<string, any> | null;
    emailSubject: string | null;
    emailBody: string | null;
}

interface BatchSummary {
    id: string;
    created_at: string;
    total: number;
    done: number;
    error: number;
    skipped: number;
    sent: number;
}

function normalizeUrl(raw: string): string {
    let u = raw.trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try { return new URL(u).href; } catch { return ''; }
}

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    const [userId, setUserId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [entries, setEntries] = useState<UrlEntry[]>([]);
    const [running, setRunning] = useState(false);
    const [view, setView] = useState<'input' | 'batch'>('input');
    const [batchId, setBatchId] = useState<string | null>(null);
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [contactedDomains, setContactedDomains] = useState<Map<string, string>>(new Map());
    const [duplicates, setDuplicates] = useState<Map<string, string>>(new Map());
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const abortRef = useRef(false);
    const entriesRef = useRef<UrlEntry[]>([]);
    const supabase = createClient();

    useEffect(() => { entriesRef.current = entries; }, [entries]);

    // ── Auth + load data ──
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email !== OWNER_EMAIL) { setAuthorized(false); return; }
            setAuthorized(true);
            setUserId(user.id);
            await Promise.all([loadBatches(), loadContactedDomains()]);
        })();
    }, []);

    // beforeunload warning
    useEffect(() => {
        if (!running) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [running]);

    // ── Check duplicates when input changes ──
    useEffect(() => {
        const urls = input.split(/[,\n]+/).map(s => normalizeUrl(s)).filter(Boolean);
        const dupes = new Map<string, string>();
        for (const url of urls) {
            const d = getDomain(url);
            if (d && contactedDomains.has(d)) {
                dupes.set(d, contactedDomains.get(d)!);
            }
        }
        setDuplicates(dupes);
    }, [input, contactedDomains]);

    // ── DB loaders ──
    async function loadBatches() {
        const { data } = await supabase
            .from('outreach_batches' as any)
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(30);
        const rows = data as any[] | null;
        if (!rows || rows.length === 0) { setBatches([]); return; }

        // Load entry counts for each batch
        const batchIds = rows.map((b: any) => b.id);
        const { data: allEntries } = await supabase
            .from('outreach_entries' as any)
            .select('batch_id, status, sent_count')
            .in('batch_id', batchIds);

        const entryMap = new Map<string, any[]>();
        for (const e of (allEntries as any[] || [])) {
            const arr = entryMap.get(e.batch_id) || [];
            arr.push(e);
            entryMap.set(e.batch_id, arr);
        }

        setBatches(rows.map((b: any) => {
            const ents = entryMap.get(b.id) || [];
            return {
                id: b.id,
                created_at: b.created_at,
                total: ents.length,
                done: ents.filter((e: any) => e.status === 'done').length,
                error: ents.filter((e: any) => e.status === 'error').length,
                skipped: ents.filter((e: any) => e.status === 'skipped').length,
                sent: ents.reduce((s: number, e: any) => s + (e.sent_count || 0), 0),
            };
        }));
    }

    async function loadContactedDomains() {
        const { data } = await supabase
            .from('outreach_entries' as any)
            .select('domain, created_at')
            .eq('status', 'done')
            .order('created_at', { ascending: false });
        if (!data) return;
        const map = new Map<string, string>();
        for (const row of data as any[]) {
            if (!map.has(row.domain)) map.set(row.domain, row.created_at);
        }
        setContactedDomains(map);
    }

    async function loadBatchEntries(bId: string) {
        setBatchId(bId);
        const { data } = await supabase
            .from('outreach_entries' as any)
            .select('*')
            .eq('batch_id', bId)
            .order('created_at', { ascending: true });
        if (!data) return;
        const loaded: UrlEntry[] = data.map((row: any) => ({
            id: row.id,
            url: row.url,
            domain: row.domain,
            status: row.status as UrlStatus,
            score: row.score,
            emails: row.emails || [],
            error: row.error,
            sentCount: row.sent_count || 0,
            failedCount: row.failed_count || 0,
            scanResults: row.scan_results,
            emailSubject: row.email_subject || null,
            emailBody: row.email_body || null,
        }));
        setEntries(loaded);
        entriesRef.current = loaded;
        setView('batch');
    }

    async function deleteBatch(bId: string) {
        await supabase.from('outreach_entries' as any).delete().eq('batch_id', bId);
        await supabase.from('outreach_batches' as any).delete().eq('id', bId);
        setBatches(prev => prev.filter(b => b.id !== bId));
        if (batchId === bId) {
            setEntries([]);
            setBatchId(null);
            setView('input');
        }
        await loadContactedDomains();
    }

    // ── Entry updater (React state + DB) ──
    const updateEntry = useCallback((idx: number, patch: Partial<UrlEntry>) => {
        setEntries(prev => {
            const next = prev.map((e, i) => i === idx ? { ...e, ...patch } : e);
            const entry = next[idx];
            if (entry?.id) {
                const dbPatch: Record<string, any> = { updated_at: new Date().toISOString() };
                if (patch.status !== undefined) dbPatch.status = patch.status;
                if (patch.score !== undefined) dbPatch.score = patch.score;
                if (patch.emails !== undefined) dbPatch.emails = patch.emails;
                if (patch.error !== undefined) dbPatch.error = patch.error;
                if (patch.sentCount !== undefined) dbPatch.sent_count = patch.sentCount;
                if (patch.failedCount !== undefined) dbPatch.failed_count = patch.failedCount;
                if (patch.scanResults !== undefined) dbPatch.scan_results = patch.scanResults;
                if (patch.emailSubject !== undefined) dbPatch.email_subject = patch.emailSubject;
                if (patch.emailBody !== undefined) dbPatch.email_body = patch.emailBody;
                supabase.from('outreach_entries' as any).update(dbPatch).eq('id', entry.id).then();
            }
            return next;
        });
    }, []);

    // ── API helpers ──
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
                await sleep(15000 * (attempt + 1));
                continue;
            }
            throw new Error(msg || `Email generation failed (${res.status})`);
        }
        throw new Error('Email generation failed after retries');
    }

    async function sendEmail(to: string[], subject: string, body: string) {
        const res = await fetch('/api/outreach/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body }),
        });
        if (!res.ok) throw new Error('Send failed');
        return res.json() as Promise<{ sent: number; failed: number }>;
    }

    // ── Process a single entry ──
    async function processEntry(idx: number) {
        const entry = entriesRef.current[idx];
        if (!entry) return;

        try {
            // 1. Scan (skip if we already have results from a previous run)
            let scanData: { results: Record<string, any>; score: number } | null = null;
            if (entry.scanResults) {
                scanData = { results: entry.scanResults, score: entry.score || 0 };
            } else {
                updateEntry(idx, { status: 'scanning' });
                scanData = await runScan(entry.url);
                if (!scanData) {
                    updateEntry(idx, { status: 'error', error: 'No scan results' });
                    return;
                }
                updateEntry(idx, { score: scanData.score, scanResults: scanData.results });
            }

            if (abortRef.current) return;

            // 2. Scrape emails + Generate email in parallel
            updateEntry(idx, { status: 'finding_contacts' });
            const [emails, generated] = await Promise.all([
                scrapeEmails(entry.url),
                generateEmail(scanData.results, entry.url),
            ]);
            updateEntry(idx, { emails, emailSubject: generated.subject, emailBody: generated.body });

            if (emails.length === 0) {
                updateEntry(idx, { status: 'skipped', error: 'No emails found' });
                return;
            }

            if (abortRef.current) return;

            // 3. Send to first (best) email only
            updateEntry(idx, { status: 'sending' });
            const sendResult = await sendEmail([emails[0]], generated.subject, generated.body);
            updateEntry(idx, { status: 'done', sentCount: sendResult.sent, failedCount: sendResult.failed });
        } catch (err: any) {
            const msg = err?.message || 'Unknown error';
            if (msg === 'QUOTA_EXHAUSTED') {
                updateEntry(idx, { status: 'error', error: 'Scan quota exhausted' });
                throw err;
            }
            updateEntry(idx, { status: 'error', error: msg });
        }
    }

    // ── Start new batch ──
    async function startBatch() {
        if (!userId) return;
        const urls = input.split(/[,\n]+/).map(s => normalizeUrl(s)).filter(Boolean);
        if (urls.length === 0) return;

        setRunning(true);
        setView('batch');
        abortRef.current = false;

        // Create batch in DB
        const { data: batch } = await supabase
            .from('outreach_batches' as any)
            .insert({ user_id: userId })
            .select()
            .single();
        if (!batch) { setRunning(false); return; }
        setBatchId((batch as any).id);

        // Create entries in DB
        const entryRows = urls.map(url => ({
            batch_id: (batch as any).id,
            url,
            domain: getDomain(url),
            status: 'pending',
        }));
        const { data: dbEntries } = await supabase
            .from('outreach_entries' as any)
            .insert(entryRows)
            .select();
        if (!dbEntries) { setRunning(false); return; }

        const initial: UrlEntry[] = (dbEntries as any[]).map((row: any) => ({
            id: row.id,
            url: row.url,
            domain: row.domain,
            status: 'pending' as UrlStatus,
            score: null,
            emails: [],
            error: null,
            sentCount: 0,
            failedCount: 0,
            scanResults: null,
            emailSubject: null,
            emailBody: null,
        }));
        setEntries(initial);
        entriesRef.current = initial; // sync ref immediately so processEntry can read it

        // Process sequentially
        for (let i = 0; i < initial.length; i++) {
            if (abortRef.current) break;
            try {
                await processEntry(i);
            } catch (err: any) {
                if (err?.message === 'QUOTA_EXHAUSTED') {
                    for (let j = i + 1; j < initial.length; j++) {
                        updateEntry(j, { status: 'skipped', error: 'Batch stopped (quota exhausted)' });
                    }
                    break;
                }
            }
            if (i < initial.length - 1 && !abortRef.current) await sleep(8000);
        }

        setRunning(false);
        await Promise.all([loadBatches(), loadContactedDomains()]);
    }

    // ── Retry all failed entries ──
    async function retryFailed() {
        const failedIndices = entries.map((e, i) => e.status === 'error' ? i : -1).filter(i => i >= 0);
        if (failedIndices.length === 0) return;

        setRunning(true);
        abortRef.current = false;

        for (const idx of failedIndices) {
            updateEntry(idx, { status: 'pending', error: null });
        }

        for (const idx of failedIndices) {
            if (abortRef.current) break;
            try {
                await processEntry(idx);
            } catch (err: any) {
                if (err?.message === 'QUOTA_EXHAUSTED') break;
            }
            await sleep(8000);
        }

        setRunning(false);
        await Promise.all([loadBatches(), loadContactedDomains()]);
    }

    // ── Retry a single entry ──
    async function retrySingle(idx: number) {
        setRunning(true);
        abortRef.current = false;
        updateEntry(idx, { status: 'pending', error: null });
        try {
            await processEntry(idx);
        } catch { /* already handled in processEntry */ }
        setRunning(false);
        await Promise.all([loadBatches(), loadContactedDomains()]);
    }

    function handleStop() {
        abortRef.current = true;
    }

    function handleNewBatch() {
        setView('input');
        setEntries([]);
        setBatchId(null);
        setInput('');
    }

    function removeUrl(urlToRemove: string) {
        const urls = input.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        const remaining = urls.filter(raw => {
            const normalized = normalizeUrl(raw);
            return normalized !== urlToRemove;
        });
        setInput(remaining.join(', '));
    }

    function removeContacted() {
        const urls = input.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        const remaining = urls.filter(raw => {
            const normalized = normalizeUrl(raw);
            if (!normalized) return true;
            const d = getDomain(normalized);
            return !contactedDomains.has(d);
        });
        setInput(remaining.join(', '));
    }

    // ── Derived state ──
    const doneCount = entries.filter(e => e.status === 'done').length;
    const errorCount = entries.filter(e => e.status === 'error').length;
    const skippedCount = entries.filter(e => e.status === 'skipped').length;
    const totalSent = entries.reduce((s, e) => s + e.sentCount, 0);
    const isComplete = !running && entries.length > 0 && entries.every(e => !['pending', 'scanning', 'finding_contacts', 'generating', 'sending'].includes(e.status));

    const parsedUrls = input.split(/[,\n]+/).map(s => normalizeUrl(s)).filter(Boolean);
    const newUrlCount = parsedUrls.filter(u => !contactedDomains.has(getDomain(u))).length;
    const dupeUrlCount = parsedUrls.filter(u => contactedDomains.has(getDomain(u))).length;

    // ── Auth guard ──
    if (authorized === null) return <div className="p-8 text-zinc-500">Loading...</div>;
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

            {/* ── Batch History ── */}
            {batches.length > 0 && (
                <div className="mb-6">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-2"
                    >
                        {showHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Clock className="h-3.5 w-3.5" />
                        Past batches ({batches.length})
                    </button>
                    {showHistory && (
                        <div className="space-y-1.5">
                            {batches.map(batch => (
                                <div
                                    key={batch.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                        batchId === batch.id
                                            ? 'bg-sky-500/10 border border-sky-500/20'
                                            : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04]'
                                    }`}
                                    onClick={() => loadBatchEntries(batch.id)}
                                >
                                    <span className="text-zinc-500">{formatDate(batch.created_at)}</span>
                                    <span className="text-zinc-400">{batch.total} URLs</span>
                                    {batch.sent > 0 && <span className="text-emerald-400">{batch.sent} sent</span>}
                                    {batch.error > 0 && <span className="text-red-400">{batch.error} errors</span>}
                                    {batch.skipped > 0 && <span className="text-zinc-600">{batch.skipped} skipped</span>}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteBatch(batch.id); }}
                                        className="ml-auto text-zinc-700 hover:text-red-400 transition-colors"
                                        title="Delete batch"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── New Batch Input ── */}
            {view === 'input' && (
                <div className="space-y-4">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Paste URLs separated by commas or newlines..."
                        rows={6}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                    />

                    {/* URL chips with remove buttons */}
                    {parsedUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {parsedUrls.map((url) => {
                                const d = getDomain(url);
                                const isContacted = contactedDomains.has(d);
                                return (
                                    <span
                                        key={url}
                                        className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-mono ${
                                            isContacted
                                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                                : 'bg-white/[0.04] text-zinc-300 border border-white/[0.08]'
                                        }`}
                                    >
                                        {d || url.replace(/^https?:\/\//, '')}
                                        <button
                                            onClick={() => removeUrl(url)}
                                            className="ml-0.5 p-0.5 rounded hover:bg-white/10 transition-colors"
                                            title="Remove"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Duplicate warning + remove all contacted button */}
                    {duplicates.size > 0 && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {duplicates.size} URL{duplicates.size > 1 ? 's' : ''} already contacted
                                </div>
                                <button
                                    onClick={removeContacted}
                                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                                >
                                    Remove all contacted
                                </button>
                            </div>
                        </div>
                    )}

                    {parsedUrls.length > 0 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {parsedUrls.length} URL{parsedUrls.length !== 1 ? 's' : ''} detected
                                {dupeUrlCount > 0 && <span className="text-amber-400"> ({dupeUrlCount} already contacted)</span>}
                                {' — '}will use {parsedUrls.length} scan credit{parsedUrls.length !== 1 ? 's' : ''}.
                            </p>
                            <Button
                                onClick={startBatch}
                                disabled={running}
                                className="bg-sky-500 hover:bg-sky-400 text-white border-0"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                Start batch
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Batch View ── */}
            {view === 'batch' && (
                <>
                    {/* Action bar */}
                    <div className="mb-4 flex items-center gap-2">
                        {running && (
                            <Button onClick={handleStop} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                            </Button>
                        )}
                        {isComplete && errorCount > 0 && (
                            <Button
                                onClick={retryFailed}
                                disabled={running}
                                variant="outline"
                                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Retry failed ({errorCount})
                            </Button>
                        )}
                        {!running && (
                            <Button
                                onClick={handleNewBatch}
                                variant="outline"
                                className="border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                            >
                                <Play className="h-4 w-4 mr-2" />
                                New batch
                            </Button>
                        )}
                    </div>

                    {/* Summary bar */}
                    {isComplete && (
                        <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex flex-wrap gap-4 text-sm">
                            <span className="text-emerald-400">{totalSent} sent</span>
                            <span className="text-zinc-400">{doneCount} completed</span>
                            {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
                            {skippedCount > 0 && <span className="text-zinc-500">{skippedCount} skipped</span>}
                        </div>
                    )}

                    {/* Entries table */}
                    {entries.length > 0 && (
                        <div className="rounded-lg border border-white/[0.08] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                        <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-8">#</th>
                                        <th className="px-4 py-2.5 text-left text-zinc-500 font-medium">URL</th>
                                        <th className="px-4 py-2.5 text-center text-zinc-500 font-medium w-16">Score</th>
                                        <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-28">Emails</th>
                                        <th className="px-4 py-2.5 text-left text-zinc-500 font-medium w-44">Status</th>
                                        <th className="px-4 py-2.5 text-center text-zinc-500 font-medium w-16">Sent</th>
                                        <th className="px-4 py-2.5 text-center text-zinc-500 font-medium w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry, i) => (
                                        <React.Fragment key={entry.id || i}>
                                            <tr
                                                className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${expandedIdx === i ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
                                                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                            >
                                                <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-white truncate max-w-[300px] font-mono text-xs">
                                                    <span className="flex items-center gap-1">
                                                        {expandedIdx === i ? <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" /> : <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />}
                                                        {entry.url.replace(/^https?:\/\//, '')}
                                                    </span>
                                                    {contactedDomains.has(entry.domain) && entry.status !== 'done' && (
                                                        <span className="ml-4 text-[10px] text-amber-500" title={`Previously contacted ${formatDate(contactedDomains.get(entry.domain)!)}`}>
                                                            (contacted)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-center tabular-nums">
                                                    {entry.score !== null ? (
                                                        <span className={entry.score >= 70 ? 'text-emerald-400' : entry.score >= 40 ? 'text-amber-400' : 'text-red-400'}>
                                                            {entry.score}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-700">&mdash;</span>
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
                                                        <span className="text-zinc-700">&mdash;</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <StatusBadge status={entry.status} />
                                                    {entry.error && entry.status === 'error' && (
                                                        <p className="text-[10px] text-red-400/60 mt-0.5 truncate max-w-[180px]">{entry.error}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-center tabular-nums">
                                                    {entry.sentCount > 0 ? (
                                                        <span className="text-emerald-400">{entry.sentCount}</span>
                                                    ) : (
                                                        <span className="text-zinc-700">&mdash;</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {entry.status === 'error' && !running && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); retrySingle(i); }}
                                                            className="text-zinc-600 hover:text-amber-400 transition-colors"
                                                            title="Retry this URL"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedIdx === i && (
                                                <tr className="border-b border-white/[0.04]">
                                                    <td colSpan={7} className="px-6 py-4 bg-white/[0.015]">
                                                        <div className="space-y-3 max-w-2xl">
                                                            {/* Sent to */}
                                                            {entry.emails.length > 0 && (
                                                                <div>
                                                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                                                                        {entry.sentCount > 0 ? 'Sent to' : 'Found emails'}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {entry.emails.map((email, ei) => (
                                                                            <span
                                                                                key={ei}
                                                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                                                                                    ei === 0 && entry.sentCount > 0
                                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                                        : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                                                                                }`}
                                                                            >
                                                                                {ei === 0 && entry.sentCount > 0 && <CheckCircle className="h-3 w-3 mr-1" />}
                                                                                {email}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Subject */}
                                                            {entry.emailSubject && (
                                                                <div>
                                                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Subject</p>
                                                                    <p className="text-sm text-white">{entry.emailSubject}</p>
                                                                </div>
                                                            )}

                                                            {/* Body */}
                                                            {entry.emailBody && (
                                                                <div>
                                                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Email body</p>
                                                                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed bg-white/[0.02] rounded-lg border border-white/[0.06] p-3 max-h-64 overflow-y-auto">
                                                                        {entry.emailBody}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {/* No email generated yet */}
                                                            {!entry.emailSubject && !entry.emailBody && entry.emails.length === 0 && (
                                                                <p className="text-xs text-zinc-600">No email was generated for this entry.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
