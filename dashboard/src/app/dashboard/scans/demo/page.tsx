'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    TrendingUp,
    Shield,
    Eye,
    Zap,
    Info,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { getPlainEnglish } from '@/lib/plain-english';

interface ScanResult {
    url: string;
    overallScore: number;
    scores: {
        seo: number;
        performance: number;
        accessibility: number;
        bestPractices: number;
    };
    recommendations: {
        title: string;
        description: string;
        impact: 'critical' | 'high' | 'medium' | 'low';
    }[];
    scanDuration: number;
}

function getScoreColor(score: number) {
    if (score >= 90) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
}

function getScoreBgColor(score: number) {
    if (score >= 90) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
}

function getImpactColor(impact: string) {
    switch (impact) {
        case 'critical':
            return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'high':
            return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'medium':
            return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

export default function DemoResultsPage() {
    const [result, setResult] = useState<ScanResult | null>(null);

    useEffect(() => {
        // Try to get result from sessionStorage
        const stored = sessionStorage.getItem('lastScanResult');
        if (stored) {
            setResult(JSON.parse(stored));
        }
    }, []);

    if (!result) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No scan results found.</p>
                        <Button asChild className="mt-4">
                            <Link href="/dashboard/scans/new">Start a New Scan</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const scoreCategories = [
        { key: 'seo', label: 'SEO', icon: TrendingUp, score: result.scores.seo },
        { key: 'performance', label: 'Performance', icon: Zap, score: result.scores.performance },
        { key: 'accessibility', label: 'Accessibility', icon: Eye, score: result.scores.accessibility },
        { key: 'bestPractices', label: 'Best Practices', icon: Shield, score: result.scores.bestPractices },
    ];

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Scan Results</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-foreground flex items-center gap-1"
                            >
                                {result.url}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {(result.scanDuration / 1000).toFixed(1)}s
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <AIFixPrompt url={result.url} findings={result.recommendations.map(r => ({
                            title: r.title,
                            description: r.description,
                            severity: r.impact
                        }))} />
                        <Badge variant="secondary" className="flex items-center gap-1 h-fit py-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Overall Score */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <div className={`text-6xl font-bold ${getScoreColor(result.overallScore)}`}>
                                {result.overallScore}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Overall Score</div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {scoreCategories.map((cat) => (
                                <div key={cat.key} className="text-center p-4 rounded-lg bg-muted/50">
                                    <cat.icon className={`h-5 w-5 mx-auto mb-2 ${getScoreColor(cat.score)}`} />
                                    <div className={`text-2xl font-bold ${getScoreColor(cat.score)}`}>
                                        {cat.score}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{cat.label}</div>
                                    <Progress
                                        value={cat.score}
                                        className="h-1 mt-2"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Recommendations
                    </CardTitle>
                    <CardDescription>
                        Issues found during the scan, sorted by impact
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {result.recommendations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                            <p>Great job! No significant issues found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {result.recommendations.map((rec, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium">{rec.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {rec.description}
                                            </p>
                                            {(() => {
                                                const plainEnglish = getPlainEnglish(rec.title, rec.description);
                                                if (plainEnglish) {
                                                    return (
                                                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                                            <div className="flex items-center gap-1 mb-1 text-blue-400">
                                                                <Info className="h-3 w-3" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Plain English</span>
                                                            </div>
                                                            <p className="text-xs font-medium text-slate-200">{plainEnglish.summary}</p>
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <Badge className={getImpactColor(rec.impact)}>
                                            {rec.impact}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/scans/new">New Scan</Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
