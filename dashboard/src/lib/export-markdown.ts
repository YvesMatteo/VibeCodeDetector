// Full markdown report generator for scan exports
import { computeScanDiff } from './scan-diff';

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
  ddos_protection: 'DDoS Protection',
  file_upload: 'File Upload Security',
  audit_logging: 'Audit Logging & Monitoring',
  mobile_api: 'Mobile API Rate Limiting',
  domain_hijacking: 'Domain Hijacking Detection',
  graphql: 'GraphQL Security',
  jwt_audit: 'JWT Deep Audit',
  ai_llm: 'AI/LLM Security',
};

const SCANNER_ORDER: string[] = [
  'api_keys',
  'github_secrets',
  'github_security',
  'supabase_mgmt',
  'supabase_backend',
  'firebase_backend',
  'convex_backend',
  'security',
  'auth',
  'dependencies',
  'xss',
  'dns_email',
  'vercel_hosting',
  'netlify_hosting',
  'cloudflare_hosting',
  'railway_hosting',
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
  'graphql',
  'jwt_audit',
  'ai_llm',
  'ddos_protection',
  'file_upload',
  'audit_logging',
  'mobile_api',
  'domain_hijacking',
];

function getVibeRating(issues: number): string {
  if (issues === 0) return 'Clean';
  if (issues <= 3) return 'Good';
  if (issues <= 7) return 'Moderate';
  if (issues <= 15) return 'Needs Work';
  if (issues <= 25) return 'At Risk';
  return 'Critical';
}

function severityEmoji(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    case 'info': return 'ℹ️';
    default: return '⚪';
  }
}

function sortedScannerKeys(results: Record<string, any>): string[] {
  const keys = Object.keys(results);
  return keys.sort((a, b) => {
    const ia = SCANNER_ORDER.indexOf(a);
    const ib = SCANNER_ORDER.indexOf(b);
    const oa = ia === -1 ? SCANNER_ORDER.length : ia;
    const ob = ib === -1 ? SCANNER_ORDER.length : ib;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
}

export function generateScanMarkdown(scan: any, previousScan?: any): string {
  const lines: string[] = [];
  const url = scan.url || 'Unknown URL';
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const scanDate = new Date(scan.completed_at || scan.created_at).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const results = (scan.results || {}) as Record<string, any>;

  // Count total issues first for the header
  let totalIssueCount = 0;
  Object.values(results).forEach((r: any) => {
    if (r.findings && Array.isArray(r.findings)) {
      r.findings.forEach((f: any) => {
        if (f.severity?.toLowerCase() !== 'info') totalIssueCount++;
      });
    }
  });
  const rating = getVibeRating(totalIssueCount);

  // ── Header ──────────────────────────────────────────────────────────────
  lines.push(`# CheckVibe Security Report`);
  lines.push(`## ${domain}`);
  lines.push('');
  lines.push(`**URL:** ${url}  `);
  lines.push(`**Scanned:** ${scanDate}  `);
  lines.push(`**Status:** ${scan.status}  `);
  lines.push('');

  // ── Scan Diff ──────────────────────────────────────────────────────────
  if (previousScan?.results) {
    const diff = computeScanDiff(results, previousScan.results as Record<string, any>);
    const prevDate = new Date(previousScan.completed_at || previousScan.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    const parts: string[] = [];
    if (diff.resolvedIssues.length > 0) parts.push(`${diff.resolvedIssues.length} resolved`);
    if (diff.newIssues.length > 0) parts.push(`${diff.newIssues.length} new`);
    if (diff.unchangedIssues.length > 0) parts.push(`${diff.unchangedIssues.length} unchanged`);
    if (parts.length > 0) {
      lines.push(`**Changes since ${prevDate}:** ${parts.join(' · ')}  `);
      lines.push('');
    }
  }

  // Count info/passing checks
  let infoCount = 0;
  Object.values(results).forEach((r: any) => {
    if (r.findings && Array.isArray(r.findings)) {
      r.findings.forEach((f: any) => {
        if (f.severity?.toLowerCase() === 'info') infoCount++;
      });
    }
  });

  // ── Issues Overview ─────────────────────────────────────────────────────
  lines.push(`## Issues Found: ${totalIssueCount} actionable — ${rating}${infoCount > 0 ? ` (${infoCount} passing checks)` : ''}`);
  lines.push('');

  // ── Severity Summary ────────────────────────────────────────────────────
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  Object.values(results).forEach((r: any) => {
    if (r.findings && Array.isArray(r.findings)) {
      r.findings.forEach((f: any) => {
        const sev = (f.severity || 'info').toLowerCase();
        if (sev in counts) counts[sev as keyof typeof counts]++;
      });
    }
  });

  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Critical | ${counts.critical} |`);
  lines.push(`| 🟠 High | ${counts.high} |`);
  lines.push(`| 🟡 Medium | ${counts.medium} |`);
  lines.push(`| 🔵 Low | ${counts.low} |`);
  lines.push(`| ℹ️ Info | ${counts.info} |`);
  lines.push('');

  // ── Scanner Summary Table ───────────────────────────────────────────────
  lines.push(`## Scanner Summary`);
  lines.push('');
  lines.push(`| Scanner | Issues | Status |`);
  lines.push(`|---------|--------|--------|`);

  const orderedKeys = sortedScannerKeys(results);
  for (const key of orderedKeys) {
    const r = results[key];
    const name = scannerNames[key] || key;
    if (r.error) {
      lines.push(`| ${name} | — | Error: ${r.error} |`);
    } else {
      const issueCount = r.findings?.filter((f: any) => f.severity?.toLowerCase() !== 'info').length ?? 0;
      lines.push(`| ${name} | ${issueCount} | OK |`);
    }
  }
  lines.push('');

  // ── Tech Stack ──────────────────────────────────────────────────────────
  const techStack = results.tech_stack;
  if (techStack?.technologies?.length > 0) {
    lines.push(`## Detected Tech Stack`);
    lines.push('');
    for (const tech of techStack.technologies) {
      const version = tech.version ? ` ${tech.version}` : '';
      const category = tech.category ? ` (${tech.category})` : '';
      lines.push(`- **${tech.name}**${version}${category}`);
    }
    lines.push('');

    const cves = techStack.findings?.filter((f: any) => f.severity?.toLowerCase() !== 'info') || [];
    if (cves.length > 0) {
      lines.push(`### Known Vulnerabilities (CVEs)`);
      lines.push('');
      for (const cve of cves) {
        lines.push(`- ${severityEmoji(cve.severity)} **${cve.title}** (${cve.severity})`);
        if (cve.description) lines.push(`  ${cve.description}`);
        if (cve.recommendation) lines.push(`  **Fix:** ${cve.recommendation}`);
      }
      lines.push('');
    }
  }

  // ── Detailed Results Per Scanner ────────────────────────────────────────
  lines.push(`---`);
  lines.push('');
  lines.push(`## Detailed Scanner Results`);
  lines.push('');

  for (const key of orderedKeys) {
    const r = results[key];
    const name = scannerNames[key] || key;

    lines.push(`### ${name}`);
    lines.push('');

    if (r.error) {
      lines.push(`**Status:** Error  `);
      lines.push(`**Error:** ${r.error}`);
      lines.push('');
      continue;
    }

    const allFindings = r.findings || [];
    const issues = allFindings.filter((f: any) => f.severity?.toLowerCase() !== 'info');
    const infoFindings = allFindings.filter((f: any) => f.severity?.toLowerCase() === 'info');
    lines.push(`**Issues:** ${issues.length} | **Info:** ${infoFindings.length}`);
    lines.push('');

    if (allFindings.length === 0) {
      lines.push(`No findings.`);
      lines.push('');
      continue;
    }

    const actionableFindings = allFindings.filter((f: any) => f.severity?.toLowerCase() !== 'info');
    const passingFindings = allFindings.filter((f: any) => f.severity?.toLowerCase() === 'info');

    for (const finding of actionableFindings) {
      const sev = finding.severity || 'info';
      lines.push(`#### ${severityEmoji(sev)} ${finding.title || 'Untitled Finding'}`);
      lines.push('');
      lines.push(`**Severity:** ${sev}  `);
      if (finding.description) {
        lines.push(`**Description:** ${finding.description}  `);
      }
      if (finding.recommendation) {
        lines.push(`**Recommendation:** ${finding.recommendation}  `);
      }
      if (finding.reportUrl) {
        lines.push(`**Report:** ${finding.reportUrl}  `);
      }
      if (finding.evidence) {
        lines.push('');
        lines.push('```');
        lines.push(finding.evidence);
        lines.push('```');
      }
      lines.push('');
    }

    if (passingFindings.length > 0) {
      lines.push(`#### Passing Checks`);
      lines.push('');
      for (const f of passingFindings) {
        lines.push(`- ✅ ${f.title || 'Check passed'}`);
      }
      lines.push('');
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push(`---`);
  lines.push('');
  lines.push(`*Report generated by [CheckVibe](https://checkvibe.dev) on ${new Date().toISOString()}*`);
  lines.push('');

  return lines.join('\n');
}
