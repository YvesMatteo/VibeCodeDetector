'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/custom-select';
import { PageHeader } from '@/components/dashboard/page-header';
import {
    ArrowLeft,
    Loader2,
    Globe,
    GitBranch,
    ServerCrash,
    FolderKanban,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_OPTIONS = [
    { value: 'none', label: 'None (auto-detect)' },
    { value: 'supabase', label: 'Supabase' },
    { value: 'firebase', label: 'Firebase' },
    { value: 'convex', label: 'Convex' },
];

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
    const [step, setStep] = useState(1);
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
            toast.error('Project name is required');
            return;
        }
        if (!url.trim() || !isValidUrl(url)) {
            toast.error('Please enter a valid URL');
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
            const msg = err instanceof Error ? err.message : 'An error occurred';
            if (!errorCode || (errorCode !== 'PLAN_REQUIRED' && errorCode !== 'PROJECT_LIMIT_REACHED')) {
                toast.error(msg);
            }
            setError(msg);
            setLoading(false);
        }
    }

    return (
        <div>
            <PageHeader
                title={
                    <div className="flex flex-col gap-4">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
                        >
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                            Back to Projects
                        </Link>
                        <span>New Project</span>
                    </div>
                }
                description="Set up a project to run recurring security audits"
            />

            <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto w-full">
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-10 max-w-md mx-auto">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${step >= 1 ? 'bg-white text-black' : 'bg-white/[0.04] text-zinc-500 border border-white/[0.06]'}`}>1</div>
                    <div className={`flex-1 h-[2px] rounded-full transition-colors ${step >= 2 ? 'bg-white/20' : 'bg-white/[0.04]'}`} />
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${step >= 2 ? 'bg-white text-black' : 'bg-white/[0.04] text-zinc-500 border border-white/[0.06]'}`}>2</div>
                </div>

                {/* Upgrade nudges */}
                {errorCode === 'PLAN_REQUIRED' && (
                    <div className="mb-8 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium text-sm mb-0.5">Upgrade required</h3>
                            <p className="text-zinc-400 text-[13px]">
                                Start with Starter for 1 project and 5 scans/month, or go Pro for 3 projects and 20 scans.
                            </p>
                        </div>
                        <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-400 text-white border-0 shrink-0">
                            <Link href="/dashboard/credits">View Plans</Link>
                        </Button>
                    </div>
                )}
                {errorCode === 'PROJECT_LIMIT_REACHED' && (
                    <div className="mb-6 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <h3 className="text-white font-medium mb-1">Project limit reached</h3>
                        <p className="text-zinc-400 text-sm mb-3">
                            Upgrade to get more projects — Pro gives you 3, Max gives you 10.
                        </p>
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-500 text-white border-0">
                            <Link href="/dashboard/credits">Upgrade Plan</Link>
                        </Button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Project Details */}
                    {step === 1 && (
                        <>
                            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <FolderKanban className="h-5 w-5 text-sky-400" />
                                        Project Details
                                    </CardTitle>
                                    <CardDescription className="text-zinc-400">
                                        Name your project and enter the URL to audit
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="My App"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
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
                                                    className="text-lg flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-sky-400/50"
                                                />
                                                {isValidUrl(url) && (
                                                    <div className="h-10 w-10 flex items-center justify-center rounded-md border bg-muted shrink-0 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={`/api/favicon?domain=${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}&sz=64`}
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

                            <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
                                <Button type="button" variant="outline" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-zinc-300">
                                    <Link href="/dashboard">Cancel</Link>
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        if (!name.trim()) { toast.error('Project name is required'); return; }
                                        if (!url.trim() || !isValidUrl(url)) { toast.error('Please enter a valid URL'); return; }
                                        setStep(2);
                                    }}
                                    className="bg-sky-500 hover:bg-sky-400 text-white border-0"
                                >
                                    Next
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step 2: Optional Config */}
                    {step === 2 && (
                        <>
                            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <GitBranch className="h-5 w-5 text-zinc-400" />
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
                                        className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/20"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
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
                                        <CustomSelect
                                            value={backendType}
                                            onChange={(v) => { setBackendType(v as 'none' | 'supabase' | 'firebase' | 'convex'); setBackendUrl(''); setSupabasePAT(''); }}
                                            options={BACKEND_OPTIONS}
                                        />
                                        {backendType === 'supabase' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label className="text-zinc-300">Supabase Project URL</Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="https://yourproject.supabase.co"
                                                        value={backendUrl}
                                                        onChange={(e) => setBackendUrl(e.target.value)}
                                                        className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600"
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
                                                        className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 font-mono"
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
                                                    className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600"
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
                                                    className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600"
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

                            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-zinc-300">
                                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit" disabled={loading} size="lg" className="bg-sky-500 hover:bg-sky-400 text-white border-0">
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
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
