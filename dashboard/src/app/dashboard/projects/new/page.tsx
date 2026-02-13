'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Loader2,
    Globe,
    GitBranch,
    ServerCrash,
    FolderKanban,
} from 'lucide-react';

export default function NewProjectPage() {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [githubRepo, setGithubRepo] = useState('');
    const [backendType, setBackendType] = useState<'none' | 'supabase' | 'firebase' | 'convex'>('none');
    const [backendUrl, setBackendUrl] = useState('');
    const [supabasePAT, setSupabasePAT] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const router = useRouter();

    function isValidUrl(string: string) {
        try {
            const u = new URL(string.startsWith('http') ? string : `https://${string}`);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return false;
            if (!u.hostname.includes('.')) return false;
            return true;
        } catch {
            return false;
        }
    }

    // Auto-generate project name from URL
    function handleUrlChange(value: string) {
        setUrl(value);
        if (!name.trim() && value.trim()) {
            try {
                const u = new URL(value.startsWith('http') ? value : `https://${value}`);
                setName(u.hostname.replace(/^www\./, ''));
            } catch { /* ignore */ }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setErrorCode(null);

        if (!name.trim()) {
            setError('Project name is required');
            return;
        }
        if (!url.trim() || !isValidUrl(url)) {
            setError('Please enter a valid URL');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    url: url.trim(),
                    ...(githubRepo.trim() ? { githubRepo: githubRepo.trim() } : {}),
                    backendType,
                    ...(backendUrl.trim() ? { backendUrl: backendUrl.trim() } : {}),
                    ...(supabasePAT.trim() ? { supabasePAT: supabasePAT.trim() } : {}),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setErrorCode(result.code || null);
                throw new Error(result.error || 'Failed to create project');
            }

            router.push(`/dashboard/projects/${result.project.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    }

    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Projects
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">New Project</h1>
                <p className="text-zinc-400 mt-1">
                    Set up a project to run recurring security audits
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Project Info */}
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <FolderKanban className="h-5 w-5 text-blue-400" />
                            Project Details
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Name your project and enter the URL to audit
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p>{error}</p>
                                {errorCode === 'PLAN_REQUIRED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block">
                                        Subscribe to a plan &rarr;
                                    </Link>
                                )}
                                {errorCode === 'PROJECT_LIMIT_REACHED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block">
                                        Upgrade for more projects &rarr;
                                    </Link>
                                )}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="My App"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-zinc-300">Target URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="url"
                                        type="text"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => handleUrlChange(e.target.value)}
                                        className="text-lg flex-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                                    />
                                    {isValidUrl(url) && (
                                        <div className="h-10 w-10 flex items-center justify-center rounded-md border bg-muted shrink-0 overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}&sz=64`}
                                                alt="Favicon"
                                                className="h-6 w-6 object-contain"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* GitHub */}
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <GitBranch className="h-5 w-5 text-purple-400" />
                            GitHub Repository
                            <span className="text-xs font-normal text-zinc-500">(optional)</span>
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Link your repo to scan for leaked secrets and dependency vulnerabilities
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            type="text"
                            placeholder="https://github.com/your-org/your-repo"
                            value={githubRepo}
                            onChange={(e) => setGithubRepo(e.target.value)}
                            className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-purple-500/50"
                        />
                    </CardContent>
                </Card>

                {/* Backend */}
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <ServerCrash className="h-5 w-5 text-emerald-400" />
                            Backend Provider
                            <span className="text-xs font-normal text-zinc-500">(optional)</span>
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Select your backend for targeted security checks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <select
                                value={backendType}
                                onChange={(e) => { setBackendType(e.target.value as any); setBackendUrl(''); setSupabasePAT(''); }}
                                className="w-full h-10 rounded-md border bg-white/5 border-white/10 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                                <option value="none" className="bg-zinc-900 text-white">None (auto-detect)</option>
                                <option value="supabase" className="bg-zinc-900 text-white">Supabase</option>
                                <option value="firebase" className="bg-zinc-900 text-white">Firebase</option>
                                <option value="convex" className="bg-zinc-900 text-white">Convex</option>
                            </select>
                            {backendType === 'supabase' && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">Supabase Project URL</Label>
                                        <Input
                                            type="text"
                                            placeholder="https://yourproject.supabase.co"
                                            value={backendUrl}
                                            onChange={(e) => setBackendUrl(e.target.value)}
                                            className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-300">
                                            Supabase Access Token
                                            <span className="text-xs font-normal text-zinc-500 ml-2">(optional)</span>
                                        </Label>
                                        <Input
                                            type="password"
                                            placeholder="sbp_..."
                                            value={supabasePAT}
                                            onChange={(e) => setSupabasePAT(e.target.value)}
                                            className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600 font-mono"
                                        />
                                    </div>
                                </>
                            )}
                            {backendType === 'firebase' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Firebase Project URL or ID</Label>
                                    <Input
                                        type="text"
                                        placeholder="your-project-id or https://your-project.firebaseapp.com"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                                    />
                                </div>
                            )}
                            {backendType === 'convex' && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Convex Deployment URL</Label>
                                    <Input
                                        type="text"
                                        placeholder="https://your-project.convex.cloud"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="text-lg bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
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

                {/* Submit */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
                    <Button type="button" variant="outline" asChild className="bg-transparent border-white/10 hover:bg-white/5 text-zinc-300">
                        <Link href="/dashboard">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Project'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
