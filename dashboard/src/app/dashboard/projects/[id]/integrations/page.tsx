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
    Hash,
    Mail,
    Shield,
    Triangle,
    ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format-date';

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

interface VercelIntegration {
    id: string;
    project_id: string;
    enabled: boolean;
    last_deployment_at: string | null;
    last_scan_id: string | null;
    created_at: string;
}

interface VercelDeployment {
    id: string;
    vercel_deployment_id: string;
    deployment_url: string | null;
    git_branch: string | null;
    git_commit_sha: string | null;
    scan_id: string | null;
    result_score: number | null;
    created_at: string;
}

interface NetlifyIntegration {
    id: string;
    project_id: string;
    enabled: boolean;
    last_deployment_at: string | null;
    last_scan_id: string | null;
    created_at: string;
}

interface NetlifyDeployment {
    id: string;
    netlify_deployment_id: string;
    deployment_url: string | null;
    scan_id: string | null;
    result_score: number | null;
    created_at: string;
}

export default function IntegrationsPage() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
    const [badgeEnabled, setBadgeEnabled] = useState(false);
    const [badgeToggling, setBadgeToggling] = useState(false);

    // Vercel integration state
    const [vercelIntegration, setVercelIntegration] = useState<VercelIntegration | null>(null);
    const [vercelDeployments, setVercelDeployments] = useState<VercelDeployment[]>([]);
    const [vercelLoading, setVercelLoading] = useState(false);
    const [vercelSecret, setVercelSecret] = useState<string | null>(null);
    const [vercelWebhookUrl, setVercelWebhookUrl] = useState<string | null>(null);

    // Netlify integration state
    const [netlifyIntegration, setNetlifyIntegration] = useState<NetlifyIntegration | null>(null);
    const [netlifyDeployments, setNetlifyDeployments] = useState<NetlifyDeployment[]>([]);
    const [netlifyLoading, setNetlifyLoading] = useState(false);
    const [netlifySecret, setNetlifySecret] = useState<string | null>(null);
    const [netlifyWebhookUrl, setNetlifyWebhookUrl] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [whRes, projRes, vercelRes, netlifyRes] = await Promise.all([
                    fetch(`/api/integrations/webhooks?projectId=${projectId}`),
                    fetch(`/api/projects/${projectId}`),
                    fetch(`/api/integrations/vercel?projectId=${projectId}`),
                    fetch(`/api/integrations/netlify?projectId=${projectId}`),
                ]);
                const whData = await whRes.json();
                setWebhooks(Array.isArray(whData) ? whData : []);

                if (projRes.ok) {
                    const projData = await projRes.json();
                    setBadgeEnabled(!!projData.project?.badge_enabled);
                }

                if (vercelRes.ok) {
                    const vercelData = await vercelRes.json();
                    setVercelIntegration(vercelData.integration || null);
                    setVercelDeployments(vercelData.deployments || []);
                }

                if (netlifyRes.ok) {
                    const netlifyData = await netlifyRes.json();
                    setNetlifyIntegration(netlifyData.integration || null);
                    setNetlifyDeployments(netlifyData.deployments || []);
                }
            } catch {
                setError('Failed to load integrations. Please refresh the page.');
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
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create webhook. Please verify the URL and try again.');
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
            toast.error('Failed to delete webhook. Please try again.');
        }
    }

    async function enableVercel() {
        setVercelLoading(true);
        try {
            const res = await fetch('/api/integrations/vercel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setVercelIntegration({
                id: data.id,
                project_id: data.project_id,
                enabled: true,
                last_deployment_at: null,
                last_scan_id: null,
                created_at: data.created_at,
            });
            setVercelSecret(data.webhook_secret);
            setVercelWebhookUrl(data.webhook_url);
            toast.success('Vercel deploy hook enabled');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to enable Vercel integration. Please try again.');
        } finally {
            setVercelLoading(false);
        }
    }

    async function disableVercel() {
        setVercelLoading(true);
        try {
            const res = await fetch(`/api/integrations/vercel?projectId=${projectId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setVercelIntegration(null);
            setVercelDeployments([]);
            setVercelSecret(null);
            setVercelWebhookUrl(null);
            toast.success('Vercel deploy hook removed');
        } catch {
            toast.error('Failed to remove Vercel integration. Please try again.');
        } finally {
            setVercelLoading(false);
        }
    }

    async function enableNetlify() {
        setNetlifyLoading(true);
        try {
            const res = await fetch('/api/integrations/netlify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setNetlifyIntegration({
                id: data.id,
                project_id: data.project_id,
                enabled: true,
                last_deployment_at: null,
                last_scan_id: null,
                created_at: data.created_at,
            });
            setNetlifySecret(data.webhook_secret);
            setNetlifyWebhookUrl(data.webhook_url);
            toast.success('Netlify deploy hook enabled');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to enable Netlify integration. Please try again.');
        } finally {
            setNetlifyLoading(false);
        }
    }

    async function disableNetlify() {
        setNetlifyLoading(true);
        try {
            const res = await fetch(`/api/integrations/netlify?projectId=${projectId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setNetlifyIntegration(null);
            setNetlifyDeployments([]);
            setNetlifySecret(null);
            setNetlifyWebhookUrl(null);
            toast.success('Netlify deploy hook removed');
        } catch {
            toast.error('Failed to remove Netlify integration. Please try again.');
        } finally {
            setNetlifyLoading(false);
        }
    }

    async function toggleBadge() {
        setBadgeToggling(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ badgeEnabled: !badgeEnabled }),
            });
            if (res.ok) {
                setBadgeEnabled(!badgeEnabled);
                toast.success(badgeEnabled ? 'Badge disabled' : 'Badge enabled');
            } else {
                toast.error('Failed to update security badge. Please try again.');
            }
        } catch {
            toast.error('Failed to update security badge. Please check your connection and try again.');
        } finally {
            setBadgeToggling(false);
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
            {/* Badge */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Shield className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">Security Badge</h3>
                            <p className="text-xs text-zinc-500">Add a security score badge to your README</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleBadge}
                        disabled={badgeToggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${badgeEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${badgeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {badgeEnabled ? (
                    <>
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
                    </>
                ) : (
                    <p className="text-xs text-zinc-500">Enable the badge to publicly display your project&apos;s security score</p>
                )}
            </div>

            {/* CI/CD Integration */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <GitBranch className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">GitHub Actions</h3>
                        <p className="text-xs text-zinc-500">Run security checks in your CI/CD pipeline</p>
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

            {/* Vercel Deploy Hook */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/[0.05]">
                            <Triangle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">Vercel Deploy Hook</h3>
                            <p className="text-xs text-zinc-500">Auto-check on every Vercel deployment</p>
                        </div>
                    </div>
                    {vercelIntegration ? (
                        <button
                            onClick={disableVercel}
                            disabled={vercelLoading}
                            className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-md hover:bg-red-500/5"
                        >
                            {vercelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
                        </button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={enableVercel}
                            disabled={vercelLoading}
                            className="bg-white hover:bg-zinc-200 text-black text-xs"
                        >
                            {vercelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enable'}
                        </Button>
                    )}
                </div>

                {/* Show secret once after creation */}
                {vercelSecret && vercelWebhookUrl && (
                    <div className="mb-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] space-y-3">
                        <p className="text-xs font-medium text-amber-400">Setup instructions (shown once)</p>
                        <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">1. Webhook URL</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs text-zinc-300 bg-black/30 px-2 py-1 rounded break-all flex-1">{vercelWebhookUrl}</code>
                                <button
                                    onClick={() => copyToClipboard(vercelWebhookUrl, 'vcel-url')}
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    {copiedId === 'vcel-url' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">2. Signing Secret</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs text-zinc-300 bg-black/30 px-2 py-1 rounded break-all flex-1">{vercelSecret}</code>
                                <button
                                    onClick={() => copyToClipboard(vercelSecret, 'vcel-secret')}
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    {copiedId === 'vcel-secret' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            Go to your Vercel project &rarr; Settings &rarr; Webhooks &rarr; paste the URL and secret above.
                        </p>
                        <button onClick={() => { setVercelSecret(null); setVercelWebhookUrl(null); }} className="text-xs text-zinc-500 hover:text-zinc-300">
                            Dismiss
                        </button>
                    </div>
                )}

                {vercelIntegration && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                <Check className="h-3 w-3" /> Active
                            </span>
                            {vercelIntegration.last_deployment_at && (
                                <span>
                                    &middot; Last deploy: {formatDate(vercelIntegration.last_deployment_at, 'short')}
                                </span>
                            )}
                        </div>

                        {vercelDeployments.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Recent Deployments</h4>
                                <div className="space-y-2">
                                    {vercelDeployments.map((dep) => (
                                        <div key={dep.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.01] text-xs">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {dep.deployment_url && (
                                                    <>
                                                        <a href={dep.deployment_url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 truncate flex items-center gap-1" title={dep.deployment_url}>
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{dep.deployment_url.replace(/^https?:\/\//, '')}</span>
                                                        </a>
                                                        <button
                                                            onClick={() => copyToClipboard(dep.deployment_url!, `vcel-dep-${dep.id}`)}
                                                            className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
                                                            title="Copy URL"
                                                        >
                                                            {copiedId === `vcel-dep-${dep.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                        </button>
                                                    </>
                                                )}
                                                {dep.git_branch && (
                                                    <span className="text-zinc-600 shrink-0">{dep.git_branch}</span>
                                                )}
                                                {dep.git_commit_sha && (
                                                    <code className="text-zinc-600 font-mono">{dep.git_commit_sha.slice(0, 7)}</code>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {dep.result_score !== null && (
                                                    <span className={`font-semibold tabular-nums ${dep.result_score >= 80 ? 'text-emerald-400' : dep.result_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {dep.result_score}
                                                    </span>
                                                )}
                                                <span className="text-zinc-600">{formatDate(dep.created_at, 'short')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!vercelIntegration && (
                    <p className="text-xs text-zinc-500">Enable to automatically run a security check after every Vercel deployment succeeds.</p>
                )}
            </div>

            {/* Netlify Deploy Hook */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/10">
                            <GitBranch className="h-4 w-4 text-teal-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">Netlify Deploy Hook</h3>
                            <p className="text-xs text-zinc-500">Auto-check on every Netlify deployment</p>
                        </div>
                    </div>
                    {netlifyIntegration ? (
                        <button
                            onClick={disableNetlify}
                            disabled={netlifyLoading}
                            className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-md hover:bg-red-500/5"
                        >
                            {netlifyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
                        </button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={enableNetlify}
                            disabled={netlifyLoading}
                            className="bg-teal-500 hover:bg-teal-400 text-white text-xs"
                        >
                            {netlifyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enable'}
                        </Button>
                    )}
                </div>

                {/* Show secret once after creation */}
                {netlifySecret && netlifyWebhookUrl && (
                    <div className="mb-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] space-y-3">
                        <p className="text-xs font-medium text-amber-400">Setup instructions (shown once)</p>
                        <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">1. Webhook URL</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs text-zinc-300 bg-black/30 px-2 py-1 rounded break-all flex-1">{netlifyWebhookUrl}</code>
                                <button
                                    onClick={() => copyToClipboard(netlifyWebhookUrl, 'ntlf-url')}
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    {copiedId === 'ntlf-url' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">2. Signing Secret</label>
                            <div className="flex items-center gap-2">
                                <code className="text-xs text-zinc-300 bg-black/30 px-2 py-1 rounded break-all flex-1">{netlifySecret}</code>
                                <button
                                    onClick={() => copyToClipboard(netlifySecret, 'ntlf-secret')}
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    {copiedId === 'ntlf-secret' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            Go to your Netlify site &rarr; Site settings &rarr; Notifications &rarr; Outgoing webhooks &rarr; Deploy succeeded &rarr; paste the URL above. Set the secret in the webhook config.
                        </p>
                        <button onClick={() => { setNetlifySecret(null); setNetlifyWebhookUrl(null); }} className="text-xs text-zinc-500 hover:text-zinc-300">
                            Dismiss
                        </button>
                    </div>
                )}

                {netlifyIntegration && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                <Check className="h-3 w-3" /> Active
                            </span>
                            {netlifyIntegration.last_deployment_at && (
                                <span>
                                    &middot; Last deploy: {formatDate(netlifyIntegration.last_deployment_at, 'short')}
                                </span>
                            )}
                        </div>

                        {netlifyDeployments.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Recent Deployments</h4>
                                <div className="space-y-2">
                                    {netlifyDeployments.map((dep) => (
                                        <div key={dep.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.01] text-xs">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {dep.deployment_url && (
                                                    <>
                                                        <a href={dep.deployment_url} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 truncate flex items-center gap-1" title={dep.deployment_url}>
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{dep.deployment_url.replace(/^https?:\/\//, '')}</span>
                                                        </a>
                                                        <button
                                                            onClick={() => copyToClipboard(dep.deployment_url!, `ntlf-dep-${dep.id}`)}
                                                            className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
                                                            title="Copy URL"
                                                        >
                                                            {copiedId === `ntlf-dep-${dep.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {dep.result_score !== null && (
                                                    <span className={`font-semibold tabular-nums ${dep.result_score >= 80 ? 'text-emerald-400' : dep.result_score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {dep.result_score}
                                                    </span>
                                                )}
                                                <span className="text-zinc-600">{formatDate(dep.created_at, 'short')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!netlifyIntegration && (
                    <p className="text-xs text-zinc-500">Enable to automatically run a security check after every Netlify deployment succeeds.</p>
                )}
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
                            <div key={wh.id} className="flex items-start sm:items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.01] gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <p className="text-sm text-zinc-300 truncate" title={wh.url}>{wh.url}</p>
                                        <button
                                            onClick={() => copyToClipboard(wh.url, `wh-${wh.id}`)}
                                            className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
                                            title="Copy URL"
                                        >
                                            {copiedId === `wh-${wh.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
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
                                    className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 p-2.5 -mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <Trash2 className="h-4 w-4" />
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

            {/* Request Integration */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white/[0.05]">
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Request Integration</h3>
                        <p className="text-xs text-zinc-500">Vote for the integrations you want to see next</p>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {[
                        { name: 'Slack', icon: <Hash className="h-4 w-4 text-amber-400" />, bg: 'bg-amber-500/10', description: 'Post scan results to Slack channels' },
                        { name: 'Discord', icon: <MessageSquare className="h-4 w-4 text-indigo-400" />, bg: 'bg-indigo-500/10', description: 'Send alerts to Discord servers' },
                        { name: 'Other', icon: <Mail className="h-4 w-4 text-zinc-400" />, bg: 'bg-white/[0.05]', description: 'Suggest a new integration' },
                    ].map((integration) => (
                        <div
                            key={integration.name}
                            className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-md ${integration.bg}`}>
                                    {integration.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">{integration.name}</p>
                                    <p className="text-[11px] text-zinc-500">{integration.description}</p>
                                </div>
                            </div>
                            <a
                                href={`mailto:support@checkvibe.dev?subject=${encodeURIComponent(`Integration Request: ${integration.name}`)}&body=${encodeURIComponent(`Hi CheckVibe team,\n\nI'd like to request the ${integration.name} integration for my project.\n\nThanks!`)}`}
                                className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                            >
                                Request
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
