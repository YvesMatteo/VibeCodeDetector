'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Loader2,
    Save,
    Trash2,
    Settings,
    AlertTriangle,
} from 'lucide-react';

export default function ProjectSettingsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const router = useRouter();

    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [githubRepo, setGithubRepo] = useState('');
    const [backendType, setBackendType] = useState<'none' | 'supabase' | 'firebase' | 'convex'>('none');
    const [backendUrl, setBackendUrl] = useState('');
    const [supabasePAT, setSupabasePAT] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function loadProject() {
            try {
                const res = await fetch(`/api/projects/${projectId}`);
                if (!res.ok) { router.push('/dashboard'); return; }
                const { project } = await res.json();
                setName(project.name || '');
                setUrl(project.url || '');
                setGithubRepo(project.github_repo || '');
                setBackendType(project.backend_type || 'none');
                setBackendUrl(project.backend_url || '');
                setSupabasePAT(project.supabase_pat || '');
            } catch {
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        }
        loadProject();
    }, [projectId, router]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    url: url.trim(),
                    githubRepo: githubRepo.trim() || null,
                    backendType,
                    backendUrl: backendUrl.trim() || null,
                    supabasePAT: supabasePAT.trim() || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/dashboard');
            }
        } finally {
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="p-5 md:p-10 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-5 md:p-10 pb-16 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <Link
                    href={`/dashboard/projects/${projectId}`}
                    className="inline-flex items-center text-zinc-500 hover:text-white text-[13px] mb-6 transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to Project
                </Link>
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    Project Settings
                </h1>
                <p className="text-zinc-500 text-[15px]">
                    Update your project configuration
                </p>
            </div>

            <form onSubmit={handleSave}>
                {/* Configuration */}
                <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-1">
                        <Settings className="h-4 w-4 text-zinc-500" />
                        <h2 className="text-lg font-heading font-medium text-white">Configuration</h2>
                    </div>
                    <p className="text-[13px] text-zinc-600 mb-5">Project details and integrations</p>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                        {error && (
                            <div className="mb-4 p-3 text-[13px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 text-[13px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">Settings saved.</div>
                        )}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">Project Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">Target URL</Label>
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">GitHub Repository</Label>
                                <Input
                                    value={githubRepo}
                                    onChange={(e) => setGithubRepo(e.target.value)}
                                    placeholder="https://github.com/org/repo"
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">Backend Provider</Label>
                                <select
                                    value={backendType}
                                    onChange={(e) => { setBackendType(e.target.value as any); setBackendUrl(''); setSupabasePAT(''); }}
                                    className="w-full h-10 rounded-lg border bg-white/[0.03] border-white/[0.08] text-white px-3 text-[13px]"
                                >
                                    <option value="none" className="bg-zinc-900">None (auto-detect)</option>
                                    <option value="supabase" className="bg-zinc-900">Supabase</option>
                                    <option value="firebase" className="bg-zinc-900">Firebase</option>
                                    <option value="convex" className="bg-zinc-900">Convex</option>
                                </select>
                            </div>
                            {backendType !== 'none' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[13px]">
                                        {backendType === 'supabase' ? 'Supabase Project URL' :
                                         backendType === 'firebase' ? 'Firebase Project URL' :
                                         'Convex Deployment URL'}
                                    </Label>
                                    <Input
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.08] text-white rounded-lg"
                                    />
                                </div>
                            )}
                            {backendType === 'supabase' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[13px]">Supabase Access Token</Label>
                                    <Input
                                        type="password"
                                        value={supabasePAT}
                                        onChange={(e) => setSupabasePAT(e.target.value)}
                                        placeholder="sbp_..."
                                        className="bg-white/[0.03] border-white/[0.08] text-white font-mono placeholder:text-zinc-600 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-12">
                    <Button type="submit" disabled={saving} className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 rounded-lg text-[13px] font-medium">
                        {saving ? (
                            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes</>
                        )}
                    </Button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="mb-6">
                <div className="flex items-center gap-2.5 mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <h2 className="text-lg font-heading font-medium text-red-400">Danger Zone</h2>
                </div>
                <p className="text-[13px] text-zinc-600 mb-5">Deleting a project is permanent. Audit history will be preserved but unlinked.</p>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <Button
                        variant="destructive"
                        onClick={() => setDeleteOpen(true)}
                        className="rounded-lg text-[13px]"
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete Project
                    </Button>
                </div>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-[#111113] border-white/[0.08] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-[15px]">Delete Project</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-[13px]">
                            Are you sure you want to delete <span className="font-medium text-white">{name}</span>?
                            Existing audit reports will be preserved but unlinked from this project.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting} className="bg-white/[0.02] border-white/[0.06] rounded-lg text-[13px]">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-lg text-[13px]">
                            {deleting ? 'Deleting...' : 'Delete Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
