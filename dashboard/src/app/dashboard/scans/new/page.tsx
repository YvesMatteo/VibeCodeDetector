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
        tier: 'free',
    },
    {
        id: 'api_keys',
        name: 'API Key Detector',
        description: 'Find exposed credentials and secrets',
        icon: Key,
        color: 'text-amber-500',
        tier: 'free',
    },
    {
        id: 'seo',
        name: 'SEO Analyzer',
        description: 'Meta tags, Core Web Vitals, schema',
        icon: Search,
        color: 'text-green-500',
        tier: 'free',
    },
    {
        id: 'ai_detection',
        name: 'AI Detection',
        description: 'Detect AI-generated code and design',
        icon: Bot,
        color: 'text-purple-500',
        tier: 'pro',
    },
    {
        id: 'legal',
        name: 'Legal Compliance',
        description: 'GDPR, CCPA, claim verification',
        icon: Scale,
        color: 'text-blue-500',
        tier: 'pro',
    },
    {
        id: 'competitor',
        name: 'Competitor Intel',
        description: 'Tech stack, traffic, strategy analysis',
        icon: Users,
        color: 'text-cyan-500',
        tier: 'pro',
    },
];

export default function NewScanPage() {
    const [url, setUrl] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['security', 'seo']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function toggleScanType(id: string) {
        setSelectedTypes((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
        );
    }

    function isValidUrl(string: string) {
        try {
            const url = new URL(string.startsWith('http') ? string : `https://${string}`);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

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
            // Call the real scan API
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
                throw new Error(result.error || 'Scan failed');
            }

            // Redirect to scan results (or demo page if no scanId)
            if (result.scanId) {
                router.push(`/dashboard/scans/${result.scanId}`);
            } else {
                // Store results in session storage for demo display
                sessionStorage.setItem('lastScanResult', JSON.stringify(result));
                router.push('/dashboard/demo-results');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold">New Scan</h1>
                <p className="text-muted-foreground mt-1">
                    Enter a URL and select the types of scans to run
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* URL Input */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Target URL
                        </CardTitle>
                        <CardDescription>
                            Enter the website URL you want to scan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="url">Website URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="url"
                                    type="text"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="text-lg flex-1"
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
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Scan Types</CardTitle>
                        <CardDescription>
                            Select which scans to run on the target URL
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {scanTypes.map((type) => {
                                const isSelected = selectedTypes.includes(type.id);
                                const isPro = type.tier === 'pro';

                                return (
                                    <div
                                        key={type.id}
                                        onClick={() => !isPro && toggleScanType(type.id)}
                                        className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-muted-foreground/50'
                                            } ${isPro ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {isPro && (
                                            <Badge className="absolute top-2 right-2" variant="secondary">
                                                Pro
                                            </Badge>
                                        )}
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
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/dashboard">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting Scan...
                            </>
                        ) : (
                            <>
                                Start Scan
                                <span className="ml-2 text-primary-foreground/70">
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
