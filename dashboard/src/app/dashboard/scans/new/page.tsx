'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Key,
    Bot,
    Scale,
    Search,
    Users,
    ArrowLeft,
    Loader2,
    Globe,
} from 'lucide-react';

const scanTypes = [
    {
        id: 'security',
        name: 'Security Scanner',
        description: 'Vulnerabilities, headers, SSL, and more',
        icon: Shield,
        color: 'text-red-500',
    },
    {
        id: 'api_keys',
        name: 'API Key Detector',
        description: 'Find exposed credentials and secrets',
        icon: Key,
        color: 'text-amber-500',
    },
    {
        id: 'seo',
        name: 'SEO Analyzer',
        description: 'Meta tags, Core Web Vitals, schema',
        icon: Search,
        color: 'text-green-500',
    },
    {
        id: 'vibe_match',
        name: 'Vibe Match',
        description: 'AI-generated code detection and analysis',
        icon: Bot,
        color: 'text-purple-500',
    },
    {
        id: 'legal',
        name: 'Legal Compliance',
        description: 'GDPR, CCPA, claim verification',
        icon: Scale,
        color: 'text-blue-500',
    },
    {
        id: 'threat_intelligence',
        name: 'Threat Intelligence',
        description: 'Safe Browsing, VirusTotal, Shodan analysis',
        icon: Users,
        color: 'text-cyan-500',
    },
];

export default function NewScanPage() {
    const [url, setUrl] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['security', 'seo']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const router = useRouter();

    function toggleScanType(id: string) {
        setSelectedTypes((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    }

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
            setError('Please enter a URL');
            return;
        }

        if (!isValidUrl(url)) {
            setError('Please enter a valid URL');
            return;
        }

        if (selectedTypes.length === 0) {
            setError('Please select at least one scan type');
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
                    scanTypes: selectedTypes,
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
                router.push('/dashboard/demo-results');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-zinc-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">New Scan</h1>
                <p className="text-zinc-400 mt-1">
                    Enter a URL and select the types of scans to run
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* URL Input */}
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
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
                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p>{error}</p>
                                {errorCode === 'PLAN_REQUIRED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block">
                                        Subscribe to a plan &rarr;
                                    </Link>
                                )}
                                {errorCode === 'SCAN_LIMIT_REACHED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block">
                                        Upgrade your plan &rarr;
                                    </Link>
                                )}
                                {errorCode === 'DOMAIN_LIMIT_REACHED' && (
                                    <Link href="/dashboard/credits" className="text-blue-400 hover:underline mt-1 inline-block">
                                        Upgrade for more domains &rarr;
                                    </Link>
                                )}
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
                    </CardContent>
                </Card>

                {/* Scan Types */}
                <Card className="mb-6 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Scan Types</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Select which scans to run on the target URL
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {scanTypes.map((type) => {
                                const isSelected = selectedTypes.includes(type.id);

                                return (
                                    <div
                                        key={type.id}
                                        role="checkbox"
                                        aria-checked={isSelected}
                                        tabIndex={0}
                                        onClick={() => toggleScanType(type.id)}
                                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleScanType(type.id); } }}
                                        className={`relative p-4 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected
                                            ? 'border-blue-500/50 bg-blue-500/10'
                                            : 'border-white/5 hover:border-white/10 bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <type.icon className={`h-6 w-6 ${type.color} mt-0.5`} />
                                            <div>
                                                <h3 className="font-medium">{type.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {type.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                                Starting Scan...
                            </>
                        ) : (
                            <>
                                Start Scan
                                <span className="ml-2 text-blue-100 opacity-70">
                                    ({selectedTypes.length} selected)
                                </span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
