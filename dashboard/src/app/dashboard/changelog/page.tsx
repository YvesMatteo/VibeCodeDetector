import { Badge } from '@/components/ui/badge';

const changelog = [
    {
        version: '0.7.0',
        date: 'February 16, 2026',
        title: 'Free Tier & Blurred Findings',
        badge: 'Latest',
        changes: [
            { type: 'added', text: 'Free plan — 1 project, 3 scans/month, blurred finding details' },
            { type: 'added', text: 'Upgrade CTAs on blurred findings with direct link to pricing' },
            { type: 'changed', text: 'Pricing pages updated with free tier on both landing and dashboard' },
            { type: 'fixed', text: 'Currency detection now uses timezone first (fixes CHF/GBP on mobile)' },
        ],
    },
    {
        version: '0.6.0',
        date: 'February 15, 2026',
        title: 'Scanner Suite v7 — 30 Scanners',
        changes: [
            { type: 'added', text: 'DDoS protection scanner — WAF, CDN, and rate-limit detection' },
            { type: 'added', text: 'File upload scanner — checks upload forms for security restrictions' },
            { type: 'added', text: 'Audit logging scanner — monitoring and logging verification' },
            { type: 'added', text: 'Mobile API scanner — rate limiting checks for mobile endpoints' },
            { type: 'changed', text: 'All 30 edge functions deployed and wired to scan pipeline' },
            { type: 'changed', text: 'Scanner weights rebalanced for new categories' },
        ],
    },
    {
        version: '0.5.0',
        date: 'February 14, 2026',
        title: 'UX Polish',
        changes: [
            { type: 'added', text: 'Collapsible sidebar with persistent state' },
            { type: 'added', text: 'Toast notifications via Sonner (replaces inline alerts)' },
            { type: 'added', text: 'Two-step project creation form' },
            { type: 'added', text: 'Score ring animation on audit report' },
            { type: 'added', text: 'Finding dismissal system — dismiss false positives and accepted risks' },
            { type: 'changed', text: 'Skipped scanners now show missing config hint' },
        ],
    },
    {
        version: '0.4.0',
        date: 'February 13, 2026',
        title: 'Project-Based Architecture',
        changes: [
            { type: 'added', text: 'Projects — group scans under named projects with persistent config' },
            { type: 'added', text: 'Project CRUD API and dashboard pages' },
            { type: 'added', text: 'Scans linked to projects via foreign key' },
            { type: 'added', text: 'Project limit enforcement per plan' },
            { type: 'changed', text: 'Dashboard home redesigned as project grid' },
        ],
    },
    {
        version: '0.3.0',
        date: 'February 10, 2026',
        title: 'API Keys & Rate Limiting',
        changes: [
            { type: 'added', text: 'API key management — create, list, revoke keys' },
            { type: 'added', text: 'Scoped permissions: scan:read, scan:write, keys:read, keys:manage' },
            { type: 'added', text: 'Per-key rate limiting with sliding window (plan-based limits)' },
            { type: 'added', text: 'Domain restriction per key' },
            { type: 'added', text: 'MCP server integration for Claude Code' },
        ],
    },
    {
        version: '0.2.0',
        date: 'February 9, 2026',
        title: 'Security Hardening',
        changes: [
            { type: 'added', text: 'Row-Level Security trigger to prevent billing field manipulation' },
            { type: 'added', text: 'Atomic scan usage and domain registration functions' },
            { type: 'added', text: 'Stripe webhook idempotency via processed_webhook_events table' },
            { type: 'added', text: 'Edge function auth via shared scanner secret key' },
            { type: 'added', text: 'SSRF protection — private IP range validation' },
            { type: 'added', text: 'CORS restricted to ALLOWED_ORIGIN' },
            { type: 'added', text: 'Content Security Policy header' },
        ],
    },
    {
        version: '0.1.0',
        date: 'February 2026',
        title: 'Initial Release',
        changes: [
            { type: 'added', text: '26 security scanners covering OWASP top 10 and infrastructure' },
            { type: 'added', text: 'Stripe billing with Starter, Pro, and Max plans' },
            { type: 'added', text: 'Supabase auth with SSR cookie management' },
            { type: 'added', text: 'Landing page with pricing and feature overview' },
            { type: 'added', text: 'Markdown export for scan results' },
        ],
    },
];

const typeColors: Record<string, string> = {
    added: 'text-emerald-400',
    changed: 'text-sky-400',
    fixed: 'text-amber-400',
    removed: 'text-red-400',
};

const typeLabels: Record<string, string> = {
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed',
    removed: 'Removed',
};

export default function ChangelogPage() {
    return (
        <div className="p-4 md:p-8 max-w-3xl">
            <div className="mb-10">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                    Changelog
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    New updates and improvements to CheckVibe
                </p>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[5px] top-2 bottom-0 w-px bg-white/[0.06]" />

                <div className="space-y-10">
                    {changelog.map((release, i) => (
                        <div key={release.version} className="relative pl-8">
                            {/* Timeline dot */}
                            <div className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 ${
                                i === 0
                                    ? 'bg-white border-white'
                                    : 'bg-zinc-900 border-zinc-700'
                            }`} />

                            {/* Header */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-sm font-mono text-zinc-500">v{release.version}</span>
                                <span className="text-zinc-700">&middot;</span>
                                <span className="text-sm text-zinc-500">{release.date}</span>
                                {release.badge && (
                                    <Badge className="bg-white/10 text-white border-white/10 text-[10px] px-1.5 py-0">
                                        {release.badge}
                                    </Badge>
                                )}
                            </div>

                            <h2 className="text-base font-medium text-white mb-3">
                                {release.title}
                            </h2>

                            {/* Changes list */}
                            <ul className="space-y-1.5">
                                {release.changes.map((change, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm">
                                        <span className={`text-xs font-medium mt-0.5 w-16 shrink-0 ${typeColors[change.type]}`}>
                                            {typeLabels[change.type]}
                                        </span>
                                        <span className="text-zinc-400">{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
