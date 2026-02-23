'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';

const sections = [
    {
        id: 'auth',
        title: 'Authentication',
        content: (
            <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                    All API requests require a valid API key in the <code className="text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">Authorization</code> header.
                </p>
                <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
                    {`Authorization: Bearer cvd_live_YOUR_API_KEY`}
                </pre>
                <p className="text-sm text-zinc-500">
                    Create API keys from the <a href="/dashboard/api-keys" className="text-zinc-300 underline underline-offset-2 hover:text-white">API Keys</a> page. Keys use the format <code className="text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded text-xs">cvd_live_&lt;32-hex&gt;</code>.
                </p>
            </div>
        ),
    },
    {
        id: 'scan',
        title: 'Run a Scan',
        content: (
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">POST</span>
                        <code className="text-sm text-zinc-300 font-mono">/api/scan</code>
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">Trigger a new security scan on a URL. Requires <code className="text-zinc-400 text-xs">scan:write</code> scope.</p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
                        {`curl -X POST https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "projectId": "optional-project-uuid"
  }'`}
                    </pre>
                </div>
                <div className="text-sm text-zinc-400">
                    <p className="font-medium text-zinc-300 mb-1.5">Response</p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-zinc-400 font-mono overflow-x-auto">
                        {`{
  "scanId": "uuid",
  "status": "processing",
  "url": "https://example.com"
}`}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        id: 'results',
        title: 'Get Scan Results',
        content: (
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20">GET</span>
                        <code className="text-sm text-zinc-300 font-mono">/api/scan/:id</code>
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">Fetch results for a specific scan. Requires <code className="text-zinc-400 text-xs">scan:read</code> scope.</p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
                        {`curl https://checkvibe.dev/api/scan/SCAN_ID \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                    </pre>
                </div>
                <div className="text-sm text-zinc-400">
                    <p className="font-medium text-zinc-300 mb-1.5">Response (completed scan)</p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-zinc-400 font-mono overflow-x-auto">
                        {`{
  "id": "uuid",
  "url": "https://example.com",
  "status": "completed",
  "overall_score": 72,
  "results": {
    "security_headers": { "score": 80, "findings": [...] },
    "api_keys": { "score": 60, "findings": [...] },
    ...
  }
}`}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        id: 'list',
        title: 'List Scans',
        content: (
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20">GET</span>
                        <code className="text-sm text-zinc-300 font-mono">/api/scan</code>
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">List all scans for the authenticated user. Requires <code className="text-zinc-400 text-xs">scan:read</code> scope.</p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
                        {`curl https://checkvibe.dev/api/scan \\
  -H "Authorization: Bearer cvd_live_YOUR_KEY"`}
                    </pre>
                </div>
            </div>
        ),
    },
    {
        id: 'mcp',
        title: 'MCP Server (Claude Code)',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                    Use CheckVibe as an MCP server to let AI coding agents run security scans during development.
                </p>
                <div>
                    <p className="text-xs text-zinc-500 mb-2">
                        Add to <code className="text-zinc-400">.claude/settings.json</code> or <code className="text-zinc-400">claude_desktop_config.json</code>:
                    </p>
                    <pre className="p-3 bg-black/30 border border-white/[0.06] rounded-lg text-xs text-green-400 font-mono overflow-x-auto">
                        {`{
  "mcpServers": {
    "checkvibe": {
      "command": "npx",
      "args": ["-y", "@checkvibe/mcp-server"],
      "env": {
        "CHECKVIBE_API_KEY": "cvd_live_YOUR_KEY"
      }
    }
  }
}`}
                    </pre>
                </div>
                <div className="text-sm text-zinc-400">
                    <p className="font-medium text-zinc-300 mb-1.5">Available Tools</p>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <code className="text-xs text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">run_scan</code>
                            <span className="text-xs text-zinc-500">Trigger a security scan on a URL</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <code className="text-xs text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">get_scan_results</code>
                            <span className="text-xs text-zinc-500">Fetch results for a completed scan</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <code className="text-xs text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">list_scans</code>
                            <span className="text-xs text-zinc-500">List all scans for the authenticated user</span>
                        </div>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'rate-limits',
        title: 'Rate Limits',
        content: (
            <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                    API requests are rate-limited per key using a sliding window. Limits depend on your plan:
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left py-2 pr-4 text-zinc-500 font-medium text-xs">Plan</th>
                                <th className="text-left py-2 pr-4 text-zinc-500 font-medium text-xs">Requests / min</th>
                                <th className="text-left py-2 text-zinc-500 font-medium text-xs">Scans / month</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-400">
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4">Free</td>
                                <td className="py-2 pr-4">5</td>
                                <td className="py-2">3</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4">Starter</td>
                                <td className="py-2 pr-4">10</td>
                                <td className="py-2">5</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4">Pro</td>
                                <td className="py-2 pr-4">30</td>
                                <td className="py-2">20</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">Max</td>
                                <td className="py-2 pr-4">100</td>
                                <td className="py-2">75</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-zinc-500">
                    When rate-limited, the API returns <code className="text-zinc-400">429 Too Many Requests</code> with a <code className="text-zinc-400">Retry-After</code> header.
                </p>
            </div>
        ),
    },
    {
        id: 'scanners',
        title: 'Scanners',
        content: (
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                    CheckVibe runs 30 security scanners in parallel. Each scan completes in under 45 seconds.
                </p>
                <div className="space-y-3">
                    {[
                        {
                            category: 'Injection & Code',
                            scanners: ['SQL Injection', 'XSS Detection', 'Open Redirect', 'CSRF Protection'],
                        },
                        {
                            category: 'Secrets & Keys',
                            scanners: ['API Key Detection', 'GitHub Deep Scan', 'GitHub Security Alerts'],
                        },
                        {
                            category: 'Infrastructure',
                            scanners: ['Security Headers', 'SSL/TLS', 'CORS', 'Cookies', 'DNS & Email', 'DDoS Protection'],
                        },
                        {
                            category: 'Hosting',
                            scanners: ['Vercel', 'Netlify', 'Cloudflare', 'Railway'],
                        },
                        {
                            category: 'Backend',
                            scanners: ['Supabase', 'Supabase Management', 'Firebase', 'Convex', 'Authentication Flow'],
                        },
                        {
                            category: 'Compliance & Analysis',
                            scanners: ['Dependencies & CVEs', 'OpenSSF Scorecard', 'Legal Compliance', 'Threat Intelligence', 'Tech Stack Detection', 'AI/Vibe Detection'],
                        },
                        {
                            category: 'Application',
                            scanners: ['File Upload Security', 'Audit Logging', 'Mobile API Rate Limiting'],
                        },
                    ].map((group) => (
                        <div key={group.category}>
                            <p className="text-xs font-medium text-zinc-300 mb-1">{group.category}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {group.scanners.map((s) => (
                                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-500 border border-white/[0.06]">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-zinc-500">
                    Some scanners require additional config (GitHub repo, Supabase PAT). Configure these in your project settings.
                </p>
            </div>
        ),
    },
    {
        id: 'scopes',
        title: 'API Key Scopes',
        content: (
            <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                    API keys can be restricted to specific scopes for least-privilege access:
                </p>
                <div className="space-y-2">
                    {[
                        { scope: 'scan:read', desc: 'View scan results and history' },
                        { scope: 'scan:write', desc: 'Trigger new security scans' },
                        { scope: 'keys:read', desc: 'List your API keys' },
                        { scope: 'keys:manage', desc: 'Create and revoke API keys' },
                    ].map((s) => (
                        <div key={s.scope} className="flex items-start gap-3">
                            <code className="text-xs text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0 font-mono">{s.scope}</code>
                            <span className="text-sm text-zinc-500">{s.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'errors',
        title: 'Error Codes',
        content: (
            <div className="space-y-3">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left py-2 pr-4 text-zinc-500 font-medium text-xs">Status</th>
                                <th className="text-left py-2 pr-4 text-zinc-500 font-medium text-xs">Code</th>
                                <th className="text-left py-2 text-zinc-500 font-medium text-xs">Description</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-400 text-xs">
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4 font-mono">401</td>
                                <td className="py-2 pr-4">UNAUTHORIZED</td>
                                <td className="py-2">Missing or invalid API key</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4 font-mono">402</td>
                                <td className="py-2 pr-4">SCAN_LIMIT_REACHED</td>
                                <td className="py-2">Monthly scan quota exhausted</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4 font-mono">403</td>
                                <td className="py-2 pr-4">INSUFFICIENT_SCOPE</td>
                                <td className="py-2">API key lacks required scope</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4 font-mono">404</td>
                                <td className="py-2 pr-4">NOT_FOUND</td>
                                <td className="py-2">Scan or resource not found</td>
                            </tr>
                            <tr className="border-b border-white/[0.04]">
                                <td className="py-2 pr-4 font-mono">429</td>
                                <td className="py-2 pr-4">RATE_LIMITED</td>
                                <td className="py-2">Too many requests, retry after delay</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4 font-mono">500</td>
                                <td className="py-2 pr-4">INTERNAL_ERROR</td>
                                <td className="py-2">Server error, contact support</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        ),
    },
];

function Section({ id, title, content }: { id: string; title: string; content: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-white/[0.04] last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-4 min-h-[48px] text-left group"
            >
                <span className="text-sm font-medium text-white group-hover:text-zinc-200 transition-colors">{title}</span>
                {open
                    ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                    : <ChevronDown className="h-4 w-4 text-zinc-500" />
                }
            </button>
            {open && (
                <div className="pb-5">
                    {content}
                </div>
            )}
        </div>
    );
}

export default function DocsPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-10">
                <h1 className="text-2xl md:text-3xl font-heading font-medium tracking-tight text-white">
                    API Documentation
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    Reference for the CheckVibe REST API
                </p>
            </div>

            {/* Base URL */}
            <div className="mb-8 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-sm">
                    <Terminal className="h-4 w-4 text-zinc-500" />
                    <span className="text-zinc-500">Base URL</span>
                </div>
                <code className="text-sm text-zinc-300 font-mono mt-1 block">https://checkvibe.dev/api</code>
            </div>

            {/* Sections */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04] px-5">
                {sections.map((section) => (
                    <Section key={section.id} {...section} />
                ))}
            </div>
        </div>
    );
}
