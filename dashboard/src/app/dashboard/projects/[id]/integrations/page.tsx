'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Webhook,
    Plus,
    Trash2,
    Copy,
    Check,
    Loader2,
    GitBranch,
    Code2,
    MessageSquare,
    Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WebhookEntry {
    id: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string;
    last_triggered_at: string | null;
    last_status: number | null;
    created_at: string;
}

export default function IntegrationsPage() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;

    const [loading, setLoading] = useState(true);
    const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/integrations/webhooks?projectId=${projectId}`);
                const data = await res.json();
                setWebhooks(Array.isArray(data) ? data : []);
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [projectId]);

    async function addWebhook() {
        if (!newUrl.trim()) return;
        setAdding(true);
        try {
            const res = await fetch('/api/integrations/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, url: newUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setNewWebhookSecret(data.secret);
            setWebhooks([data, ...webhooks]);
            setNewUrl('');
            toast.success('Webhook created');
        } catch (e: any) {
            toast.error(e.message || 'Failed to create webhook');
        } finally {
            setAdding(false);
        }
    }

    async function deleteWebhook(id: string) {
        try {
            const res = await fetch(`/api/integrations/webhooks?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setWebhooks(webhooks.filter(w => w.id !== id));
            toast.success('Webhook deleted');
        } catch {
            toast.error('Failed to delete webhook');
        }
    }

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    }

    const badgeUrl = `https://checkvibe.dev/api/badge/project/${projectId}`;
    const badgeMarkdown = `[![CheckVibe Security](${badgeUrl})](https://checkvibe.dev)`;

    const ciSnippet = `# .github/workflows/security-audit.yml
name: Security Audit
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM UTC

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run CheckVibe Audit
        run: |
          curl -X POST https://checkvibe.dev/api/scan \\
            -H "Authorization: Bearer \${{ secrets.CHECKVIBE_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"projectId": "${projectId}"}'`;

    const webhookPayloadExample = `{
  "event": "scan.completed",
  "project_id": "${projectId}",
  "scan_id": "uuid",
  "overall_score": 85,
  "issues": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 3
  },
  "timestamp": "2026-02-20T06:00:00Z"
}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full space-y-8">
            {/* Badge */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Shield className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Security Badge</h3>
                        <p className="text-xs text-zinc-500">Add a security score badge to your README</p>
                    </div>
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between">
                        <code className="text-xs text-zinc-400 break-all">{badgeMarkdown}</code>
                        <button
                            onClick={() => copyToClipboard(badgeMarkdown, 'badge')}
                            className="ml-3 text-zinc-500 hover:text-white transition-colors shrink-0"
                        >
                            {copiedId === 'badge' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <p className="text-[11px] text-zinc-600">Paste this in your GitHub README.md to show your security score</p>
            </div>

            {/* CI/CD Integration */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <GitBranch className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">GitHub Actions</h3>
                        <p className="text-xs text-zinc-500">Run security audits in your CI/CD pipeline</p>
                    </div>
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-3 relative">
                    <button
                        onClick={() => copyToClipboard(ciSnippet, 'ci')}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
                    >
                        {copiedId === 'ci' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre">{ciSnippet}</pre>
                </div>
                <p className="text-[11px] text-zinc-600">
                    Add your API key as <code className="text-zinc-500">CHECKVIBE_API_KEY</code> in GitHub Secrets
                </p>
            </div>

            {/* Webhooks */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sky-500/10">
                            <Webhook className="h-4 w-4 text-sky-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">Webhooks</h3>
                            <p className="text-xs text-zinc-500">Get notified via HTTP when events occur</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Webhook
                    </Button>
                </div>

                {/* Add form */}
                {showAddForm && (
                    <div className="mb-6 p-4 rounded-lg border border-white/[0.06] bg-white/[0.01]">
                        <label className="text-xs text-zinc-400 mb-1.5 block">Endpoint URL</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://your-server.com/webhook"
                                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600"
                            />
                            <Button
                                size="sm"
                                onClick={addWebhook}
                                disabled={adding || !newUrl.trim()}
                                className="bg-sky-500 hover:bg-sky-400 text-white"
                            >
                                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Show secret once after creation */}
                {newWebhookSecret && (
                    <div className="mb-6 p-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.03]">
                        <p className="text-xs font-medium text-amber-400 mb-2">Webhook signing secret (shown once)</p>
                        <div className="flex items-center gap-2">
                            <code className="text-xs text-zinc-300 bg-black/30 px-2 py-1 rounded break-all flex-1">{newWebhookSecret}</code>
                            <button
                                onClick={() => copyToClipboard(newWebhookSecret, 'secret')}
                                className="text-zinc-500 hover:text-white transition-colors shrink-0"
                            >
                                {copiedId === 'secret' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <button onClick={() => setNewWebhookSecret(null)} className="text-xs text-zinc-500 hover:text-zinc-300 mt-2">
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Webhook list */}
                {webhooks.length === 0 ? (
                    <p className="text-sm text-zinc-600 text-center py-8">No webhooks configured</p>
                ) : (
                    <div className="space-y-3">
                        {webhooks.map((wh) => (
                            <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]">
                                <div className="min-w-0">
                                    <p className="text-sm text-zinc-300 truncate">{wh.url}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-zinc-600">
                                            Events: {wh.events.join(', ')}
                                        </span>
                                        {wh.last_status && (
                                            <span className={`text-[10px] ${wh.last_status < 300 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                Last: {wh.last_status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteWebhook(wh.id)}
                                    className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 p-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Payload example */}
                <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Code2 className="h-3.5 w-3.5 text-zinc-500" />
                        <p className="text-xs font-medium text-zinc-400">Example payload</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-4 relative">
                        <button
                            onClick={() => copyToClipboard(webhookPayloadExample, 'payload')}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
                        >
                            {copiedId === 'payload' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre">{webhookPayloadExample}</pre>
                    </div>
                </div>
            </div>

            {/* Slack / Discord (Coming Soon) */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 opacity-60">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.03]">
                        <MessageSquare className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            Slack & Discord
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Coming Soon</span>
                        </h3>
                        <p className="text-xs text-zinc-500">Send scan results directly to your team channels</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
