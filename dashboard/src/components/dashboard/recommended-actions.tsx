import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import type { AuditReportData } from './audit-report';

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
    domain_hijacking: 'Domain Hijacking Detection',
    debug_endpoints: 'Debug Endpoints Scanner',
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const severityDot: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-sky-400',
};

interface Action {
    severity: string;
    title: string;
    recommendation: string;
    scannerName: string;
}

function getTopActions(data: AuditReportData): Action[] {
    const allActionable: Array<{ finding: any; scannerKey: string }> = [];

    for (const [key, result] of Object.entries(data.scannerResults)) {
        if (!result?.findings) continue;
        for (const f of result.findings) {
            if (f.severity === 'info') continue;
            allActionable.push({ finding: f, scannerKey: key });
        }
    }
    for (const f of data.techStackCveFindings) {
        allActionable.push({ finding: f, scannerKey: 'tech_stack' });
    }

    allActionable.sort((a, b) => {
        const sevA = SEVERITY_ORDER[a.finding.severity] ?? 4;
        const sevB = SEVERITY_ORDER[b.finding.severity] ?? 4;
        return sevA - sevB;
    });

    return allActionable.slice(0, 5).map(({ finding, scannerKey }) => ({
        severity: finding.severity,
        title: finding.title,
        recommendation: finding.recommendation || 'Review and remediate this finding.',
        scannerName: scannerNames[scannerKey] || scannerKey,
    }));
}

export function RecommendedActions({ data }: { data: AuditReportData }) {
    if (data.issueCount === 0) return null;

    const actions = getTopActions(data);
    if (actions.length === 0) return null;

    return (
        <Card className="bg-zinc-900/40 border-white/5 mb-8">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-400" />
                    <CardTitle className="text-white text-base">Recommended Actions</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <ol className="space-y-3">
                    {actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="text-sm font-mono text-zinc-500 mt-0.5 w-5 shrink-0">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${severityDot[action.severity] || 'bg-zinc-500'}`} />
                                    <span className="text-sm font-medium text-white">{action.title}</span>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-2">{action.recommendation}</p>
                                <span className="text-[11px] text-zinc-600">— {action.scannerName}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}
