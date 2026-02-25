'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Mail, Send, Loader2, Check, RefreshCw, Search, Github, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface OutreachEmailModalProps {
    scanResults: Record<string, any>;
    projectUrl: string;
    issueCount: number;
    severityBreakdown: { critical: number; high: number; medium: number; low: number };
}

interface ScrapedEmail {
    email: string;
    source: string;
}

export function OutreachEmailModal({ scanResults, projectUrl, issueCount, severityBreakdown }: OutreachEmailModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendResults, setSendResults] = useState<{ email: string; success: boolean }[]>([]);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [generated, setGenerated] = useState(false);

    // Email scraping state
    const [scraping, setScraping] = useState(false);
    const [scrapedEmails, setScrapedEmails] = useState<ScrapedEmail[]>([]);
    const [scraped, setScraped] = useState(false);
    const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

    const handleScrapeEmails = async () => {
        setScraping(true);
        try {
            const res = await fetch('/api/outreach/scrape-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: projectUrl }),
            });
            if (!res.ok) {
                toast.error('Failed to scan for emails');
                return;
            }
            const data = await res.json();
            const emails = (data.emails || []) as ScrapedEmail[];
            setScrapedEmails(emails);
            setScraped(true);
            if (data.socialLinks) setSocialLinks(data.socialLinks);

            const realEmails = emails.filter((e: ScrapedEmail) => e.source !== 'pattern');
            const patternEmails = emails.filter((e: ScrapedEmail) => e.source === 'pattern');

            if (realEmails.length > 0) {
                const selected = new Set<string>(realEmails.map((e: ScrapedEmail) => e.email));
                setSelectedEmails(selected);
                setRecipientEmail(Array.from(selected).join(', '));
                toast.success(`Found ${realEmails.length} email${realEmails.length > 1 ? 's — will send to all' : ''}`);
            } else if (patternEmails.length > 0) {
                // Auto-select first 3 common patterns
                const top = patternEmails.slice(0, 3);
                const selected = new Set<string>(top.map((e: ScrapedEmail) => e.email));
                setSelectedEmails(selected);
                setRecipientEmail(Array.from(selected).join(', '));
                toast('No emails found — using common patterns (MX verified)');
            } else {
                toast('No emails found on the website');
            }
        } catch {
            toast.error('Failed to scan for emails');
        } finally {
            setScraping(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setSent(false);

        // Run email scraping in parallel with generation
        if (!scraped) handleScrapeEmails();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120000);
            const res = await fetch('/api/outreach/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanResults, projectUrl, issueCount, severityBreakdown }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err.error || '';
                if (msg.includes('429') || msg.includes('quota')) {
                    toast.error('Gemini rate limit hit. Wait a minute and try again.');
                } else {
                    toast.error(msg || `Failed to generate email (${res.status})`);
                }
                console.error('Generate email error:', err);
                return;
            }
            const data = await res.json();
            setSubject(data.subject);
            setBody(data.body);
            setGenerated(true);
        } catch {
            toast.error('Failed to generate email');
        } finally {
            setGenerating(false);
        }
    };

    const handleSend = async () => {
        const emails = Array.from(selectedEmails).filter(e => e.trim());
        if (emails.length === 0) {
            toast.error('Select at least one recipient');
            return;
        }
        setSending(true);
        setSendResults([]);
        try {
            const res = await fetch('/api/outreach/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: emails, subject, body }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || 'Failed to send email');
                return;
            }
            const data = await res.json();
            setSendResults(data.results || []);
            setSent(true);
            if (data.sent > 0 && data.failed === 0) {
                toast.success(`Sent to ${data.sent} recipient${data.sent > 1 ? 's' : ''}`);
            } else if (data.sent > 0 && data.failed > 0) {
                toast.success(`Sent to ${data.sent}, failed for ${data.failed}`);
            } else {
                toast.error(`Failed to send to all ${data.failed} recipients`);
            }
        } catch {
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    const toggleEmail = (email: string) => {
        setSelectedEmails(prev => {
            const next = new Set(prev);
            if (next.has(email)) next.delete(email);
            else next.add(email);
            setRecipientEmail(Array.from(next).join(', '));
            return next;
        });
    };

    const handleReset = () => {
        setGenerated(false);
        setSubject('');
        setBody('');
        setRecipientEmail('');
        setSent(false);
        setSendResults([]);
        setSelectedEmails(new Set());
        setScrapedEmails([]);
        setScraped(false);
        setSocialLinks({});
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) handleReset(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300">
                    <Mail className="mr-2 h-4 w-4" />
                    Generate Email
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#070D19] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Mail className="h-5 w-5 text-violet-400" />
                        Outreach Email Generator
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Generate a marketing email based on this scan&apos;s findings using Gemini AI.
                    </DialogDescription>
                </DialogHeader>

                {/* Summary */}
                <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm">
                    <div className="flex items-center gap-4 text-zinc-400">
                        <span>URL: <span className="text-zinc-200">{projectUrl}</span></span>
                        <span>Issues: <span className="text-white font-medium">{issueCount}</span></span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs">
                        {severityBreakdown.critical > 0 && <span className="text-red-400">{severityBreakdown.critical} critical</span>}
                        {severityBreakdown.high > 0 && <span className="text-orange-400">{severityBreakdown.high} high</span>}
                        {severityBreakdown.medium > 0 && <span className="text-amber-400">{severityBreakdown.medium} medium</span>}
                        {severityBreakdown.low > 0 && <span className="text-sky-400">{severityBreakdown.low} low</span>}
                    </div>
                </div>

                {!generated ? (
                    <div className="mt-4 flex flex-col items-center gap-3">
                        <Button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="bg-violet-600 hover:bg-violet-500 text-white px-6"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating with Gemini...
                                </>
                            ) : (
                                <>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Generate Email
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {/* Recipient with auto-detect */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Email</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={recipientEmail}
                                    onChange={(e) => {
                                        setRecipientEmail(e.target.value);
                                        const parsed = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                        setSelectedEmails(new Set(parsed));
                                    }}
                                    placeholder="founder@example.com"
                                    className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleScrapeEmails}
                                    disabled={scraping}
                                    className="shrink-0 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                                    title="Auto-detect email from website"
                                >
                                    {scraping ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                    <span className="ml-1.5 text-xs">Detect</span>
                                </Button>
                            </div>

                            {/* Scraped email results */}
                            {scraped && scrapedEmails.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                    <span className="text-[11px] text-zinc-500">
                                        {scrapedEmails.some(e => e.source !== 'pattern') ? 'Found:' : 'MX-verified patterns:'}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {scrapedEmails.map(({ email, source }) => {
                                            const sourceLabel = source === 'pattern' ? 'MX'
                                                : source === 'github' ? 'GitHub'
                                                : source === 'security.txt' ? 'security.txt'
                                                : source === 'dns-soa' ? 'DNS'
                                                : source === 'whois' ? 'WHOIS'
                                                : source === 'google' ? 'Google'
                                                : source.startsWith('sitemap:') ? 'sitemap'
                                                : source;
                                            return (
                                                <button
                                                    key={email}
                                                    onClick={() => toggleEmail(email)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                                                        selectedEmails.has(email)
                                                            ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                                                            : source === 'pattern'
                                                                ? 'bg-white/[0.02] border border-dashed border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                                                                : 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                                                    }`}
                                                >
                                                    {source === 'github' ? <Github className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                                    {email}
                                                    <span className="text-zinc-600 text-[10px]">{sourceLabel}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Social links context */}
                                    {Object.keys(socialLinks).length > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Globe className="h-3 w-3 text-zinc-600" />
                                            <span className="text-[10px] text-zinc-600">Social:</span>
                                            {socialLinks.github && <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 hover:text-white underline">{socialLinks.github.replace('https://github.com/', 'github/')}</a>}
                                            {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 hover:text-white underline">{socialLinks.twitter.replace(/https?:\/\/(twitter|x)\.com\//, '@')}</a>}
                                            {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 hover:text-white underline">LinkedIn</a>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {scraped && scrapedEmails.length === 0 && (
                                <p className="mt-1.5 text-[11px] text-zinc-600">No emails found on the website. Enter one manually.</p>
                            )}
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500/50"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Body</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={12}
                                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-violet-500/50 resize-y"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                            <Button
                                variant="ghost"
                                onClick={handleGenerate}
                                disabled={generating}
                                className="text-zinc-400 hover:text-white hover:bg-white/5"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                                Regenerate
                            </Button>
                            <div className="flex-1" />
                            <Button
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-white/5 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={sending || sent || selectedEmails.size === 0}
                                className={sent ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}
                            >
                                {sent ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        {sendResults.length > 0
                                            ? `${sendResults.filter(r => r.success).length}/${sendResults.length} Sent`
                                            : 'Sent!'}
                                    </>
                                ) : sending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending to {selectedEmails.size}...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        {selectedEmails.size > 1
                                            ? `Send to ${selectedEmails.size}`
                                            : 'Send Email'}
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Send results */}
                        {sent && sendResults.length > 1 && (
                            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1">
                                <span className="text-[11px] text-zinc-500">Send results:</span>
                                {sendResults.map(r => (
                                    <div key={r.email} className="flex items-center gap-2 text-xs">
                                        {r.success
                                            ? <Check className="h-3 w-3 text-emerald-400" />
                                            : <span className="text-red-400 text-[10px]">FAIL</span>}
                                        <span className={r.success ? 'text-zinc-300' : 'text-zinc-500 line-through'}>{r.email}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
