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
    Eye,
    Zap,
    Triangle,
    Globe2,
    Cloud,
    TrainFront,
    Upload,
    FileText,
    Smartphone,
    CircleSlash,
    Flag,
    X,
    Sparkles,
    Copy,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPlainEnglish } from '@/lib/plain-english';
import { buildFingerprint, DISMISSAL_REASONS, type DismissalReason, type DismissalScope } from '@/lib/dismissals';
import { toast } from 'sonner';

function getIssueCountColor(count: number) {
    if (count === 0) return 'text-green-400';
    if (count <= 3) return 'text-amber-400';
    if (count <= 7) return 'text-orange-400';
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
            return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
        default:
            return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
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
    vercel_hosting: Triangle,
    netlify_hosting: Globe2,
    cloudflare_hosting: Cloud,
    railway_hosting: TrainFront,
    convex_backend: Zap,
    vibe_match: Search,
    ddos_protection: ShieldCheck,
    file_upload: Upload,
    audit_logging: FileText,
    mobile_api: Smartphone,
};

const scannerNames: Record<string, string> = {
    security: 'Security Scanner',
    api_keys: 'API Key Detector',
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
    vercel_hosting: 'Vercel Hosting',
    netlify_hosting: 'Netlify Hosting',
    cloudflare_hosting: 'Cloudflare Pages',
    railway_hosting: 'Railway Hosting',
    convex_backend: 'Convex Backend',
    vibe_match: 'AI Detection',
    ddos_protection: 'DDoS Protection',
    file_upload: 'File Upload Security',
    audit_logging: 'Audit Logging & Monitoring',
    mobile_api: 'Mobile API Rate Limiting',
};

interface DismissCallback {
    (fingerprint: string, scannerKey: string, finding: any, reason: DismissalReason, scope: DismissalScope, note?: string): void;
}

interface ScannerAccordionProps {
    results: Record<string, any>;
    dismissedFingerprints?: Set<string>;
    onDismiss?: DismissCallback;
    onRestore?: (dismissalId: string) => void;
    userPlan?: string;
}

// ---------------------------------------------------------------------------
// Summary vs detail finding detection
// ---------------------------------------------------------------------------

const SUMMARY_IDS = new Set([
    'gh-sec-dependabot-summary',
    'gh-sec-codescan-summary',
    'gh-sec-secrets-summary',
    'scorecard-overall',
]);

function isSummaryFinding(f: any): boolean {
    return SUMMARY_IDS.has(f.id);
}

/** Split findings into summaries and their associated detail findings. */
function splitFindings(findings: any[]): { summaries: any[]; details: any[]; plain: any[] } {
    const summaries: any[] = [];
    const details: any[] = [];
    const plain: any[] = [];

    // Map summary IDs to their detail prefix
    const prefixMap: Record<string, string> = {
        'gh-sec-dependabot-summary': 'gh-sec-dependabot-',
        'gh-sec-codescan-summary': 'gh-sec-codescan-',
        'gh-sec-secrets-summary': 'gh-sec-secret-',
        'scorecard-overall': 'scorecard-',
    };

    const summaryIds = new Set<string>();
    const detailIds = new Set<string>();

    for (const f of findings) {
        if (isSummaryFinding(f)) {
            summaries.push(f);
            summaryIds.add(f.id);
        }
    }

    // Collect detail findings that belong to a summary
    for (const f of findings) {
        if (summaryIds.has(f.id)) continue;
        let isDetail = false;
        for (const [sumId, prefix] of Object.entries(prefixMap)) {
            if (summaryIds.has(sumId) && f.id?.startsWith(prefix)) {
                details.push({ ...f, _summaryId: sumId });
                detailIds.add(f.id);
                isDetail = true;
                break;
            }
        }
        if (!isDetail) {
            plain.push(f);
        }
    }

    return { summaries, details, plain };
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

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
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {counts.critical > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                    {counts.critical} critical
                </span>
            )}
            {counts.high > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5">
                    {counts.high} high
                </span>
            )}
            {counts.medium > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                    {counts.medium} med
                </span>
            )}
            {counts.low > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                    {counts.low} low
                </span>
            )}
        </div>
    );
}

function DismissDropdown({ onConfirm, onClose }: { onConfirm: (reason: DismissalReason, scope: DismissalScope, note?: string) => void; onClose: () => void }) {
    const [reason, setReason] = useState<DismissalReason>('false_positive');
    const [scope, setScope] = useState<DismissalScope>('project');
    const [note, setNote] = useState('');

    return (
        <div className="mt-3 p-3 bg-slate-800/80 border border-white/10 rounded-lg space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Dismiss finding</span>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {DISMISSAL_REASONS.map(r => (
                    <button
                        key={r.value}
                        onClick={() => setReason(r.value)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${reason === r.value
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                        }`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
            <input
                type="text"
                placeholder="Add a note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-black/30 border border-white/10 rounded-md text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
            />
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScope('project')}
                        className={`text-xs px-2 py-1 rounded transition-colors ${scope === 'project' ? 'text-indigo-300 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        All scans
                    </button>
                    <button
                        onClick={() => setScope('scan')}
                        className={`text-xs px-2 py-1 rounded transition-colors ${scope === 'scan' ? 'text-indigo-300 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        This scan only
                    </button>
                </div>
                <button
                    onClick={() => onConfirm(reason, scope, note || undefined)}
                    className="text-xs font-medium px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-md transition-colors"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}

function FindingCard({ finding, index, scannerKey, onDismiss, userPlan }: { finding: any; index: number; scannerKey?: string; onDismiss?: (fingerprint: string, scannerKey: string, finding: any, reason: DismissalReason, scope: DismissalScope, note?: string) => void; userPlan?: string }) {
    const [showDismiss, setShowDismiss] = useState(false);
    const [showAiFix, setShowAiFix] = useState(false);
    const styles = getSeverityStyles(finding.severity);
    const SeverityIcon = styles.icon;
    const canDismiss = !!onDismiss && !!scannerKey && finding.severity?.toLowerCase() !== 'info';
    const isFreePlan = userPlan === 'none';

    return (
        <div
            key={index}
            className={`p-4 rounded-lg border ${styles.bg} ${styles.border} transition-all hover:bg-opacity-20 group/finding relative`}
        >
            <div className="flex items-start gap-3">
                <SeverityIcon className={`h-5 w-5 mt-0.5 ${styles.color}`} />
                <div className="flex-1">
                    {/* Title + severity badge — always visible */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium">{finding.title}</h4>
                        <Badge variant="outline" className={`text-xs capitalize shrink-0 ${styles.bg} ${styles.color} border-0`}>
                            {finding.severity}
                        </Badge>
                        {!isFreePlan && canDismiss && !showDismiss && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDismiss(true); }}
                                className="ml-auto opacity-0 group-hover/finding:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all p-1 rounded hover:bg-white/5"
                                title="Dismiss this finding"
                            >
                                <Flag className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {isFreePlan ? (
                        /* Blurred details for free users */
                        <div className="relative mt-1">
                            <div className="max-h-[4.5rem] overflow-hidden">
                                <div className="blur-[6px] select-none pointer-events-none">
                                    <p className="text-sm text-muted-foreground">{finding.description}</p>
                                    {finding.recommendation && (
                                        <p className="text-sm mt-2 text-muted-foreground">
                                            <span className="font-medium text-blue-400">Recommendation:</span> {finding.recommendation}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/70 to-transparent flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Lock className="h-4 w-4" />
                                    <span className="text-sm font-medium">Upgrade to see details</span>
                                </div>
                                <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 text-xs px-4">
                                    <Link href="/dashboard/credits">View Plans</Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Full details for paid users */
                        <>
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
                                                <span className="text-xs font-medium tracking-wide">What this means</span>
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
                                    <span className="font-medium text-blue-400">Recommendation:</span> {finding.recommendation}
                                </p>
                            )}
                            {finding.reportUrl && (
                                <a
                                    href={finding.reportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    View Full Report
                                </a>
                            )}
                            {finding.evidence && (
                                <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs overflow-x-auto border border-white/5">
                                    {finding.evidence}
                                </pre>
                            )}
                            {finding.severity?.toLowerCase() !== 'info' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowAiFix(!showAiFix); }}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    {showAiFix ? 'Hide AI fix' : 'AI fix suggestion'}
                                </button>
                            )}
                            {showAiFix && (
                                <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                    <p className="text-blue-400 font-medium mb-2 text-xs">Copy this to your AI coding assistant:</p>
                                    <pre className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap font-mono">{`Fix the following security issue:\n\nIssue: ${finding.title}\nSeverity: ${finding.severity}${finding.description ? `\nDetails: ${finding.description}` : ''}${finding.recommendation ? `\nRecommendation: ${finding.recommendation}` : ''}${finding.evidence ? `\nEvidence: ${finding.evidence}` : ''}\n\nPlease provide the exact code changes needed.`}</pre>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const text = `Fix the following security issue:\n\nIssue: ${finding.title}\nSeverity: ${finding.severity}${finding.description ? `\nDetails: ${finding.description}` : ''}${finding.recommendation ? `\nRecommendation: ${finding.recommendation}` : ''}${finding.evidence ? `\nEvidence: ${finding.evidence}` : ''}\n\nPlease provide the exact code changes needed.`;
                                            navigator.clipboard.writeText(text);
                                            toast.success('Copied to clipboard');
                                        }}
                                        className="mt-2 text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                                    >
                                        <Copy className="h-3 w-3" /> Copy
                                    </button>
                                </div>
                            )}
                            {showDismiss && scannerKey && onDismiss && (
                                <DismissDropdown
                                    onClose={() => setShowDismiss(false)}
                                    onConfirm={(reason, scope, note) => {
                                        const fp = buildFingerprint(scannerKey, finding);
                                        onDismiss(fp, scannerKey, finding, reason, scope, note);
                                        setShowDismiss(false);
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** A summary finding with expandable detail findings underneath. */
function SummaryWithDetails({ summary, details }: { summary: any; details: any[] }) {
    const [showDetails, setShowDetails] = useState(false);
    const styles = getSeverityStyles(summary.severity);
    const SeverityIcon = styles.icon;

    return (
        <div className={`rounded-lg border ${styles.bg} ${styles.border}`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <SeverityIcon className={`h-5 w-5 mt-0.5 ${styles.color}`} />
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-medium">{summary.title}</h4>
                            <Badge variant="outline" className={`text-xs capitalize shrink-0 ${styles.bg} ${styles.color} border-0`}>
                                {summary.severity}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{summary.description}</p>
                        {summary.recommendation && (
                            <p className="text-sm mt-2 text-muted-foreground">
                                <span className="font-medium text-blue-400">Recommendation:</span> {summary.recommendation}
                            </p>
                        )}
                        {summary.evidence && (
                            <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs overflow-x-auto border border-white/5">
                                {summary.evidence}
                            </pre>
                        )}
                        {details.length > 0 && (
                            <button
                                onClick={() => setShowDetails(v => !v)}
                                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 border border-blue-500/20 rounded-md px-3 py-1.5"
                            >
                                <Eye className="h-3 w-3" />
                                {showDetails ? 'Hide' : 'See'} {details.length} {details.length === 1 ? 'finding' : 'findings'}
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {showDetails && details.length > 0 && (
                <div className="px-3 sm:px-4 pb-4 space-y-3 border-t border-white/5 pt-3 ml-0 sm:ml-8">
                    {details.map((d, i) => (
                        <FindingCard key={i} finding={d} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Collapsible section for info/passing-check findings. */
function PassingChecksSection({ findings }: { findings: any[] }) {
    if (findings.length === 0) return null;
    return (
        <details className="mt-4 pt-3 border-t border-white/5">
            <summary className="cursor-pointer text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors flex items-center gap-1.5 select-none">
                <CheckCircle className="h-3.5 w-3.5" />
                {findings.length} passing check{findings.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-1.5">
                {findings.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs text-zinc-500 bg-slate-900/40 rounded">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500/50 mt-0.5 shrink-0" />
                        <span>{f.title}</span>
                    </div>
                ))}
            </div>
        </details>
    );
}

function FindingsList({ scannerKey, result, dismissedFingerprints, onDismiss, userPlan }: { scannerKey: string; result: any; dismissedFingerprints?: Set<string>; onDismiss?: DismissCallback; userPlan?: string }) {
    const allFindings: any[] = result.findings || [];

    // Filter out dismissed findings
    const isActive = (f: any) => {
        if (!dismissedFingerprints || dismissedFingerprints.size === 0) return true;
        return !dismissedFingerprints.has(buildFingerprint(scannerKey, f));
    };

    const actionable = allFindings.filter((f: any) => f.severity?.toLowerCase() !== 'info' && isActive(f));
    const passingChecks = allFindings.filter((f: any) => f.severity?.toLowerCase() === 'info');

    // For api_keys scanner, group findings by category
    const hasCategories = scannerKey === 'api_keys' && actionable.some((f: any) => f.category);

    if (hasCategories) {
        const categories = [
            { key: 'credentials', label: 'Leaked Credentials', icon: Lock, color: 'text-red-400' },
            { key: 'infrastructure', label: 'Exposed Infrastructure', icon: Server, color: 'text-orange-400' },
            { key: 'databases', label: 'Exposed Databases', icon: Database, color: 'text-amber-400' },
        ];
        const uncategorized = actionable.filter((f: any) => !f.category);

        return (
            <div className="space-y-6">
                {categories.map(cat => {
                    const catFindings = actionable.filter((f: any) => f.category === cat.key);
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
                                {catFindings.map((finding: any, i: number) => (
                                    <FindingCard key={i} finding={finding} index={i} scannerKey={scannerKey} onDismiss={onDismiss} userPlan={userPlan} />
                                ))}
                            </div>
                        </div>
                    );
                })}
                {uncategorized.length > 0 && (
                    <div className="space-y-4">
                        {uncategorized.map((finding: any, i: number) => (
                            <FindingCard key={i} finding={finding} index={i} scannerKey={scannerKey} onDismiss={onDismiss} />
                        ))}
                    </div>
                )}
                <PassingChecksSection findings={passingChecks} />
            </div>
        );
    }

    // Check if this scanner has summary+detail findings
    const { summaries, details, plain } = splitFindings(actionable);

    if (summaries.length > 0) {
        return (
            <div className="space-y-4">
                {summaries.map((summary, i) => {
                    const related = details.filter((d: any) => d._summaryId === summary.id);
                    return <SummaryWithDetails key={summary.id || i} summary={summary} details={related} />;
                })}
                {plain.length > 0 && plain.map((finding: any, i: number) => (
                    <FindingCard key={`plain-${i}`} finding={finding} index={i} scannerKey={scannerKey} onDismiss={onDismiss} userPlan={userPlan} />
                ))}
                <PassingChecksSection findings={passingChecks} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {actionable.map((finding: any, index: number) => (
                <FindingCard key={index} finding={finding} index={index} scannerKey={scannerKey} onDismiss={onDismiss} userPlan={userPlan} />
            ))}
            <PassingChecksSection findings={passingChecks} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Visibility helpers
// ---------------------------------------------------------------------------

// Check if a hosting scanner didn't detect its platform (all info, score 100)
function isNonApplicableHosting(key: string, result: any): boolean {
    if (!key.endsWith('_hosting')) return false;
    if (result.error) return false;
    if (typeof result.score !== 'number' || result.score !== 100) return false;
    if (!result.findings || result.findings.length === 0) return true;
    return result.findings.every((f: any) => f.severity?.toLowerCase() === 'info');
}

// Hide supabase_mgmt when it errored (JWT/token not provided) or has no real findings
// But don't hide if it's explicitly skipped (we want to show the "missing config" message)
function isNonApplicableMgmt(key: string, result: any): boolean {
    if (key !== 'supabase_mgmt') return false;
    if (result.skipped) return false; // Show skipped scanners
    if (result.error) return true; // Token wasn't provided or invalid
    if (!result.findings || result.findings.length === 0) return true;
    return result.findings.every((f: any) => f.severity?.toLowerCase() === 'info');
}

function shouldHide(key: string, result: any): boolean {
    return isNonApplicableHosting(key, result) || isNonApplicableMgmt(key, result);
}


// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------

// Display order — scanners listed here appear first (in this order).
// Anything not listed falls to the end, sorted alphabetically.
const SCANNER_ORDER: string[] = [
    'api_keys',
    'github_secrets',
    'github_security',
    'supabase_mgmt',
    'supabase_backend',
    'firebase_backend',
    'convex_backend',
    'security',
    'ddos_protection',
    'auth',
    'dependencies',
    'xss',
    'dns_email',
    'vercel_hosting',
    'netlify_hosting',
    'cloudflare_hosting',
    'railway_hosting',
    'file_upload',
    'audit_logging',
    'mobile_api',
    'ssl_tls',
    'sqli',
    'cors',
    'csrf',
    'cookies',
    'open_redirect',
    'scorecard',
    'threat_intelligence',
    'tech_stack',
    'legal',
];

function sortedEntries(results: Record<string, any>): [string, any][] {
    const entries = Object.entries(results);
    return entries.sort(([a], [b]) => {
        const ia = SCANNER_ORDER.indexOf(a);
        const ib = SCANNER_ORDER.indexOf(b);
        const oa = ia === -1 ? SCANNER_ORDER.length : ia;
        const ob = ib === -1 ? SCANNER_ORDER.length : ib;
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
    });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/** Count active (non-dismissed) issues for a scanner */
function countActiveIssues(scannerKey: string, findings: any[], dismissed?: Set<string>): number {
    return findings.filter((f: any) => {
        if (f.severity?.toLowerCase() === 'info') return false;
        if (dismissed && dismissed.size > 0 && dismissed.has(buildFingerprint(scannerKey, f))) return false;
        return true;
    }).length;
}

export function ScannerAccordion({ results, dismissedFingerprints, onDismiss, userPlan }: ScannerAccordionProps) {
    // All scanners start collapsed
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
            const result = results[key];
            if (!result.error && !result.skipped && (result.findings?.length > 0 || result.technologies?.length > 0)) {
                all.add(key);
            }
        });
        setOpenSections(all);
    };

    const collapseAll = () => {
        setOpenSections(new Set());
    };

    const allExpanded = Object.keys(results).every(key => {
        const result = results[key];
        if (result.error || result.skipped || (!result.findings?.length && !result.technologies?.length)) return true;
        return openSections.has(key);
    });

    const sorted = sortedEntries(results);

    return (
        <div>
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={allExpanded ? collapseAll : expandAll}
                    className="text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20 bg-white/5"
                >
                    {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
            </div>

            {sorted.map(([key, result], scannerIndex) => {
                // Hide non-applicable scanners
                if (shouldHide(key, result)) return null;

                const Icon = scannerIcons[key as keyof typeof scannerIcons] || AlertTriangle;
                const errorMessage = result.error;
                const isOpen = openSections.has(key);

                // Error state - always show
                if (errorMessage) {
                    return (
                        <Card key={key} className="mb-4 bg-slate-900/50 border-red-500/30 animate-fade-in-up" style={{ animationDelay: `${500 + scannerIndex * 100}ms` }}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-red-400 shrink-0" />
                                    <div>
                                        <CardTitle className="text-red-400">{scannerNames[key as keyof typeof scannerNames] || key}</CardTitle>
                                        <p className="text-sm text-red-400/70">Scan Failed</p>
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

                // Skipped state — scanner didn't run because config is missing
                if (result.skipped) {
                    const configHints: Record<string, string> = {
                        githubRepo: 'Add a GitHub repository link in your project settings to enable this scanner.',
                        supabasePAT: 'Add a Supabase Personal Access Token in your project settings to enable this scanner.',
                    };
                    const hint = configHints[result.missingConfig] || result.reason;
                    return (
                        <Card key={key} className="mb-4 bg-slate-900/30 border-zinc-800/50 animate-fade-in-up opacity-60 hover:opacity-80 transition-opacity" style={{ animationDelay: `${500 + scannerIndex * 100}ms` }}>
                            <div className="px-3 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon className="h-5 w-5 text-zinc-600 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-semibold text-zinc-500">
                                                {scannerNames[key as keyof typeof scannerNames] || key}
                                            </h3>
                                            <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-700/30 rounded-full px-2 py-0.5">
                                                <CircleSlash className="h-3 w-3" />
                                                Skipped
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-600 mt-1">{hint}</p>
                                    </div>
                                </div>
                                <span className="text-lg font-semibold tabular-nums text-zinc-700">—</span>
                            </div>
                        </Card>
                    );
                }

                // Skip scanners with no findings
                if ((!result.findings || result.findings.length === 0) && !result.technologies?.length) return null;

                return (
                    <Card key={key} className={"mb-4 bg-slate-900/50 animate-fade-in-up overflow-hidden border-slate-700/20"} style={{ animationDelay: `${500 + scannerIndex * 100}ms` }}>
                        {/* Clickable header */}
                        <button
                            onClick={() => toggle(key)}
                            className="w-full text-left px-3 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon className="h-5 w-5 text-zinc-400 shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-semibold text-white">
                                            {scannerNames[key as keyof typeof scannerNames] || key}
                                        </h3>
                                        <span className="text-xs text-zinc-500">
                                            {(() => { const c = countActiveIssues(key, result.findings || [], dismissedFingerprints); return `${c} ${c === 1 ? 'issue' : 'issues'}`; })()}
                                        </span>
                                    </div>
                                    <div className="mt-1.5">
                                        <SeveritySummary findings={(result.findings || []).filter((f: any) => !dismissedFingerprints?.has(buildFingerprint(key, f)))} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {(() => {
                                    const issues = countActiveIssues(key, result.findings || [], dismissedFingerprints);
                                    return (
                                        <span className={`text-lg font-semibold tabular-nums ${getIssueCountColor(issues)}`}>
                                            {issues}
                                        </span>
                                    );
                                })()}
                                <ChevronDown
                                    className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </button>

                        {/* Collapsible content */}
                        <div
                            className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                            <div className="overflow-hidden">
                                <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-white/5">
                                    {/* Tech Stack Badges */}
                                    {key === 'tech_stack' && result.technologies?.length > 0 && (
                                        <div className="mb-4 pb-4 border-b border-white/5">
                                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Detected Technologies</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.technologies.map((tech: any, i: number) => (
                                                    <Badge key={i} variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                                                        {tech.name}{tech.version ? ` ${tech.version}` : ''}
                                                        {tech.category && <span className="ml-1 text-zinc-500 text-xs">({tech.category})</span>}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <FindingsList scannerKey={key} result={result} dismissedFingerprints={dismissedFingerprints} onDismiss={onDismiss} userPlan={userPlan} />
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
