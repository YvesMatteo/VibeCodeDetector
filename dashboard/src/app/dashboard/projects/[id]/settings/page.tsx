'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

            toast.success('Settings saved');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Project deleted');
                router.push('/dashboard');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete project');
            }
        } catch {
            toast.error('Failed to delete project');
        } finally {
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            <div className="mb-8">
                <Link
                    href={`/dashboard/projects/${projectId}`}
                    className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">Project Settings</h1>
                <p className="text-zinc-400 mt-1">Update your project configuration</p>
            </div>

            <form onSubmit={handleSave}>
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="text-white">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Project Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Target URL</Label>
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">GitHub Repository</Label>
                                <Input
                                    value={githubRepo}
                                    onChange={(e) => setGithubRepo(e.target.value)}
                                    placeholder="https://github.com/org/repo"
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Backend Provider</Label>
                                <select
                                    value={backendType}
                                    onChange={(e) => { setBackendType(e.target.value as any); setBackendUrl(''); setSupabasePAT(''); }}
                                    className="w-full h-10 rounded-md border bg-white/[0.03] border-white/[0.08] text-white px-3 text-sm"
                                >
                                    <option value="none" className="bg-zinc-900">None (auto-detect)</option>
                                    <option value="supabase" className="bg-zinc-900">Supabase</option>
                                    <option value="firebase" className="bg-zinc-900">Firebase</option>
                                    <option value="convex" className="bg-zinc-900">Convex</option>
                                </select>
                            </div>
                            {backendType !== 'none' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">
                                        {backendType === 'supabase' ? 'Supabase Project URL' :
                                         backendType === 'firebase' ? 'Firebase Project URL' :
                                         'Convex Deployment URL'}
                                    </Label>
                                    <Input
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.08] text-white"
                                    />
                                </div>
                            )}
                            {backendType === 'supabase' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Supabase Access Token</Label>
                                    <Input
                                        type="password"
                                        value={supabasePAT}
                                        onChange={(e) => setSupabasePAT(e.target.value)}
                                        placeholder="sbp_..."
                                        className="bg-white/[0.03] border-white/[0.08] text-white font-mono placeholder:text-zinc-600"
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end mb-12">
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                        )}
                    </Button>
                </div>
            </form>

            {/* Danger Zone */}
            <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                    <CardTitle className="text-red-400">Danger Zone</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Deleting a project permanently removes it along with all its scan history and dismissed findings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-medium text-white">{name}</span>?
                            This will permanently delete the project, all scan history, and dismissed findings. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
