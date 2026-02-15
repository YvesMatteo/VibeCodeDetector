'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Loader2,
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
        <div className="p-5 md:p-10 pb-16 max-w-3xl mx-auto">
            {/* Back + Header */}
            <div className="mb-10">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-zinc-500 hover:text-white text-[13px] mb-6 transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to Projects
                </Link>
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    New Project
                </h1>
                <p className="text-zinc-500 text-[15px]">
                    Set up a project to run recurring security audits
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Project Info */}
                <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-1">
                        <FolderKanban className="h-4 w-4 text-blue-400" />
                        <h2 className="text-lg font-heading font-medium text-white">Project Details</h2>
                    </div>
                    <p className="text-[13px] text-zinc-600 mb-5">Name your project and enter the URL to audit</p>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                        {error && (
                            <div className="mb-4 p-3 text-[13px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p>{error}</p>
                                {errorCode === 'PLAN_REQUIRED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block text-[13px]">
                                        Subscribe to a plan &rarr;
                                    </Link>
                                )}
                                {errorCode === 'PROJECT_LIMIT_REACHED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block text-[13px]">
                                        Upgrade for more projects &rarr;
                                    </Link>
                                )}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-400 text-[13px]">Project Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="My App"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 rounded-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-zinc-400 text-[13px]">Target URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="url"
                                        type="text"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => handleUrlChange(e.target.value)}
                                        className="flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50 rounded-lg"
                                    />
                                    {isValidUrl(url) && (
                                        <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] shrink-0 overflow-hidden">
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
                    </div>
                </div>

                {/* GitHub */}
                <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-1">
                        <GitBranch className="h-4 w-4 text-zinc-500" />
                        <h2 className="text-lg font-heading font-medium text-white">GitHub Repository</h2>
                        <span className="text-[11px] text-zinc-600">(optional)</span>
                    </div>
                    <p className="text-[13px] text-zinc-600 mb-5">Link your repo to scan for leaked secrets and dependency vulnerabilities</p>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <Input
                            type="text"
                            placeholder="https://github.com/your-org/your-repo"
                            value={githubRepo}
                            onChange={(e) => setGithubRepo(e.target.value)}
                            className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/20 rounded-lg"
                        />
                    </div>
                </div>

                {/* Backend */}
                <div className="mb-8">
                    <div className="flex items-center gap-2.5 mb-1">
                        <ServerCrash className="h-4 w-4 text-emerald-400" />
                        <h2 className="text-lg font-heading font-medium text-white">Backend Provider</h2>
                        <span className="text-[11px] text-zinc-600">(optional)</span>
                    </div>
                    <p className="text-[13px] text-zinc-600 mb-5">Select your backend for targeted security checks</p>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                        <select
                            value={backendType}
                            onChange={(e) => { setBackendType(e.target.value as any); setBackendUrl(''); setSupabasePAT(''); }}
                            className="w-full h-10 rounded-lg border bg-white/[0.03] border-white/[0.08] text-white px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                            <option value="none" className="bg-zinc-900 text-white">None (auto-detect)</option>
                            <option value="supabase" className="bg-zinc-900 text-white">Supabase</option>
                            <option value="firebase" className="bg-zinc-900 text-white">Firebase</option>
                            <option value="convex" className="bg-zinc-900 text-white">Convex</option>
                        </select>
                        {backendType === 'supabase' && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[13px]">Supabase Project URL</Label>
                                    <Input
                                        type="text"
                                        placeholder="https://yourproject.supabase.co"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-lg"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[13px]">
                                        Supabase Access Token
                                        <span className="text-[11px] font-normal text-zinc-600 ml-2">(optional)</span>
                                    </Label>
                                    <Input
                                        type="password"
                                        placeholder="sbp_..."
                                        value={supabasePAT}
                                        onChange={(e) => setSupabasePAT(e.target.value)}
                                        className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 font-mono rounded-lg"
                                    />
                                </div>
                            </>
                        )}
                        {backendType === 'firebase' && (
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">Firebase Project URL or ID</Label>
                                <Input
                                    type="text"
                                    placeholder="your-project-id or https://your-project.firebaseapp.com"
                                    value={backendUrl}
                                    onChange={(e) => setBackendUrl(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-lg"
                                />
                            </div>
                        )}
                        {backendType === 'convex' && (
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-[13px]">Convex Deployment URL</Label>
                                <Input
                                    type="text"
                                    placeholder="https://your-project.convex.cloud"
                                    value={backendUrl}
                                    onChange={(e) => setBackendUrl(e.target.value)}
                                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-lg"
                                />
                            </div>
                        )}
                        {backendType === 'none' && (
                            <p className="text-[12px] text-zinc-500">
                                Supabase, Firebase, and Convex are auto-detected from your site&apos;s source code.
                            </p>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <Button type="button" variant="outline" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 rounded-lg text-[13px]">
                        <Link href="/dashboard">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading} size="lg" className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 rounded-lg text-[13px] font-medium">
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
