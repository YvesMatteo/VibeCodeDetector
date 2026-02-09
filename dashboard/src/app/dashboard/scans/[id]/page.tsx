import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    ExternalLink,
    Shield,
    Key,
    Search,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    RefreshCw,
    Bot,
    Scale,
    Radar,
    Info,
    Database,
    Server,
    Lock,
} from 'lucide-react';
import { AIFixPrompt } from '@/components/dashboard/ai-fix-prompt';
import { getPlainEnglish } from '@/lib/plain-english';

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

function getSeverityStyles(severity: string) {
    switch (severity) {
        case 'critical':
            return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
        case 'high':
            return { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
        case 'medium':
            return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
        default:
            return { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    }
}

const scannerIcons: Record<string, any> = {
    security: Shield,
    seo: Search,
    api_keys: Key,
    vibe_match: Bot,
    legal: Scale,
    threat_intelligence: Radar,
};

const scannerNames: Record<string, string> = {
    security: 'Security Scanner',
    seo: 'SEO Analyzer',
    api_keys: 'API Key Detector',
    vibe_match: 'Vibe Match',
    legal: 'Legal Compliance',
    threat_intelligence: 'Threat Intelligence',
};

// Define minimal types for the JSONB structure
interface ScanFinding {
    severity: string;
    title: string;
    description: string;
    [key: string]: any;
}

interface ScanResultItem {
    score: number;
    findings: ScanFinding[];
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

    const { data: scan, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error || !scan) {
        console.error('Error fetching scan:', error);
        return notFound();
    }

    const results = scan.results as Record<string, ScanResultItem>;

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
                if (sev === 'critical') totalFindings.critical++;
                else if (sev === 'high') totalFindings.high++;
                else if (sev === 'medium') totalFindings.medium++;
                else totalFindings.low++;
            });
        }
    });

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8 animate-fade-in-up">
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <AIFixPrompt url={scan.url} findings={allFindings} />
                        <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                        <Button className="shimmer-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rescan
                        </Button>
                    </div>
                </div>
            </div>

            {/* Score Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8 stagger-children">
                <Card className="bg-zinc-900/40 border-white/5">
                    <CardContent className="pt-6 flex flex-col items-center">
                        <ScoreRing score={scan.overall_score || 0} size="large" />
                        <p className="text-sm text-zinc-400 mt-4">Overall Score</p>
                    </CardContent>
                </Card>

                {Object.entries(results).map(([key, result], index) => {
                    const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                    const score = typeof result.score === 'number' ? result.score : 0;

                    return (
                        <Card key={key} className="bg-zinc-900/40 border-white/5 hover-lift group" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="relative">
                                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                                    </div>
                                    <ScoreRing score={score} size="small" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {scannerNames[key as keyof typeof scannerNames] || key}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {result.findings?.length || 0} issues found
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Findings Summary */}
            <Card className="mb-8 bg-zinc-900/40 border-white/5 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <CardHeader>
                    <CardTitle className="text-white">Findings Summary</CardTitle>
                    <CardDescription className="text-zinc-400">Issues found during the scan, grouped by severity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 md:gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 animate-pulse"></div>
                            <span className="font-medium">{totalFindings.critical}</span>
                            <span className="text-muted-foreground">Critical</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600"></div>
                            <span className="font-medium">{totalFindings.high}</span>
                            <span className="text-muted-foreground">High</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600"></div>
                            <span className="font-medium">{totalFindings.medium}</span>
                            <span className="text-muted-foreground">Medium</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600"></div>
                            <span className="font-medium">{totalFindings.low}</span>
                            <span className="text-muted-foreground">Low</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Results by Scanner */}
            {Object.entries(results).map(([key, result], scannerIndex) => {
                const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                const score = typeof result.score === 'number' ? result.score : 0;
                // @ts-ignore
                const errorMessage = result.error;

                if (errorMessage) {
                    return (
                        <Card key={key} className="mb-6 bg-zinc-900/40 border-red-500/30 animate-fade-in-up" style={{ animationDelay: `${500 + scannerIndex * 100}ms` }}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Icon className="h-6 w-6 text-red-400" />
                                        <div className="absolute inset-0 bg-red-500/30 blur-xl" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-red-400">{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <CardDescription className="text-red-400/70">Scan Failed</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-mono text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                                    {errorMessage}
                                </p>
                            </CardContent>
                        </Card>
                    );
                }

                if (!result.findings || result.findings.length === 0) return null;

                return (
                    <Card key={key} className="mb-6 bg-zinc-900/40 border-white/5 animate-fade-in-up" style={{ animationDelay: `${500 + scannerIndex * 100}ms` }}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Icon className="h-6 w-6 text-purple-400" />
                                        <div className="absolute inset-0 bg-purple-500/20 blur-xl" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <CardDescription className="text-zinc-400">{result.findings.length} issues found</CardDescription>
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                                    {score}/100
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const renderFinding = (finding: any, index: number) => {
                                    const styles = getSeverityStyles(finding.severity);
                                    const SeverityIcon = styles.icon;

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border ${styles.bg} ${styles.border} transition-all hover:bg-opacity-20`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <SeverityIcon className={`h-5 w-5 mt-0.5 ${styles.color}`} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium">{finding.title}</h4>
                                                        <Badge variant="outline" className={`text-xs capitalize ${styles.bg} ${styles.color} border-0`}>
                                                            {finding.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {finding.description}
                                                    </p>

                                                    {(() => {
                                                        const plainEnglish = getPlainEnglish(finding.title, finding.description);
                                                        if (plainEnglish) {
                                                            return (
                                                                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                                                    <div className="flex items-center gap-2 mb-1 text-blue-400">
                                                                        <Info className="h-4 w-4" />
                                                                        <span className="text-xs font-bold uppercase tracking-wider">Plain English</span>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-slate-200">{plainEnglish.summary}</p>
                                                                    <p className="text-xs text-slate-400 mt-1">{plainEnglish.whyItMatters}</p>
                                                                </div>
                                                            )
                                                        }
                                                        return null;
                                                    })()}
                                                    {finding.recommendation && (
                                                        <p className="text-sm mt-2 text-muted-foreground">
                                                            <span className="font-medium text-purple-400">Recommendation:</span> {finding.recommendation}
                                                        </p>
                                                    )}
                                                    {finding.evidence && (
                                                        <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs overflow-x-auto border border-white/5">
                                                            {finding.evidence}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                // For api_keys scanner, group findings by category
                                const hasCategories = key === 'api_keys' && result.findings.some((f: any) => f.category);

                                if (hasCategories) {
                                    const categories = [
                                        { key: 'credentials', label: 'Leaked Credentials', icon: Lock, color: 'text-red-400' },
                                        { key: 'infrastructure', label: 'Exposed Infrastructure', icon: Server, color: 'text-orange-400' },
                                        { key: 'databases', label: 'Exposed Databases', icon: Database, color: 'text-amber-400' },
                                    ];
                                    const uncategorized = result.findings.filter((f: any) => !f.category);

                                    return (
                                        <div className="space-y-6">
                                            {categories.map(cat => {
                                                const catFindings = result.findings.filter((f: any) => f.category === cat.key);
                                                if (catFindings.length === 0) return null;
                                                const CatIcon = cat.icon;
                                                return (
                                                    <div key={cat.key}>
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                                            <CatIcon className={`h-4 w-4 ${cat.color}`} />
                                                            <h3 className={`text-sm font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</h3>
                                                            <span className="text-xs text-zinc-500">({catFindings.length})</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {catFindings.map((finding: any, i: number) => renderFinding(finding, i))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {uncategorized.length > 0 && (
                                                <div className="space-y-4">
                                                    {uncategorized.map((finding: any, i: number) => renderFinding(finding, i))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {result.findings.map((finding: any, index: number) => renderFinding(finding, index))}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
