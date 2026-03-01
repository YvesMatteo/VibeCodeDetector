/**
 * OWASP Top 10:2021 mapping for CheckVibe scanner findings.
 * Maps each scanner type to one or more OWASP categories so findings
 * can display compliance badges and the report can show coverage.
 */
import type { ScanResultItem } from './audit-data';

export interface OwaspCategory {
  id: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
}

export const OWASP_TOP_10: OwaspCategory[] = [
  { id: 'A01', code: 'A01:2021', name: 'Broken Access Control', shortName: 'Access Control', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'A02', code: 'A02:2021', name: 'Cryptographic Failures', shortName: 'Crypto', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { id: 'A03', code: 'A03:2021', name: 'Injection', shortName: 'Injection', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'A04', code: 'A04:2021', name: 'Insecure Design', shortName: 'Insecure Design', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'A05', code: 'A05:2021', name: 'Security Misconfiguration', shortName: 'Misconfig', color: 'text-lime-400 bg-lime-500/10 border-lime-500/30' },
  { id: 'A06', code: 'A06:2021', name: 'Vulnerable & Outdated Components', shortName: 'Components', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'A07', code: 'A07:2021', name: 'Identification & Authentication Failures', shortName: 'Auth Failures', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'A08', code: 'A08:2021', name: 'Software & Data Integrity Failures', shortName: 'Integrity', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { id: 'A09', code: 'A09:2021', name: 'Security Logging & Monitoring Failures', shortName: 'Logging', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  { id: 'A10', code: 'A10:2021', name: 'Server-Side Request Forgery (SSRF)', shortName: 'SSRF', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
];

const OWASP_BY_ID = Object.fromEntries(OWASP_TOP_10.map(c => [c.id, c]));

/**
 * Maps scanner keys to OWASP category IDs.
 * A scanner can map to multiple categories.
 */
export const SCANNER_OWASP_MAP: Record<string, string[]> = {
  // A01 — Broken Access Control
  cors: ['A01'],
  open_redirect: ['A01'],
  file_upload: ['A01'],
  csrf: ['A01', 'A05'],

  // A02 — Cryptographic Failures
  api_keys: ['A02'],
  github_secrets: ['A02'],
  ssl_tls: ['A02'],
  jwt_audit: ['A02', 'A07'],

  // A03 — Injection
  sqli: ['A03'],
  xss: ['A03'],
  graphql: ['A03'],

  // A04 — Insecure Design
  mobile_api: ['A04', 'A07'],
  ddos_protection: ['A04', 'A05'],

  // A05 — Security Misconfiguration
  security: ['A05'],
  cookies: ['A05'],
  dns_email: ['A05'],
  debug_endpoints: ['A05'],
  vercel_hosting: ['A05'],
  netlify_hosting: ['A05'],
  cloudflare_hosting: ['A05'],
  railway_hosting: ['A05'],

  // A06 — Vulnerable & Outdated Components
  dependencies: ['A06'],
  tech_stack: ['A06'],

  // A07 — Identification & Authentication Failures
  auth: ['A07'],

  // A08 — Software & Data Integrity Failures
  scorecard: ['A08'],
  github_security: ['A08'],
  domain_hijacking: ['A08'],

  // A09 — Security Logging & Monitoring Failures
  audit_logging: ['A09'],

  // A10 — SSRF
  // (covered by internal checks, no dedicated scanner yet)

  // Additional scanners
  supabase_backend: ['A05', 'A07'],
  firebase_backend: ['A05', 'A07'],
  convex_backend: ['A05', 'A07'],
  supabase_mgmt: ['A05'],
  threat_intelligence: ['A08'],
  legal: ['A05'],
  vibe_match: ['A04'],
  ai_llm: ['A03', 'A04'],
};

/**
 * Get OWASP categories for a scanner key.
 */
export function getOwaspCategories(scannerKey: string): OwaspCategory[] {
  const ids = SCANNER_OWASP_MAP[scannerKey];
  if (!ids) return [];
  return ids.map(id => OWASP_BY_ID[id]).filter(Boolean);
}

/**
 * Compute OWASP Top 10 coverage summary from scan results.
 * Returns an array of 10 items, one per OWASP category, with finding counts.
 */
export function computeOwaspSummary(
  results: Record<string, ScanResultItem>,
): Array<{ category: OwaspCategory; findingCount: number; tested: boolean }> {
  // Track which OWASP categories are tested and their finding counts
  const counts: Record<string, number> = {};
  const tested: Record<string, boolean> = {};

  for (const [scannerKey, result] of Object.entries(results)) {
    const owaspIds = SCANNER_OWASP_MAP[scannerKey];
    if (!owaspIds) continue;

    // Skip errored/skipped scanners
    if (result.error || result.skipped) continue;

    // Mark categories as tested
    for (const id of owaspIds) {
      tested[id] = true;
    }

    // Count actionable findings (non-info)
    const findings = result.findings ?? [];
    const actionable = findings.filter((f) => f.severity?.toLowerCase() !== 'info');

    for (const id of owaspIds) {
      counts[id] = (counts[id] || 0) + actionable.length;
    }
  }

  return OWASP_TOP_10.map(category => ({
    category,
    findingCount: counts[category.id] || 0,
    tested: tested[category.id] || false,
  }));
}
