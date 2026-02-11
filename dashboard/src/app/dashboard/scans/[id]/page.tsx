import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
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
    Clock,
    Download,
    RefreshCw,
    Scale,
    Radar,
    Database,
    Cpu,
    GitBranch,
    Globe,
    ShieldAlert,
    Cookie,
    UserCheck,
    Lock,
    Mail,
    Code,
    Package,
    ServerCrash,
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

const scannerIcons: Record<string, any> = {
    security: Shield,
    api_keys: Key,
    legal: Scale,
    threat_intelligence: Radar,
    sqli: Database,
    github_secrets: GitBranch,
    github_security: ShieldAlert,
    scorecard: Shield,
    tech_stack: Cpu,
    cors: Globe,
    csrf: ShieldAlert,
    cookies: Cookie,
    auth: UserCheck,
    supabase_backend: ServerCrash,
    dependencies: Package,
    ssl_tls: Lock,
    dns_email: Mail,
    xss: Code,
    open_redirect: ExternalLink,
};

const scannerNames: Record<string, string> = {
    security: 'Security Scanner',
    api_keys: 'API Key Detector',
    legal: 'Legal Compliance',
    threat_intelligence: 'Threat Intelligence',
    sqli: 'SQL Injection',
    github_secrets: 'GitHub Deep Scan',
    github_security: 'GitHub Security Alerts',
    scorecard: 'OpenSSF Scorecard',
    tech_stack: 'Tech Stack & CVEs',
    cors: 'CORS Misconfiguration',
    csrf: 'CSRF Protection',
    cookies: 'Cookie & Session Security',
    auth: 'Authentication Flow',
    supabase_backend: 'Supabase Backend',
    dependencies: 'Dependency Vulnerabilities',
    ssl_tls: 'SSL/TLS Security',
    dns_email: 'DNS & Email Security',
    xss: 'XSS Detection',
    open_redirect: 'Open Redirect',
};

function getVibeRating(score: number): { label: string; emoji: string; color: string; bg: string } {
    if (score >= 90) return { label: 'Immaculate Vibes', emoji: '✨', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 75) return { label: 'Good Vibes', emoji: '🟢', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
    if (score >= 60) return { label: 'Cautious Vibes', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (score >= 40) return { label: 'Sketchy Vibes', emoji: '🟠', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    if (score >= 20) return { label: 'Bad Vibes', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { label: 'Danger Zone', emoji: '💀', color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' };
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                        <AIFixPrompt url={scan.url} findings={allFindings} techStack={(results as any)?.tech_stack} />
                        <div className="flex gap-3">
                            <Button variant="outline" disabled title="Coming soon" className="opacity-50 cursor-not-allowed bg-white/5 border-white/10 flex-1 sm:flex-none">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 flex-1 sm:flex-none hover:from-purple-500 hover:to-pink-500">
                                <Link href={`/dashboard/scans/new?url=${encodeURIComponent(scan.url)}`}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Rescan
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Overview */}
            <Card className="bg-zinc-900/40 border-white/5 mb-8 animate-fade-in-up">
                <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                    <ScoreRing score={scan.overall_score || 0} size="large" />
                    <div className="flex flex-col items-center sm:items-start gap-3">
                        {(() => {
                            const vibe = getVibeRating(scan.overall_score || 0);
                            return (
                                <div className={`px-3 py-1.5 rounded-full border ${vibe.bg} flex items-center gap-1.5`}>
                                    <span>{vibe.emoji}</span>
                                    <span className={`text-sm font-medium ${vibe.color}`}>{vibe.label}</span>
                                </div>
                            );
                        })()}
                        <p className="text-2xl font-medium text-white">
                            {issueCount} {issueCount === 1 ? 'issue' : 'issues'} found
                        </p>
                        <p className="text-sm text-zinc-400">
                            across {Object.keys(results).length} scanners
                        </p>
                    </div>
                </CardContent>
            </Card>

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
            <ScannerAccordion results={results} />
        </div>
    );
}
