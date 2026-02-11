'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ExternalLink,
    Shield,
    Key,
    Search,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Scale,
    Radar,
    Info,
    Database,
    Server,
    Lock,
    Cpu,
    GitBranch,
    Globe,
    ShieldAlert,
    Cookie,
    UserCheck,
    Mail,
    Code,
    Package,
    ServerCrash,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPlainEnglish } from '@/lib/plain-english';

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function getSeverityStyles(severity: string) {
    switch (severity) {
        case 'critical':
            return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
        case 'high':
            return { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
        case 'medium':
            return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
        case 'low':
            return { icon: AlertTriangle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
        case 'info':
            return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
        default:
            return { icon: AlertTriangle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    }
}

const scannerIcons: Record<string, any> = {
    security: Shield,
    api_keys: Key,
    legal: Scale,
    threat_intelligence: Radar,
    sqli: Database,
    github_secrets: GitBranch,
    tech_stack: Cpu,
    cors: Globe,
    csrf: ShieldAlert,
    cookies: Cookie,
    auth: UserCheck,
    supabase_backend: ServerCrash,
    firebase_backend: Flame,
    scorecard: ClipboardCheck,
    github_security: ShieldCheck,
    supabase_mgmt: Settings2,
    dependencies: Package,
    ssl_tls: Lock,
    dns_email: Mail,
    xss: Code,
    open_redirect: ExternalLink,
    convex_backend: Zap,
    vercel_hosting: Triangle,
    netlify_hosting: Globe2,
    cloudflare_hosting: Cloud,
    railway_hosting: TrainFront,
};

const scannerNames: Record<string, string> = {
    security: 'Security Scanner',
    api_keys: 'Leaked API Keys',
    legal: 'Legal Compliance',
    threat_intelligence: 'Threat Intelligence',
    sqli: 'SQL Injection',
    github_secrets: 'GitHub Deep Scan',
    tech_stack: 'Tech Stack & CVEs',
    cors: 'CORS Misconfiguration',
    csrf: 'CSRF Protection',
    cookies: 'Cookie & Session Security',
    auth: 'Authentication Flow',
    supabase_backend: 'Supabase Backend',
    firebase_backend: 'Firebase Backend',
    scorecard: 'OpenSSF Scorecard',
    github_security: 'GitHub Security Alerts',
    supabase_mgmt: 'Supabase Deep Lint',
    dependencies: 'Dependency Vulnerabilities',
    ssl_tls: 'SSL/TLS Security',
    dns_email: 'DNS & Email Security',
    xss: 'XSS Detection',
    open_redirect: 'Open Redirect',
    convex_backend: 'Convex Backend',
    vercel_hosting: 'Vercel Hosting',
    netlify_hosting: 'Netlify Hosting',
    cloudflare_hosting: 'Cloudflare Pages',
    railway_hosting: 'Railway Hosting',
};

interface ScannerAccordionProps {
    results: Record<string, any>;
}

function SeveritySummary({ findings }: { findings: any[] }) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((f: any) => {
        const sev = f.severity?.toLowerCase();
        if (sev === 'info') return;
        if (sev === 'critical') counts.critical++;
        else if (sev === 'high') counts.high++;
        else if (sev === 'medium') counts.medium++;
        else counts.low++;
    });

    return (
        <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
                <span className="text-[11px] font-medium text-red-400 bg-red-500/10 rounded px-1.5 py-0.5">
                    {counts.critical} critical
                </span>
            )}
            {counts.high > 0 && (
                <span className="text-[11px] font-medium text-orange-400 bg-orange-500/10 rounded px-1.5 py-0.5">
                    {counts.high} high
                </span>
            )}
            {counts.medium > 0 && (
                <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5">
                    {counts.medium} med
                </span>
            )}
            {counts.low > 0 && (
                <span className="text-[11px] font-medium text-zinc-400 bg-white/[0.06] rounded px-1.5 py-0.5">
                    {counts.low} low
                </span>
            )}
        </div>
    );
}

function FindingCard({ finding, index }: { finding: any; index: number }) {
    const styles = getSeverityStyles(finding.severity);
    const SeverityIcon = styles.icon;

    return (
        <div
            key={index}
            className={`p-3 sm:p-4 rounded-lg border ${styles.bg} ${styles.border} transition-all hover:bg-opacity-20`}
        >
            <div className="flex items-start gap-2.5 sm:gap-3">
                <SeverityIcon className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0 ${styles.color}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm sm:text-base">{finding.title}</h4>
                        <Badge variant="outline" className={`text-xs capitalize shrink-0 ${styles.bg} ${styles.color} border-0`}>
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
                            );
                        }
                        return null;
                    })()}
                    {finding.recommendation && (
                        <p className="text-sm mt-2 text-muted-foreground">
                            <span className="font-medium text-zinc-300">Fix:</span> {finding.recommendation}
                        </p>
                    )}
                    {finding.reportUrl && (
                        <a
                            href={finding.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5"
                        >
                            <ExternalLink className="h-3 w-3" />
                            View Full Report
                        </a>
                    )}
                    {finding.evidence && (
                        <pre className="mt-2 p-2.5 sm:p-3 bg-black/30 rounded-lg text-[11px] sm:text-xs overflow-x-auto border border-white/[0.06] max-w-full">
                            {finding.evidence}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}

function FindingsList({ scannerKey, result }: { scannerKey: string; result: any }) {
    // For api_keys scanner, group findings by category
    const hasCategories = scannerKey === 'api_keys' && result.findings.some((f: any) => f.category);

    if (hasCategories) {
        const categories = [
            { key: 'credentials', label: 'Leaked Credentials', icon: Lock, color: 'text-red-400' },
            { key: 'infrastructure', label: 'Exposed Infrastructure', icon: Server, color: 'text-orange-400' },
            { key: 'databases', label: 'Exposed Databases', icon: Database, color: 'text-amber-400' },
            { key: 'github', label: 'GitHub Repository', icon: GitBranch, color: 'text-purple-400' },
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
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                                <CatIcon className={`h-4 w-4 ${cat.color}`} />
                                <h3 className={`text-sm font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</h3>
                                <span className="text-xs text-zinc-500">({catFindings.length})</span>
                            </div>
                            <div className="space-y-4">
                                {catFindings.map((finding: any, i: number) => (
                                    <FindingCard key={i} finding={finding} index={i} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                {uncategorized.length > 0 && (
                    <div className="space-y-4">
                        {uncategorized.map((finding: any, i: number) => (
                            <FindingCard key={i} finding={finding} index={i} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {result.findings.map((finding: any, index: number) => (
                <FindingCard key={index} finding={finding} index={index} />
            ))}
        </div>
    );
}

export function ScannerAccordion({ results }: ScannerAccordionProps) {
    // All sections start collapsed — user expands what they want to see
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    const toggle = (key: string) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const expandAll = () => {
        const all = new Set<string>();
        Object.keys(results).forEach(key => {
            if (key === 'github_secrets') return; // merged into api_keys
            const result = results[key];
            if (!result.error && (result.findings?.length > 0 || result.technologies?.length > 0)) {
                all.add(key);
            }
        });
        setOpenSections(all);
    };

    const collapseAll = () => {
        setOpenSections(new Set());
    };

    const allExpanded = Object.keys(results).every(key => {
        if (key === 'github_secrets') return true; // merged into api_keys
        const result = results[key];
        if (result.error || (!result.findings?.length && !result.technologies?.length)) return true;
        return openSections.has(key);
    });

    return (
        <div>
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={allExpanded ? collapseAll : expandAll}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1 rounded-md border border-white/[0.08] hover:border-white/[0.12] bg-white/[0.03]"
                >
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
            </div>

            {Object.entries(results).map(([key, result], scannerIndex) => {
                // github_secrets findings are merged into api_keys below
                if (key === 'github_secrets') return null;

                // Merge github_secrets findings into the api_keys section
                let displayResult = result;
                if (key === 'api_keys' && results.github_secrets && !results.github_secrets.error) {
                    const ghFindings = (results.github_secrets.findings || []).map((f: any) => ({
                        ...f,
                        category: f.category || 'github',
                    }));
                    if (ghFindings.length > 0) {
                        displayResult = {
                            ...result,
                            findings: [...(result.findings || []), ...ghFindings],
                        };
                    }
                }

                const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                const score = typeof displayResult.score === 'number' ? displayResult.score : 0;
                const errorMessage = displayResult.error;
                const isOpen = openSections.has(key);

                // Error state - always show
                if (errorMessage) {
                    return (
                        <Card key={key} className="mb-3 bg-white/[0.02] border-red-500/20" style={{ animationDelay: `${scannerIndex * 50}ms` }}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-red-400" />
                                    <div>
                                        <CardTitle className="text-sm font-medium text-red-400">{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <p className="text-xs text-red-400/60">Scan failed</p>
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

                // Skip scanners with no findings
                if ((!displayResult.findings || displayResult.findings.length === 0) && !displayResult.technologies?.length) return null;

                return (
                    <Card key={key} className="mb-3 bg-white/[0.02] border-white/[0.06] overflow-hidden" style={{ animationDelay: `${scannerIndex * 50}ms` }}>
                        {/* Clickable header */}
                        <button
                            onClick={() => toggle(key)}
                            className="w-full text-left px-3.5 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer min-h-[56px]"
                        >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                                        <h3 className="text-[13px] sm:text-sm font-medium text-white">
                                            {scannerNames[key as keyof typeof scannerNames] || key}
                                        </h3>
                                        <span className="text-[11px] sm:text-xs text-zinc-600">
                                            {(() => { const c = displayResult.findings.filter((f: any) => f.severity?.toLowerCase() !== 'info').length; return `${c} ${c === 1 ? 'issue' : 'issues'}`; })()}
                                        </span>
                                    </div>
                                    <div className="mt-1 hidden sm:block">
                                        <SeveritySummary findings={displayResult.findings} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                <div className={`text-base sm:text-lg font-semibold tabular-nums ${getScoreColor(score)}`}>
                                    {score}<span className="text-[10px] sm:text-xs text-zinc-600 font-normal">/100</span>
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 text-zinc-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </button>

                        {/* Collapsible content */}
                        <div
                            className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-white/[0.06]">
                                    {/* Tech Stack Badges */}
                                    {key === 'tech_stack' && displayResult.technologies?.length > 0 && (
                                        <div className="mb-4 pb-4 border-b border-white/[0.06]">
                                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Detected Technologies</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {displayResult.technologies.map((tech: any, i: number) => (
                                                    <Badge key={i} variant="outline" className="bg-white/[0.04] text-zinc-300 border-white/[0.08] text-xs">
                                                        {tech.name}{tech.version ? ` ${tech.version}` : ''}
                                                        {tech.category && <span className="ml-1 text-zinc-500 text-xs">({tech.category})</span>}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <FindingsList scannerKey={key} result={displayResult} />
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
