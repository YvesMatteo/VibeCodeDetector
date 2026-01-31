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
} from 'lucide-react';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
}

function getScoreBg(score: number) {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    if (score >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
}

function getSeverityStyles(severity: string) {
    switch (severity) {
        case 'critical':
            return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        case 'high':
            return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
        case 'medium':
            return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        default:
            return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    }
}

const scannerIcons = {
    security: Shield,
    seo: Search,
    api_keys: Key,
};

const scannerNames = {
    security: 'Security Scanner',
    seo: 'SEO Analyzer',
    api_keys: 'API Key Detector',
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

    // Aggregate counts
    const totalFindings = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    Object.values(results).forEach((result: any) => {
        if (result.findings && Array.isArray(result.findings)) {
            result.findings.forEach((f: any) => {
                const sev = f.severity?.toLowerCase();
                if (sev === 'critical') totalFindings.critical++;
                else if (sev === 'high') totalFindings.high++;
                else if (sev === 'medium') totalFindings.medium++;
                else totalFindings.low++; // Treat 'low', 'info', etc as low or ignore
            });
        }
    });

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/scans"
                    className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Scans
                </Link>

                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{scan.url.replace(/^https?:\/\//, '')}</h1>
                            <a
                                href={scan.url.startsWith('http') ? scan.url : `https://${scan.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Scanned on {new Date(scan.completed_at || scan.created_at).toLocaleString()}
                            </div>
                            <Badge variant="secondary">{scan.status}</Badge>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                        <Button>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rescan
                        </Button>
                    </div>
                </div>
            </div>

            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className={getScoreBg(scan.overall_score || 0)}>
                    <CardContent className="pt-6 text-center">
                        <div className={`text-5xl font-bold ${getScoreColor(scan.overall_score || 0)}`}>
                            {scan.overall_score}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
                    </CardContent>
                </Card>

                {Object.entries(results).map(([key, result]) => {
                    const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                    // Handle case where result might be an error object or missing score
                    const score = typeof result.score === 'number' ? result.score : 0;

                    return (
                        <Card key={key}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                                        {score}
                                    </span>
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
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Findings Summary</CardTitle>
                    <CardDescription>Issues found during the scan, grouped by severity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            <span className="font-medium">{totalFindings.critical} Critical</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                            <span className="font-medium">{totalFindings.high} High</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                            <span className="font-medium">{totalFindings.medium} Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <span className="font-medium">{totalFindings.low} Low</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Results by Scanner */}
            {Object.entries(results).map(([key, result]) => {
                const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                const score = typeof result.score === 'number' ? result.score : 0;
                // @ts-ignore
                const errorMessage = result.error;

                if (errorMessage) {
                    return (
                        <Card key={key} className="mb-6 border-red-500/50 bg-red-500/5">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-red-500" />
                                    <div>
                                        <CardTitle className="text-red-500">{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <CardDescription className="text-red-400">Scan Failed</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-mono text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-4 rounded">
                                    {errorMessage}
                                </p>
                            </CardContent>
                        </Card>
                    );
                }

                if (!result.findings || result.findings.length === 0) return null;

                return (
                    <Card key={key} className="mb-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6" />
                                    <div>
                                        <CardTitle>{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <CardDescription>{result.findings.length} issues found</CardDescription>
                                    </div>
                                </div>
                                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                                    {score}/100
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {result.findings.map((finding: any, index: number) => {
                                    const styles = getSeverityStyles(finding.severity);
                                    const SeverityIcon = styles.icon;

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border ${styles.bg} ${styles.border}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <SeverityIcon className={`h-5 w-5 mt-0.5 ${styles.color}`} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium">{finding.title}</h4>
                                                        <Badge variant="outline" className="text-xs capitalize">
                                                            {finding.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {finding.description}
                                                    </p>
                                                    {finding.recommendation && (
                                                        <p className="text-sm mt-2 text-muted-foreground font-medium">
                                                            Recommendation: {finding.recommendation}
                                                        </p>
                                                    )}
                                                    {finding.evidence && (
                                                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                                            {finding.evidence}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
