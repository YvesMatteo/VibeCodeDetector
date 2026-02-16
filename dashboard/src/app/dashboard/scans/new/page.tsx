'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/custom-select';
import {
    ArrowLeft,
    Loader2,
    Globe,
    Shield,
    Key,
    Search,
    Scale,
    Radar,
    CheckCircle,
    Database,
    GitBranch,
    Cpu,
    Lock,
    Mail,
    Code,
    ExternalLink,
    Package,
    ServerCrash,
    ShieldAlert,
    Cookie,
    UserCheck,
    Flame,
    ClipboardCheck,
    ShieldCheck,
    Settings2,
    Zap,
    Triangle,
    Globe2,
    Cloud,
    TrainFront,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_OPTIONS = [
    { value: 'none', label: 'None (auto-detect)' },
    { value: 'supabase', label: 'Supabase' },
    { value: 'firebase', label: 'Firebase' },
    { value: 'convex', label: 'Convex' },
];

export default function NewScanPage() {
    const searchParams = useSearchParams();
    const [url, setUrl] = useState(searchParams.get('url') || '');
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
            const url = new URL(string.startsWith('http') ? string : `https://${string}`);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
            const hostname = url.hostname;
            // Block private/internal IPs
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
            if (!hostname.includes('.')) return false;
            return true;
        } catch {
            return false;
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setErrorCode(null);

        if (!url) {
            toast.error('Please enter a URL');
            return;
        }

        if (!isValidUrl(url)) {
            toast.error('Please enter a valid URL');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    scanTypes: ['security', 'api_keys', 'legal', 'threat_intelligence', 'sqli', 'tech_stack', 'cors', 'csrf', 'cookies', 'auth', 'supabase_backend', 'firebase_backend', 'convex_backend', 'dependencies', 'ssl_tls', 'dns_email', 'xss', 'open_redirect', 'scorecard', 'github_security', 'supabase_mgmt', 'vercel_hosting', 'netlify_hosting', 'cloudflare_hosting', 'railway_hosting', 'vibe_match'],
                    ...(githubRepo.trim() ? { githubRepo: githubRepo.trim() } : {}),
                    backendType,
                    ...(backendUrl.trim() ? { backendUrl: backendUrl.trim() } : {}),
                    ...(backendType === 'convex' && backendUrl.trim() ? { convexUrl: backendUrl.trim() } : {}),
                    ...(supabasePAT.trim() ? { supabasePAT: supabasePAT.trim() } : {}),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setErrorCode(result.code || null);
                throw new Error(result.error || 'Scan failed');
            }

            if (result.scanId) {
                router.push(`/dashboard/scans/${result.scanId}`);
            } else {
                sessionStorage.setItem('lastScanResult', JSON.stringify(result));
                router.push('/dashboard/scans/demo');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An error occurred';
            if (!errorCode || !['PLAN_REQUIRED', 'SCAN_LIMIT_REACHED', 'DOMAIN_LIMIT_REACHED'].includes(errorCode)) {
                toast.error(msg);
            }
            setError(msg);
            setLoading(false);
        }
    }

    return (
        <div className="p-4 md:p-8 pb-16 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/scans"
                    className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Scans
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">New Scan</h1>
                <p className="text-zinc-400 mt-1">
                    Enter a URL to run a full scan across all checks
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* URL Input */}
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Globe className="h-5 w-5 text-blue-400" />
                            Target URL
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Enter the website URL you want to scan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {errorCode === 'PLAN_REQUIRED' && (
                            <div className="mb-4 p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                <h3 className="text-white font-medium mb-1">Choose a plan to run scans</h3>
                                <p className="text-zinc-400 text-sm mb-3">
                                    Start with Starter for 5 scans/month, or go Pro for 20 scans and API access.
                                </p>
                                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                                    <Link href="/dashboard/credits">View Plans</Link>
                                </Button>
                            </div>
                        )}
                        {errorCode === 'SCAN_LIMIT_REACHED' && (
                            <div className="mb-4 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                <h3 className="text-white font-medium mb-1">Scan limit reached</h3>
                                <p className="text-zinc-400 text-sm mb-3">
                                    Upgrade to get more scans — Pro gives you 20/month, Max gives you 75.
                                </p>
                                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-500 text-white border-0">
                                    <Link href="/dashboard/credits">Upgrade Plan</Link>
                                </Button>
                            </div>
                        )}
                        {errorCode === 'DOMAIN_LIMIT_REACHED' && (
                            <div className="mb-4 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                <h3 className="text-white font-medium mb-1">Domain limit reached</h3>
                                <p className="text-zinc-400 text-sm mb-3">
                                    Upgrade to scan more domains — Pro gives you 3 projects, Max gives you 10.
                                </p>
                                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-500 text-white border-0">
                                    <Link href="/dashboard/credits">Upgrade Plan</Link>
                                </Button>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="url" className="text-zinc-300">Website URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="url"
                                    type="text"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="text-lg flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
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
                    </CardContent>
                </Card>

                {/* GitHub Repository (optional) */}
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <GitBranch className="h-5 w-5 text-zinc-400" />
                            GitHub Repository
                            <span className="text-xs font-normal text-zinc-500">(optional)</span>
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Add your repo to scan for leaked secrets, committed .env files, and exposed private keys
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="githubRepo" className="text-zinc-300">Repository URL</Label>
                            <Input
                                id="githubRepo"
                                type="text"
                                placeholder="https://github.com/your-org/your-repo"
                                value={githubRepo}
                                onChange={(e) => setGithubRepo(e.target.value)}
                                className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-white/20"
                            />
                            <p className="text-xs text-zinc-500">
                                Checks for .env files, git history leaks, missing .gitignore rules, hardcoded credentials, and private key files.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Backend Provider (optional) */}
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <ServerCrash className="h-5 w-5 text-emerald-400" />
                            Backend Provider
                            <span className="text-xs font-normal text-zinc-500">(optional)</span>
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Select your backend to scan for misconfigurations, exposed data, and insecure auth settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="backendType" className="text-zinc-300">Provider</Label>
                                <CustomSelect
                                    id="backendType"
                                    value={backendType}
                                    onChange={(v) => { setBackendType(v as 'none' | 'supabase' | 'firebase' | 'convex'); setBackendUrl(''); setSupabasePAT(''); }}
                                    options={BACKEND_OPTIONS}
                                />
                            </div>
                            {backendType === 'supabase' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="backendUrl" className="text-zinc-300">Supabase Project URL</Label>
                                        <Input
                                            id="backendUrl"
                                            type="text"
                                            placeholder="https://yourproject.supabase.co"
                                            value={backendUrl}
                                            onChange={(e) => setBackendUrl(e.target.value)}
                                            className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50"
                                        />
                                        <p className="text-xs text-zinc-500">
                                            Checks for exposed tables, storage bucket access, auth config, RLS policies, and service role key exposure. Auto-detected if not provided.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="supabasePAT" className="text-zinc-300">
                                            Supabase Access Token
                                            <span className="text-xs font-normal text-zinc-500 ml-2">(optional — enables deep lint)</span>
                                        </Label>
                                        <Input
                                            id="supabasePAT"
                                            type="password"
                                            placeholder="sbp_..."
                                            value={supabasePAT}
                                            onChange={(e) => setSupabasePAT(e.target.value)}
                                            className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50 font-mono"
                                        />
                                        <p className="text-xs text-zinc-500">
                                            Runs 12 deep SQL checks via the Management API: RLS status, permissive policies, SECURITY DEFINER functions, dangerous extensions, and more. Your token is used for this scan only and is never stored.{' '}
                                            <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                Generate a token &rarr;
                                            </a>
                                        </p>
                                    </div>
                                </>
                            )}
                            {backendType === 'firebase' && (
                                <div className="space-y-2">
                                    <Label htmlFor="backendUrl" className="text-zinc-300">Firebase Project URL or ID</Label>
                                    <Input
                                        id="backendUrl"
                                        type="text"
                                        placeholder="your-project-id or https://your-project.firebaseapp.com"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
                                    />
                                    <p className="text-xs text-zinc-500">
                                        Checks for open Realtime Database, listable Storage, Firestore access, API key restrictions, and auth enumeration. Auto-detected if not provided.
                                    </p>
                                </div>
                            )}
                            {backendType === 'convex' && (
                                <div className="space-y-2">
                                    <Label htmlFor="backendUrl" className="text-zinc-300">Convex Deployment URL</Label>
                                    <Input
                                        id="backendUrl"
                                        type="text"
                                        placeholder="https://your-project.convex.cloud"
                                        value={backendUrl}
                                        onChange={(e) => setBackendUrl(e.target.value)}
                                        className="text-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-yellow-500/50"
                                    />
                                    <p className="text-xs text-zinc-500">
                                        Checks for exposed deployment URLs, admin key leaks, function enumeration, and CORS policy. Auto-detected if not provided.
                                    </p>
                                </div>
                            )}
                            {backendType === 'none' && (
                                <p className="text-xs text-zinc-500">
                                    Supabase, Firebase, and Convex are auto-detected from your site&apos;s source code. Select a provider to provide a specific project URL.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* What's Included */}
                <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <CardTitle className="text-white">What&apos;s Included</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Every scan runs up to 26 checks automatically
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { icon: Shield, name: 'Security Headers', description: 'Headers, CSP, info disclosure, rate limiting', color: 'text-red-500' },
                                { icon: Database, name: 'SQL Injection', description: 'Passive SQLi detection across forms and params', color: 'text-rose-500' },
                                { icon: Code, name: 'XSS Detection', description: 'DOM sinks, reflected XSS, template injection', color: 'text-pink-500' },
                                { icon: Globe, name: 'CORS Scanner', description: 'Origin reflection, null origin, wildcard misconfig', color: 'text-sky-500' },
                                { icon: ShieldAlert, name: 'CSRF Protection', description: 'Token validation, SameSite cookies, origin checks', color: 'text-orange-500' },
                                { icon: Cookie, name: 'Cookie Security', description: 'Session flags, Secure/HttpOnly/SameSite analysis', color: 'text-yellow-500' },
                                { icon: UserCheck, name: 'Auth Flow', description: 'Login security, password policy, session management', color: 'text-teal-500' },
                                { icon: Lock, name: 'SSL/TLS', description: 'Certificate, HSTS, TLS version, mixed content', color: 'text-emerald-500' },
                                { icon: ExternalLink, name: 'Open Redirect', description: 'URL parameter and path-based redirect testing', color: 'text-fuchsia-500' },
                                { icon: Key, name: 'API Key Detector', description: 'Find exposed credentials and secrets in code', color: 'text-amber-500' },
                                { icon: GitBranch, name: 'GitHub Deep Scan', description: '40+ secret patterns across git history', color: 'text-blue-500' },
                                { icon: ServerCrash, name: 'Supabase Backend', description: 'RLS, storage, auth config, exposed tables', color: 'text-emerald-400' },
                                { icon: Flame, name: 'Firebase Backend', description: 'RTDB, Firestore, Storage, API key, auth enum', color: 'text-orange-400' },
                                { icon: Package, name: 'Dependencies', description: 'Known vulnerabilities via OSV.dev database', color: 'text-lime-500' },
                                { icon: Mail, name: 'DNS & Email', description: 'SPF, DKIM, DMARC, DNSSEC, subdomain takeover', color: 'text-violet-500' },
                                { icon: Radar, name: 'Threat Intelligence', description: 'Safe Browsing, VirusTotal, Shodan analysis', color: 'text-cyan-500' },
                                { icon: Cpu, name: 'Tech Stack & CVEs', description: 'Technology detection with live OSV.dev lookups', color: 'text-indigo-500' },
                                { icon: ClipboardCheck, name: 'OpenSSF Scorecard', description: 'Supply chain security: branch protection, pinned deps', color: 'text-green-500' },
                                { icon: ShieldCheck, name: 'GitHub Security', description: 'Dependabot, code scanning, and secret scanning alerts', color: 'text-blue-400' },
                                { icon: Settings2, name: 'Supabase Deep Lint', description: 'RLS, policies, SECURITY DEFINER, extensions audit', color: 'text-emerald-300' },
                                { icon: Zap, name: 'Convex Backend', description: 'Deployment URL, admin keys, function enum, CORS', color: 'text-yellow-400' },
                                { icon: Triangle, name: 'Vercel Hosting', description: 'Source maps, .env, _next/data leaks, git exposure', color: 'text-white' },
                                { icon: Globe2, name: 'Netlify Hosting', description: 'Functions, build metadata, config files, git exposure', color: 'text-teal-400' },
                                { icon: Cloud, name: 'Cloudflare Pages', description: 'Workers, old deploys, source maps, config exposure', color: 'text-orange-300' },
                                { icon: TrainFront, name: 'Railway Hosting', description: 'Error disclosure, config files, connection strings', color: 'text-zinc-300' },
                                { icon: Scale, name: 'Legal Compliance', description: 'GDPR, CCPA, claim verification', color: 'text-blue-500' },
                                { icon: Search, name: 'AI Detection', description: 'Detects AI-generated sites and vibe-coded patterns', color: 'text-pink-400' },
                            ].map((check) => (
                                <div
                                    key={check.name}
                                    className="relative p-3.5 rounded-lg border border-white/[0.06] bg-slate-800/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <check.icon className={`h-5 w-5 ${check.color} shrink-0`} />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-medium text-sm text-white">{check.name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {check.description}
                                            </p>
                                        </div>
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
                    <Button type="button" variant="outline" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-zinc-300">
                        <Link href="/dashboard/scans">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting Scan...
                            </>
                        ) : (
                            'Start Scan'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
