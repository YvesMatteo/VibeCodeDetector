'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Key,
    Plus,
    Copy,
    Check,
    Trash2,
    Clock,
    Shield,
    Globe,
    AlertTriangle,
    BookOpen,
    Terminal,
    ChevronDown,
    ChevronUp,
    Cpu,
} from 'lucide-react';

interface ApiKey {
    id: string;
    key_prefix: string;
    name: string;
    scopes: string[];
    allowed_domains: string[] | null;
    allowed_ips: string[] | null;
    expires_at: string | null;
    revoked_at: string | null;
    last_used_at: string | null;
    created_at: string;
}

const SCOPE_OPTIONS = [
    { value: 'scan:read', label: 'Read Scans', description: 'View scan results and history (GET /api/scan)' },
    { value: 'scan:write', label: 'Run Scans', description: 'Trigger new security scans (POST /api/scan)' },
    { value: 'keys:read', label: 'List Keys', description: 'View your API keys (GET /api/keys)' },
    { value: 'keys:manage', label: 'Manage Keys', description: 'Create and revoke keys (POST/DELETE /api/keys)' },
];

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    // Create dialog state
    const [showCreate, setShowCreate] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['scan:read']);
    const [newKeyDomains, setNewKeyDomains] = useState('');
    const [newKeyExpiry, setNewKeyExpiry] = useState('90');

    // Show-once key dialog
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Revoke confirmation
    const [showRevoke, setShowRevoke] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

    // Permanent delete
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

    // Docs collapsed state
    const [docsOpen, setDocsOpen] = useState(true);
    const [mcpOpen, setMcpOpen] = useState(true);

    const fetchKeys = useCallback(async () => {
        try {
            const res = await fetch('/api/keys');
            const data = await res.json();
            setKeys(data.keys || []);
        } catch (err) {
            console.error('Failed to fetch keys:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    // Auto-collapse docs if user has keys
    useEffect(() => {
        if (keys.length > 0) {
            setDocsOpen(false);
            setMcpOpen(false);
        }
    }, [keys.length]);

    async function handleCreate() {
        setCreating(true);
        try {
            const domains = newKeyDomains.trim()
                ? newKeyDomains.split(',').map(d => d.trim()).filter(Boolean)
                : null;

            const res = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newKeyName || 'Default',
                    scopes: newKeyScopes,
                    allowed_domains: domains,
                    expires_in_days: parseInt(newKeyExpiry) || 90,
                }),
            });

            const data = await res.json();
            if (res.ok && data.key) {
                setCreatedKey(data.key);
                setShowCreate(false);
                resetCreateForm();
                fetchKeys();
            } else {
                alert(data.error || 'Failed to create key');
            }
        } catch (err) {
            console.error('Failed to create key:', err);
        } finally {
            setCreating(false);
        }
    }

    function resetCreateForm() {
        setNewKeyName('');
        setNewKeyScopes(['scan:read']);
        setNewKeyDomains('');
        setNewKeyExpiry('90');
    }

    async function handleRevoke() {
        if (!revokeTarget) return;
        setRevoking(revokeTarget.id);
        try {
            const res = await fetch(`/api/keys/${revokeTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchKeys();
                setShowRevoke(false);
                setRevokeTarget(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to revoke key');
            }
        } catch (err) {
            console.error('Failed to revoke key:', err);
        } finally {
            setRevoking(null);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(deleteTarget.id);
        try {
            const res = await fetch(`/api/keys/${deleteTarget.id}?permanent=true`, { method: 'DELETE' });
            if (res.ok) {
                fetchKeys();
                setShowDelete(false);
                setDeleteTarget(null);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete key');
            }
        } catch (err) {
            console.error('Failed to delete key:', err);
        } finally {
            setDeleting(null);
        }
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function toggleScope(scope: string) {
        setNewKeyScopes(prev =>
            prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
        );
    }

    function getKeyStatus(key: ApiKey): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' } {
        if (key.revoked_at) return { label: 'Revoked', variant: 'destructive' };
        if (key.expires_at && new Date(key.expires_at) < new Date()) return { label: 'Expired', variant: 'secondary' };
        return { label: 'Active', variant: 'default' };
    }

    function formatDate(date: string | null) {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    }

    function formatRelative(date: string | null) {
        if (!date) return 'Never';
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    const activeKeys = keys.filter(k => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) >= new Date()));
    const inactiveKeys = keys.filter(k => k.revoked_at || (k.expires_at && new Date(k.expires_at) < new Date()));

    return (
        <div className="p-5 md:p-10 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                        API Keys
                    </h1>
                    <p className="text-zinc-500 text-[15px]">
                        Manage API keys for programmatic access to CheckVibe
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 w-full sm:w-auto shrink-0 rounded-lg text-[13px] font-medium"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create Key
                </Button>
            </div>

            {/* Getting Started */}
            <div className="mb-5">
                <button
                    onClick={() => setDocsOpen(!docsOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-[14px] font-medium text-white">Getting Started</p>
                            <p className="text-[12px] text-zinc-500">Authentication and API usage</p>
                        </div>
                    </div>
                    {docsOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {docsOpen && (
                    <div className="mt-1 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-4">
                        <div>
                            <h4 className="text-[13px] font-medium text-zinc-300 mb-2">Authentication</h4>
                            <p className="text-[12px] text-zinc-500 mb-3">
                                Include your API key in the Authorization header:
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[12px] text-zinc-400 mb-1">Run a scan:</p>
                                <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-[12px] text-green-400 font-mono overflow-x-auto">
{`curl -X POST https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                                </pre>
                            </div>
                            <div>
                                <p className="text-[12px] text-zinc-400 mb-1">List scans:</p>
                                <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-[12px] text-green-400 font-mono overflow-x-auto">
{`curl https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                                </pre>
                            </div>
                            <div>
                                <p className="text-[12px] text-zinc-400 mb-1">Get scan results:</p>
                                <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-[12px] text-green-400 font-mono overflow-x-auto">
{`curl https://checkvibe.dev/api/scan/SCAN_ID \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MCP Server Config */}
            <div className="mb-8">
                <button
                    onClick={() => setMcpOpen(!mcpOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Cpu className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-[14px] font-medium text-white">Use with Claude Code (MCP)</p>
                            <p className="text-[12px] text-zinc-500">Let coding agents run security scans</p>
                        </div>
                    </div>
                    {mcpOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </button>
                {mcpOpen && (
                    <div className="mt-1 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
                        <p className="text-[12px] text-zinc-500">
                            Add to your <code className="text-zinc-400">.claude/settings.json</code> or <code className="text-zinc-400">claude_desktop_config.json</code>:
                        </p>
                        <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-[12px] text-green-400 font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "checkvibe": {
      "command": "npx",
      "args": ["-y", "@checkvibe/mcp-server"],
      "env": {
        "CHECKVIBE_API_KEY": "cvd_live_YOUR_KEY"
      }
    }
  }
}`}
                        </pre>
                        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                            <Terminal className="h-3.5 w-3.5" />
                            <span>Available tools: <code className="text-zinc-400">run_scan</code>, <code className="text-zinc-400">get_scan_results</code>, <code className="text-zinc-400">list_scans</code></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Keys */}
            <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-1">
                    <Key className="h-4 w-4 text-blue-400" />
                    <h2 className="text-lg font-heading font-medium text-white">Active Keys ({activeKeys.length})</h2>
                </div>
                <p className="text-[13px] text-zinc-600 mb-4">Keys that can authenticate API requests</p>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    {loading ? (
                        <div className="text-zinc-500 text-[13px] p-5">Loading...</div>
                    ) : activeKeys.length === 0 ? (
                        <div className="text-center py-10 px-5">
                            <div className="h-10 w-10 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                                <Key className="h-4 w-4 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 text-[13px]">No active API keys</p>
                            <p className="text-zinc-600 text-[12px] mt-1">Create a key to get started with the API</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {activeKeys.map(key => (
                                <KeyRow
                                    key={key.id}
                                    apiKey={key}
                                    status={getKeyStatus(key)}
                                    formatDate={formatDate}
                                    formatRelative={formatRelative}
                                    onRevoke={() => { setRevokeTarget(key); setShowRevoke(true); }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Inactive Keys */}
            {inactiveKeys.length > 0 && (
                <div className="mb-5">
                    <div className="flex items-center gap-2.5 mb-1">
                        <Shield className="h-4 w-4 text-zinc-500" />
                        <h2 className="text-lg font-heading font-medium text-zinc-400">Inactive Keys ({inactiveKeys.length})</h2>
                    </div>
                    <p className="text-[13px] text-zinc-600 mb-4">Revoked or expired keys</p>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
                        {inactiveKeys.map(key => (
                            <KeyRow
                                key={key.id}
                                apiKey={key}
                                status={getKeyStatus(key)}
                                formatDate={formatDate}
                                formatRelative={formatRelative}
                                onDelete={() => { setDeleteTarget(key); setShowDelete(true); }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Security Notice */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-medium text-zinc-300 mb-1.5">Security Best Practices</p>
                        <ul className="space-y-1 text-[12px] text-zinc-500">
                            <li>Use the minimum scopes needed for your integration</li>
                            <li>Restrict keys to specific domains when possible</li>
                            <li>Rotate keys regularly (default expiry: 90 days)</li>
                            <li>Revoke any key that may have been exposed</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ── Create Key Dialog ────────────────────────────── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-[15px]">Create API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-[13px]">
                            Generate a new key for programmatic access
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-[13px]">Name</Label>
                            <Input
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                placeholder="e.g., CI Pipeline, Monitoring Script"
                                className="bg-white/[0.02] border-white/[0.06] rounded-lg"
                                maxLength={64}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[13px]">Scopes</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {SCOPE_OPTIONS.map(scope => (
                                    <button
                                        key={scope.value}
                                        type="button"
                                        onClick={() => toggleScope(scope.value)}
                                        className={`text-left p-2.5 rounded-lg border transition-colors ${
                                            newKeyScopes.includes(scope.value)
                                                ? 'border-blue-500/50 bg-blue-500/10'
                                                : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="text-[12px] font-medium text-white">{scope.label}</div>
                                        <div className="text-[11px] text-zinc-500 mt-0.5">{scope.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[13px]">Restrict to Domains (optional)</Label>
                            <Input
                                value={newKeyDomains}
                                onChange={e => setNewKeyDomains(e.target.value)}
                                placeholder="example.com, app.example.com"
                                className="bg-white/[0.02] border-white/[0.06] rounded-lg"
                            />
                            <p className="text-[11px] text-zinc-500">Comma-separated. Leave empty to allow all domains.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[13px]">Expires in (days)</Label>
                            <Input
                                type="number"
                                value={newKeyExpiry}
                                onChange={e => setNewKeyExpiry(e.target.value)}
                                min={1}
                                max={365}
                                className="bg-white/[0.02] border-white/[0.06] w-24 rounded-lg"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-white/[0.02] border-white/[0.06] rounded-lg text-[13px]">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || newKeyScopes.length === 0}
                            className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 rounded-lg text-[13px]"
                        >
                            {creating ? 'Creating...' : 'Create Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Show-Once Key Dialog ────────────────────────── */}
            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-lg rounded-xl" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2 text-[15px]">
                            <Check className="h-5 w-5 text-green-400" />
                            API Key Created
                        </DialogTitle>
                        <DialogDescription className="text-amber-400 font-medium text-[13px]">
                            Copy this key now. It will not be shown again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                        <code className="block p-3 bg-black/30 border border-white/[0.06] rounded-lg text-[13px] text-green-400 font-mono break-all">
                            {createdKey}
                        </code>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-7 px-2 text-zinc-400 hover:text-white"
                            onClick={() => copyToClipboard(createdKey || '')}
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setCreatedKey(null)} className="bg-white/10 border-white/[0.08] hover:bg-white/20 rounded-lg text-[13px]">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Revoke Confirmation Dialog ──────────────────── */}
            <Dialog open={showRevoke} onOpenChange={setShowRevoke}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-[15px]">Revoke API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-[13px]">
                            Are you sure you want to revoke <span className="font-mono text-zinc-300">{revokeTarget?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevoke(false)} className="bg-white/[0.02] border-white/[0.06] rounded-lg text-[13px]">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRevoke}
                            disabled={!!revoking}
                            className="rounded-lg text-[13px]"
                        >
                            {revoking ? 'Revoking...' : 'Revoke Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Permanent Delete Confirmation Dialog ─────────── */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-sm rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-[15px]">Delete API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-[13px]">
                            Permanently delete <span className="font-mono text-zinc-300">{deleteTarget?.name}</span>? This removes all associated usage logs and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)} className="bg-white/[0.02] border-white/[0.06] rounded-lg text-[13px]">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!!deleting}
                            className="rounded-lg text-[13px]"
                        >
                            {deleting ? 'Deleting...' : 'Delete Forever'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Key Row Component ─────────────────────────────────────────────

function KeyRow({
    apiKey,
    status,
    formatDate,
    formatRelative,
    onRevoke,
    onDelete,
}: {
    apiKey: ApiKey;
    status: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' };
    formatDate: (d: string | null) => string;
    formatRelative: (d: string | null) => string;
    onRevoke?: () => void;
    onDelete?: () => void;
}) {
    return (
        <div className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-medium text-white">{apiKey.name}</span>
                        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0 rounded-md">
                            {status.label}
                        </Badge>
                    </div>
                    <code className="text-[12px] text-zinc-500 font-mono">{apiKey.key_prefix}...****</code>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {apiKey.scopes.map(scope => (
                            <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {scope}
                            </span>
                        ))}
                        {apiKey.allowed_domains && apiKey.allowed_domains.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                                <Globe className="h-2.5 w-2.5" />
                                {apiKey.allowed_domains.length} domain{apiKey.allowed_domains.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-4 mt-2 text-[11px] text-zinc-600">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {formatDate(apiKey.created_at)}
                        </span>
                        {apiKey.last_used_at && (
                            <span>Last used {formatRelative(apiKey.last_used_at)}</span>
                        )}
                        {apiKey.expires_at && (
                            <span>Expires {formatDate(apiKey.expires_at)}</span>
                        )}
                    </div>
                </div>

                {onRevoke && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRevoke}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg"
                        title="Revoke key"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg"
                        title="Delete permanently"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
