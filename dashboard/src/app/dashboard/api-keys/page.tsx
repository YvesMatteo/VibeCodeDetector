'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    { value: 'scan:read', label: 'Read Scans', description: 'View scan results and history' },
    { value: 'scan:write', label: 'Run Scans', description: 'Trigger new scans' },
    { value: 'keys:read', label: 'List Keys', description: 'View your API keys' },
    { value: 'keys:manage', label: 'Manage Keys', description: 'Create and revoke keys' },
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

    useEffect(() => { fetchKeys(); }, [fetchKeys]);

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
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white mb-2">API Keys</h1>
                    <p className="text-zinc-400">
                        Manage API keys for programmatic access to CheckVibe
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                </Button>
            </div>

            {/* Active Keys */}
            <Card className="mb-6 bg-zinc-900/40 border-white/5">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-blue-400" />
                        <div>
                            <CardTitle className="text-white">Active Keys ({activeKeys.length})</CardTitle>
                            <CardDescription className="text-zinc-400">Keys that can authenticate API requests</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-zinc-500 text-sm py-4">Loading...</div>
                    ) : activeKeys.length === 0 ? (
                        <div className="text-center py-8">
                            <Key className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
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
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-zinc-500" />
                            <div>
                                <CardTitle className="text-zinc-400">Inactive Keys ({inactiveKeys.length})</CardTitle>
                                <CardDescription className="text-zinc-500">Revoked or expired keys</CardDescription>
                            </div>
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
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Security Notice */}
            <Card className="bg-zinc-900/40 border-white/5">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-zinc-400">
                            <p className="font-medium text-zinc-300 mb-1">Security Best Practices</p>
                            <ul className="space-y-1 text-zinc-500">
                                <li>Use the minimum scopes needed for your integration</li>
                                <li>Restrict keys to specific domains when possible</li>
                                <li>Rotate keys regularly (default expiry: 90 days)</li>
                                <li>Revoke any key that may have been exposed</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Create Key Dialog ────────────────────────────── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="bg-zinc-900 border-white/10 sm:max-w-md">
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
                                className="bg-white/5 border-white/10"
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
                                                : 'border-white/10 bg-white/5 hover:bg-white/10'
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
                                className="bg-white/5 border-white/10"
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
                                className="bg-white/5 border-white/10 w-24"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-white/5 border-white/10">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || newKeyScopes.length === 0}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
                        >
                            {creating ? 'Creating...' : 'Create Key'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Show-Once Key Dialog ────────────────────────── */}
            <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
                <DialogContent className="bg-zinc-900 border-white/10 sm:max-w-lg" showCloseButton={false}>
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
                        <code className="block p-3 bg-black/50 border border-white/10 rounded-lg text-sm text-green-400 font-mono break-all">
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
                        <Button onClick={() => setCreatedKey(null)} className="bg-white/10 border-white/10 hover:bg-white/20">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Revoke Confirmation Dialog ──────────────────── */}
            <Dialog open={showRevoke} onOpenChange={setShowRevoke}>
                <DialogContent className="bg-zinc-900 border-white/10 sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Revoke API Key</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Are you sure you want to revoke <span className="font-mono text-zinc-300">{revokeTarget?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRevoke(false)} className="bg-white/5 border-white/10">
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
}: {
    apiKey: ApiKey;
    status: { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' };
    formatDate: (d: string | null) => string;
    formatRelative: (d: string | null) => string;
    onRevoke?: () => void;
}) {
    return (
        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm">{apiKey.name}</span>
                        <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                            {status.label}
                        </Badge>
                    </div>
                    <code className="text-xs text-zinc-500 font-mono">{apiKey.key_prefix}...••••</code>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {apiKey.scopes.map(scope => (
                            <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {scope}
                            </span>
                        ))}
                        {apiKey.allowed_domains && apiKey.allowed_domains.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
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
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
