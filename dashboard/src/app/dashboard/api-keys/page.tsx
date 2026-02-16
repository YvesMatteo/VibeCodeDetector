'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Plus,
    Copy,
    Check,
    Trash2,
    Clock,
    Globe,
    AlertTriangle,
    Terminal,
    ChevronDown,
    ChevronUp,
    Info,
    Activity,
    ArrowRight,
    ArrowLeft,
    CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';

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
    const [docsOpen, setDocsOpen] = useState(false);
    const [mcpOpen, setMcpOpen] = useState(false);

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
                toast.error(data.error || 'Failed to create key');
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
                toast.error(data.error || 'Failed to revoke key');
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
                toast.error(data.error || 'Failed to delete key');
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
        toast.success('Copied to clipboard');
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
        <div className="p-4 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">API Keys</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Manage API keys for programmatic access to CheckVibe
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 w-full sm:w-auto shrink-0"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            {/* Left column — keys */}
            <div className="min-w-0">

            {/* Getting Started */}
            <Card className="mb-4 bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="cursor-pointer py-4" onClick={() => setDocsOpen(!docsOpen)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white text-sm font-medium">Getting Started</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Authentication and API usage</CardDescription>
                        </div>
                        {docsOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                    </div>
                </CardHeader>
                {docsOpen && (
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-zinc-300 mb-2">Authentication</h4>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Include your API key in the Authorization header:
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-zinc-400 mb-1">Run a scan:</p>
                                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
{`curl -X POST https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                                    </pre>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400 mb-1">List scans:</p>
                                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
{`curl https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                                    </pre>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400 mb-1">Get scan results:</p>
                                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
{`curl https://checkvibe.dev/api/scan/SCAN_ID \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* MCP Server Config */}
            <Card className="mb-4 bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="cursor-pointer py-4" onClick={() => setMcpOpen(!mcpOpen)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Terminal className="h-4 w-4 text-zinc-400" />
                            <div>
                                <CardTitle className="text-white text-sm font-medium">Use with Claude Code (MCP)</CardTitle>
                                <CardDescription className="text-zinc-500 text-xs">Let coding agents run security scans</CardDescription>
                            </div>
                        </div>
                        {mcpOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                    </div>
                </CardHeader>
                {mcpOpen && (
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">
                                Add to your <code className="text-zinc-400">.claude/settings.json</code> or <code className="text-zinc-400">claude_desktop_config.json</code>:
                            </p>
                            <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
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
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Terminal className="h-3.5 w-3.5" />
                                <span>Available tools: <code className="text-zinc-400">run_scan</code>, <code className="text-zinc-400">get_scan_results</code>, <code className="text-zinc-400">list_scans</code></span>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Active Keys */}
            <Card className="mb-4 bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="py-4">
                    <div>
                        <CardTitle className="text-white text-sm font-medium">Active Keys ({activeKeys.length})</CardTitle>
                        <CardDescription className="text-zinc-500 text-xs">Keys that can authenticate API requests</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-zinc-500 text-sm py-4">Loading...</div>
                    ) : activeKeys.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-500 text-sm">No active API keys</p>
                            <p className="text-zinc-600 text-xs mt-1">Create a key to get started with the API</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
                </CardContent>
            </Card>

            {/* Inactive Keys */}
            {inactiveKeys.length > 0 && (
                <Card className="mb-4 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="py-4">
                        <div>
                            <CardTitle className="text-zinc-400 text-sm font-medium">Inactive Keys ({inactiveKeys.length})</CardTitle>
                            <CardDescription className="text-zinc-500 text-xs">Revoked or expired keys</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
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
                    </CardContent>
                </Card>
            )}

            {/* Security Notice */}
            <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="py-4 px-5">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400/80 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-zinc-300 mb-1.5">Security Best Practices</p>
                            <ul className="space-y-1 text-xs text-zinc-500">
                                <li>Use the minimum scopes needed for your integration</li>
                                <li>Restrict keys to specific domains when possible</li>
                                <li>Rotate keys regularly (default expiry: 90 days)</li>
                                <li>Revoke any key that may have been exposed</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>

            {/* Right column — activity feed */}
            <div className="hidden xl:block">
                <ActivityFeed />
            </div>
            </div>

            {/* ── Create Key Dialog ────────────────────────────── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Generate a new key for programmatic access
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                placeholder="e.g., CI Pipeline, Monitoring Script"
                                className="bg-white/[0.02] border-white/[0.06]"
                                maxLength={64}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Scopes</Label>
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
                                        <div className="text-xs font-medium text-white">{scope.label}</div>
                                        <div className="text-xs text-zinc-500 mt-0.5">{scope.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Restrict to Domains (optional)</Label>
                            <Input
                                value={newKeyDomains}
                                onChange={e => setNewKeyDomains(e.target.value)}
                                placeholder="example.com, app.example.com"
                                className="bg-white/[0.02] border-white/[0.06]"
                            />
                            <p className="text-xs text-zinc-500">Comma-separated. Leave empty to allow all domains.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Expires in (days)</Label>
                            <Input
                                type="number"
                                value={newKeyExpiry}
                                onChange={e => setNewKeyExpiry(e.target.value)}
                                min={1}
                                max={365}
                                className="bg-white/[0.02] border-white/[0.06] w-24"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-white/[0.02] border-white/[0.06]">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || newKeyScopes.length === 0}
                            className="bg-white text-zinc-900 hover:bg-zinc-200 border-0"
                        >
                            {creating ? 'Creating...' : 'Create Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Show-Once Key Dialog ────────────────────────── */}
            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-lg" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-400" />
                            API Key Created
                        </DialogTitle>
                        <DialogDescription className="text-amber-400 font-medium">
                            Copy this key now. It will not be shown again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                        <code className="block p-3 bg-black/30 border border-white/[0.06] rounded-lg text-sm text-green-400 font-mono break-all">
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
                        <Button onClick={() => setCreatedKey(null)} className="bg-white/10 border-white/[0.08] hover:bg-white/20">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Revoke Confirmation Dialog ──────────────────── */}
            <Dialog open={showRevoke} onOpenChange={setShowRevoke}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Revoke API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Are you sure you want to revoke <span className="font-mono text-zinc-300">{revokeTarget?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevoke(false)} className="bg-white/[0.02] border-white/[0.06]">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRevoke}
                            disabled={!!revoking}
                        >
                            {revoking ? 'Revoking...' : 'Revoke Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Permanent Delete Confirmation Dialog ─────────── */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent className="bg-[#111113] border-white/[0.08] sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Permanently delete <span className="font-mono text-zinc-300">{deleteTarget?.name}</span>? This removes all associated usage logs and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(false)} className="bg-white/[0.02] border-white/[0.06]">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!!deleting}
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
    const [showInfo, setShowInfo] = useState(false);

    const scopeInfo: Record<string, { label: string; description: string }> = {
        'scan:read': { label: 'Read Scans', description: 'View scan results and history' },
        'scan:write': { label: 'Run Scans', description: 'Trigger new security scans' },
        'keys:read': { label: 'List Keys', description: 'View your API keys' },
        'keys:manage': { label: 'Manage Keys', description: 'Create and revoke API keys' },
    };

    return (
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
            <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{apiKey.name}</span>
                        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                            {status.label}
                        </Badge>
                    </div>
                    <code className="text-xs text-zinc-500 font-mono">{apiKey.key_prefix}...••••</code>

                    <div className="flex items-center gap-3 mt-2">
                        <button
                            onClick={() => setShowInfo(v => !v)}
                            className={`inline-flex items-center gap-1.5 text-xs transition-colors ${showInfo ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Info className="h-3.5 w-3.5" />
                            {showInfo ? 'Hide details' : 'View details'}
                        </button>
                        <div className="flex gap-4 text-[11px] text-zinc-600">
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
                </div>

                {onRevoke && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRevoke}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
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
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        title="Delete permanently"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {showInfo && (
                <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-3">
                    <div>
                        <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Permissions</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {apiKey.scopes.map(scope => {
                                const info = scopeInfo[scope];
                                return (
                                    <div key={scope} className="flex items-start gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.05]">
                                        <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-medium text-zinc-300">{info?.label ?? scope}</p>
                                            <p className="text-[11px] text-zinc-500">{info?.description ?? scope}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Restrictions</h4>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                                <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                {apiKey.allowed_domains && apiKey.allowed_domains.length > 0 ? (
                                    <span className="text-zinc-300">
                                        Restricted to: {apiKey.allowed_domains.join(', ')}
                                    </span>
                                ) : (
                                    <span className="text-zinc-500">No domain restrictions (all domains allowed)</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                {apiKey.expires_at ? (
                                    <span className="text-zinc-300">Expires {formatDate(apiKey.expires_at)}</span>
                                ) : (
                                    <span className="text-zinc-500">No expiration set</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Activity Feed Component ───────────────────────────────────────

interface ActivityLog {
    endpoint: string;
    method: string;
    ip_address: string;
    status_code: number;
    created_at: string;
    key_id: string;
    key_name: string;
    key_prefix: string;
}

function ActivityFeed() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/keys/activity?limit=30')
            .then(res => res.json())
            .then(data => setLogs(data.logs || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    function timeAgo(date: string) {
        const diff = Date.now() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const methodColors: Record<string, string> = {
        GET: 'text-blue-400',
        POST: 'text-emerald-400',
        DELETE: 'text-red-400',
        PATCH: 'text-amber-400',
        PUT: 'text-orange-400',
    };

    function statusColor(code: number) {
        if (code >= 200 && code < 300) return 'text-emerald-400';
        if (code >= 400 && code < 500) return 'text-amber-400';
        return 'text-red-400';
    }

    return (
        <div className="sticky top-8">
            <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardHeader className="py-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-400" />
                        <CardTitle className="text-white text-sm font-medium">Activity Log</CardTitle>
                    </div>
                    <CardDescription className="text-zinc-500 text-xs">Recent API requests</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-10 bg-white/[0.02] rounded animate-pulse" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8">
                            <CircleDot className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                            <p className="text-zinc-500 text-xs">No API activity yet</p>
                            <p className="text-zinc-600 text-[11px] mt-0.5">Requests will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 -mr-1">
                            {logs.map((log, i) => (
                                <div
                                    key={i}
                                    className="group flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="shrink-0 mt-1">
                                        {log.method === 'GET' ? (
                                            <ArrowLeft className="h-3 w-3 text-blue-400/60" />
                                        ) : (
                                            <ArrowRight className="h-3 w-3 text-emerald-400/60" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[11px] font-mono font-medium ${methodColors[log.method] || 'text-zinc-400'}`}>
                                                {log.method}
                                            </span>
                                            <span className="text-[11px] text-zinc-400 font-mono truncate">
                                                {log.endpoint}
                                            </span>
                                            <span className={`text-[10px] font-mono ml-auto shrink-0 ${statusColor(log.status_code)}`}>
                                                {log.status_code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-zinc-600 truncate">
                                                {log.key_name}
                                            </span>
                                            <span className="text-[10px] text-zinc-700">&middot;</span>
                                            <span className="text-[10px] text-zinc-600 shrink-0">
                                                {timeAgo(log.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
