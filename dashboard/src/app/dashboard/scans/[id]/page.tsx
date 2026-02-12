import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    ExternalLink,
    AlertTriangle,
    Clock,
    Download,
    RefreshCw,
    Layers,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { ScannerAccordion } from '@/components/dashboard/scanner-accordion';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function getScoreRingColor(score: number) {
    if (score >= 80) return 'stroke-green-500';
    if (score >= 60) return 'stroke-amber-500';
    if (score >= 40) return 'stroke-orange-500';
    return 'stroke-red-500';
}

function getVibeRating(score: number): { label: string; color: string; bg: string } {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 75) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (score >= 60) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (score >= 40) return { label: 'Needs Work', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (score >= 20) return { label: 'At Risk', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' };
}

interface ScanResultItem {
    score: number;
    findings: { severity: string; title: string; description: string;[key: string]: any }[];
}

// Animated score ring component
function ScoreRing({ score, size = 'large' }: { score: number; size?: 'small' | 'large' }) {
    const dimensions = size === 'large' ? { container: 120, radius: 52, strokeWidth: 8 } : { container: 56, radius: 24, strokeWidth: 4 };
    const circumference = 2 * Math.PI * dimensions.radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className={`relative flex items-center justify-center`} style={{ width: dimensions.container, height: dimensions.container }}>
            <svg className="absolute -rotate-90" style={{ width: dimensions.container, height: dimensions.container }}>
                <circle
                    cx={dimensions.container / 2}
                    cy={dimensions.container / 2}
                    r={dimensions.radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={dimensions.strokeWidth}
                    className="text-white/10"
                />
                <circle
                    cx={dimensions.container / 2}
                    cy={dimensions.container / 2}
                    r={dimensions.radius}
                    fill="none"
                    strokeWidth={dimensions.strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${getScoreRingColor(score)} transition-all duration-1000`}
                />
            </svg>
            <span className={`font-bold ${getScoreColor(score)} ${size === 'large' ? 'text-4xl' : 'text-xl'}`}>{score}</span>
        </div>
    );
}

export default async function ScanDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: scan, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (error || !scan) {
        console.error('Error fetching scan:', error);
        return notFound();
    }

    const results = scan.results as Record<string, ScanResultItem>;

    // Separate tech_stack from scanner results
    const techStack = (results as any).tech_stack;
    const techStackCveFindings = techStack?.findings?.filter(
        (f: any) => f.severity?.toLowerCase() !== 'info'
    ) || [];

    // Build scanner results without tech_stack for the accordion
    const scannerResults = Object.fromEntries(
        Object.entries(results).filter(([key]) => key !== 'tech_stack')
    );

    // Count visible scanners (exclude hidden hosting + tech_stack)
    const visibleScannerCount = Object.entries(scannerResults).filter(([key, result]: [string, any]) => {
        if (key.endsWith('_hosting') && result.score === 100 && !result.error) {
            const allInfo = !result.findings?.length || result.findings.every((f: any) => f.severity?.toLowerCase() === 'info');
            if (allInfo) return false;
        }
        return true;
    }).length;

    // Aggregate counts and findings
    const totalFindings = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    // Collect all findings for AI prompt
    const allFindings: any[] = [];

    Object.values(results).forEach((result: any) => {
        if (result.findings && Array.isArray(result.findings)) {
            allFindings.push(...result.findings);
            result.findings.forEach((f: any) => {
                const sev = f.severity?.toLowerCase();
                if (sev === 'info') return; // info findings are not security issues
                if (sev === 'critical') totalFindings.critical++;
                else if (sev === 'high') totalFindings.high++;
                else if (sev === 'medium') totalFindings.medium++;
                else totalFindings.low++;
            });
        }
    });

    const issueCount = totalFindings.critical + totalFindings.high + totalFindings.medium + totalFindings.low;

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/scans"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Scans
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white break-all">{scan.url.replace(/^https?:\/\//, '')}</h1>
                            <a
                                href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Scanned on {new Date(scan.completed_at || scan.created_at).toLocaleString()}
                            </div>
                            <Badge variant="secondary" className="bg-white/5 border-white/10">{scan.status}</Badge>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <AIFixPrompt url={scan.url} findings={allFindings} techStack={(results as any)?.tech_stack} />
                        <div className="flex gap-3">
                            <Button variant="outline" disabled title="Coming soon" className="opacity-50 cursor-not-allowed bg-white/5 border-white/10 flex-1 sm:flex-none">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button asChild className="bg-purple-600 hover:bg-purple-500 border-0 flex-1 sm:flex-none transition-colors">
                                <Link href={`/dashboard/scans/new?url=${encodeURIComponent(scan.url)}`}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Rescan
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score & Findings Overview */}
            <Card className="bg-zinc-900/40 border-white/5 mb-8">
                <CardContent className="py-6">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <ScoreRing score={scan.overall_score || 0} size="large" />
                        <div className="flex-1 flex flex-col items-center sm:items-start gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                {(() => {
                                    const vibe = getVibeRating(scan.overall_score || 0);
                                    return (
                                        <div className={`px-2.5 py-1 rounded-md border ${vibe.bg}`}>
                                            <span className={`text-xs font-medium ${vibe.color}`}>{vibe.label}</span>
                                        </div>
                                    );
                                })()}
                                <span className="text-sm text-zinc-400">
                                    {issueCount} {issueCount === 1 ? 'issue' : 'issues'} across {visibleScannerCount} scanners
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                                    <span className="text-sm font-medium text-white">{totalFindings.critical}</span>
                                    <span className="text-sm text-zinc-500">Critical</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                                    <span className="text-sm font-medium text-white">{totalFindings.high}</span>
                                    <span className="text-sm text-zinc-500">High</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                                    <span className="text-sm font-medium text-white">{totalFindings.medium}</span>
                                    <span className="text-sm text-zinc-500">Medium</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                                    <span className="text-sm font-medium text-white">{totalFindings.low}</span>
                                    <span className="text-sm text-zinc-500">Low</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detected Stack */}
            {techStack && (techStack.technologies?.length > 0 || techStackCveFindings.length > 0) && (
                <Card className="mb-8 bg-zinc-900/40 border-white/5">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Layers className="h-5 w-5 text-indigo-400" />
                            <div>
                                <CardTitle className="text-white">Detected Stack</CardTitle>
                                <CardDescription className="text-zinc-400">Technologies and frameworks detected on this site</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {techStack.technologies?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {techStack.technologies.map((tech: any, i: number) => (
                                    <Badge key={i} variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-sm px-3 py-1">
                                        {tech.name}{tech.version ? ` ${tech.version}` : ''}
                                        {tech.category && <span className="ml-1.5 text-zinc-500 text-xs">({tech.category})</span>}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {techStackCveFindings.length > 0 && (
                            <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Known Vulnerabilities (CVEs)</h4>
                                {techStackCveFindings.map((finding: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg border bg-red-500/10 border-red-500/30">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="h-4 w-4 text-red-400" />
                                            <span className="font-medium text-sm">{finding.title}</span>
                                            <Badge variant="outline" className="text-xs capitalize bg-red-500/10 text-red-400 border-0">
                                                {finding.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                                        {finding.recommendation && (
                                            <p className="text-sm mt-1 text-muted-foreground">
                                                <span className="font-medium text-purple-400">Fix:</span> {finding.recommendation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Detailed Results by Scanner */}
            <ScannerAccordion results={scannerResults} />
        </div>
    );
}
