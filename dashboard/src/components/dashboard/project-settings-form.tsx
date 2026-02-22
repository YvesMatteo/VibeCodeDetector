'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/custom-select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2,
    Save,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_OPTIONS = [
    { value: 'none', label: 'None (auto-detect)' },
    { value: 'supabase', label: 'Supabase' },
    { value: 'firebase', label: 'Firebase' },
    { value: 'convex', label: 'Convex' },
];

interface ProjectSettingsFormProps {
    projectId: string;
    initialData: {
        name: string;
        url: string;
        github_repo: string | null;
        backend_type: string | null;
        backend_url: string | null;
        has_supabase_pat?: boolean;
    };
}

export function ProjectSettingsForm({ projectId, initialData }: ProjectSettingsFormProps) {
    const router = useRouter();

    const [name, setName] = useState(initialData.name || '');
    const [url, setUrl] = useState(initialData.url || '');
    const [githubRepo, setGithubRepo] = useState(initialData.github_repo || '');
    const [backendType, setBackendType] = useState<'none' | 'supabase' | 'firebase' | 'convex'>(
        (initialData.backend_type as 'none' | 'supabase' | 'firebase' | 'convex') || 'none'
    );
    const [backendUrl, setBackendUrl] = useState(initialData.backend_url || '');
    const [supabasePAT, setSupabasePAT] = useState('');
    const [patTouched, setPatTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Project name is required');
            return;
        }
        if (!url.trim()) {
            toast.error('Target URL is required');
            return;
        }

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
                    // Only send PAT when user explicitly typed a new value
                    ...(patTouched ? { supabasePAT: supabasePAT.trim() || null } : {}),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }

            toast.success('Settings saved');
            router.refresh();
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

    return (
        <>
            <form onSubmit={handleSave}>
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="text-white">Configuration</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Update your project name, URL, and integrations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My App"
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-zinc-300">Target URL</Label>
                                <Input
                                    id="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="githubRepo" className="text-zinc-300">
                                    GitHub Repository
                                    <span className="text-xs font-normal text-zinc-500 ml-2">(optional)</span>
                                </Label>
                                <Input
                                    id="githubRepo"
                                    value={githubRepo}
                                    onChange={(e) => setGithubRepo(e.target.value)}
                                    placeholder="https://github.com/org/repo"
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">
                                    Backend Provider
                                    <span className="text-xs font-normal text-zinc-500 ml-2">(optional)</span>
                                </Label>
                                <CustomSelect
                                    value={backendType}
                                    onChange={(v) => {
                                        setBackendType(v as 'none' | 'supabase' | 'firebase' | 'convex');
                                        setBackendUrl('');
                                        setSupabasePAT('');
                                        setPatTouched(true);
                                    }}
                                    options={BACKEND_OPTIONS}
                                />
                            </div>
                            {backendType === 'supabase' && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Supabase Project URL</Label>
                                        <Input
                                            value={backendUrl}
                                            onChange={(e) => setBackendUrl(e.target.value)}
                                            placeholder="https://yourproject.supabase.co"
                                            className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">
                                            Supabase Access Token
                                            <span className="text-xs font-normal text-zinc-500 ml-2">(optional)</span>
                                        </Label>
                                        <Input
                                            type="password"
                                            value={supabasePAT}
                                            onChange={(e) => { setSupabasePAT(e.target.value); setPatTouched(true); }}
                                            placeholder={initialData.has_supabase_pat ? '••••••••  (saved — type to replace)' : 'sbp_...'}
                                            className="bg-white/[0.03] border-white/[0.08] text-white font-mono placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                        />
                                    </div>
                                </>
                            )}
                            {backendType === 'firebase' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Firebase Project URL or ID</Label>
                                    <Input
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        placeholder="your-project-id or https://your-project.firebaseapp.com"
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                    />
                                </div>
                            )}
                            {backendType === 'convex' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Convex Deployment URL</Label>
                                    <Input
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        placeholder="https://your-project.convex.cloud"
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                    />
                                </div>
                            )}
                            {backendType === 'none' && (
                                <p className="text-xs text-zinc-500">
                                    Supabase, Firebase, and Convex are auto-detected from your site&apos;s source code.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end mb-12">
                    <Button type="submit" disabled={saving} className="bg-sky-500 hover:bg-sky-400 text-white border-0">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
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
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Project'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
