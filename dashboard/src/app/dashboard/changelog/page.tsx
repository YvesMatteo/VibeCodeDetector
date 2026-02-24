import { Badge } from '@/components/ui/badge';

const changelog = [
    {
        version: '1.0.0',
        date: 'February 24, 2026',
        title: 'Initial Release',
        badge: 'Launch',
        changes: [
            // Scanner Suite
            { type: 'added', text: '35 security scanners — security headers, API keys, SSL/TLS, DNS, XSS, SQLi, CSRF, CORS, cookies, auth, redirects, and more' },
            { type: 'added', text: 'Debug endpoints scanner — detects exposed .env, .git, phpinfo, actuator, profiler, GraphQL IDE, and 90+ dev paths' },
            { type: 'added', text: 'Domain hijacking scanner — RDAP registration, NS integrity, typosquatting, and zone exposure checks' },
            { type: 'added', text: 'DDoS protection scanner — WAF, CDN, and rate-limit detection' },
            { type: 'added', text: 'File upload, audit logging, and mobile API scanners' },
            { type: 'added', text: 'Platform scanners — auto-detect Vercel, Netlify, Cloudflare, Railway, Supabase, Firebase, and Convex' },
            { type: 'added', text: 'AI vibe scanner — checks if a site looks AI-generated (powered by Gemini)' },
            { type: 'added', text: 'GitHub integration — secrets, dependency, scorecard, and security advisory scanners' },
            { type: 'added', text: 'Threat intelligence and legal compliance scanners' },
            // Core Platform
            { type: 'added', text: 'Project-based architecture — group scans under named projects with persistent config' },
            { type: 'added', text: 'Multi-section project dashboard — Overview, Report, History, Monitoring, Integrations, Settings' },
            { type: 'added', text: 'Scheduled scans (daily/weekly/monthly) with alert rules for score drops and new criticals' },
            { type: 'added', text: 'Webhook integrations, GitHub Actions CI/CD snippet, and embeddable security badge' },
            { type: 'added', text: 'Finding dismissal system — dismiss false positives and accepted risks' },
            { type: 'added', text: 'Plain-English explanations and recommended actions for every finding type' },
            { type: 'added', text: 'Markdown export for scan results' },
            // API & Integrations
            { type: 'added', text: 'API key management — create, list, revoke keys with scoped permissions' },
            { type: 'added', text: 'Per-key rate limiting with sliding window (plan-based: 10/30/100 req/min)' },
            { type: 'added', text: 'MCP server integration for Claude Code' },
            // Billing & Auth
            { type: 'added', text: 'Stripe billing with Starter ($19/mo), Pro ($39/mo), and Max ($79/mo) plans + 30% annual discount' },
            { type: 'added', text: 'Free tier — 1 project, 3 scans/month, blurred finding details with upgrade CTAs' },
            { type: 'added', text: 'Supabase auth with Google OAuth and email/password sign-up' },
            // Security
            { type: 'added', text: 'Row-Level Security, CSRF protection, SSRF validation, CSP headers, HSTS preload' },
            { type: 'added', text: 'Stripe webhook idempotency and atomic scan usage functions' },
            { type: 'added', text: 'Edge function auth via shared scanner secret key' },
            // UX
            { type: 'added', text: 'Collapsible sidebar, toast notifications, score ring animation' },
            { type: 'added', text: 'Responsive landing page with pricing, feature overview, and animated counters' },
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
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
                            <div className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 ${i === 0
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
