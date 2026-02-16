/** Shared audit data types and processing — importable from both server and client components */

/**
 * All scanner result keys expected in the current version (v7, 30 scanners).
 * Even conditional scanners appear in results (as `skipped: true`).
 * Used to detect stale scan results from older versions.
 */
export const CURRENT_SCANNER_KEYS = [
    'security', 'api_keys', 'legal', 'threat_intelligence', 'sqli', 'tech_stack',
    'github_secrets', 'cors', 'csrf', 'cookies', 'auth',
    'supabase_backend', 'firebase_backend', 'convex_backend',
    'dependencies', 'ssl_tls', 'dns_email', 'xss', 'open_redirect',
    'scorecard', 'github_security', 'supabase_mgmt',
    'vercel_hosting', 'netlify_hosting', 'cloudflare_hosting', 'railway_hosting',
    'ddos_protection', 'file_upload', 'audit_logging', 'mobile_api',
] as const;

const SCANNER_DISPLAY_NAMES: Record<string, string> = {
    security: 'Security Headers', api_keys: 'API Keys', legal: 'Legal', threat_intelligence: 'Threat Intel',
    sqli: 'SQL Injection', github_secrets: 'GitHub Secrets', tech_stack: 'Tech Stack', cors: 'CORS',
    csrf: 'CSRF', cookies: 'Cookies', auth: 'Auth', supabase_backend: 'Supabase', firebase_backend: 'Firebase',
    scorecard: 'Scorecard', github_security: 'GitHub Security', supabase_mgmt: 'Supabase Mgmt',
    dependencies: 'Dependencies', ssl_tls: 'SSL/TLS', dns_email: 'DNS', xss: 'XSS',
    open_redirect: 'Redirects', vercel_hosting: 'Vercel', netlify_hosting: 'Netlify',
    cloudflare_hosting: 'Cloudflare', railway_hosting: 'Railway', convex_backend: 'Convex',
    ddos_protection: 'DDoS Protection', file_upload: 'File Upload',
    audit_logging: 'Audit Logging', mobile_api: 'Mobile API',
};

/**
 * Scanners that only run when specific project config is provided.
 * These should NOT trigger the "outdated scan" banner when missing,
 * because they're intentionally skipped when their config isn't set.
 */
const CONDITIONAL_SCANNER_KEYS = new Set([
    'firebase_backend',  // requires backendType === 'firebase'
    'convex_backend',    // requires backendType === 'convex'
    'supabase_mgmt',     // requires supabasePAT + supabaseUrl
    'github_secrets',    // requires githubRepo
    'github_security',   // requires githubRepo
    'dependencies',      // requires githubRepo
    'scorecard',         // requires githubRepo
]);

/** Returns human-readable names of scanners missing from old results.
 *  Excludes conditional scanners (they're skipped by design, not outdated). */
export function getMissingScannerNames(results: Record<string, unknown>): string[] {
    const resultKeys = new Set(Object.keys(results));
    return CURRENT_SCANNER_KEYS
        .filter(key => !resultKeys.has(key) && !CONDITIONAL_SCANNER_KEYS.has(key))
        .map(key => SCANNER_DISPLAY_NAMES[key] || key);
}

export interface ScanResultItem {
    score: number;
    findings: { severity: string; title: string; description: string;[key: string]: any }[];
}

export interface AuditReportData {
    results: Record<string, ScanResultItem>;
    allFindings: any[];
    totalFindings: { critical: number; high: number; medium: number; low: number };
    issueCount: number;
    passingCheckCount: number;
    visibleScannerCount: number;
    techStack: any;
    techStackCveFindings: any[];
    scannerResults: Record<string, ScanResultItem>;
}

/** Scanner keys that should be completely hidden from reports (deprecated scanners) */
const HIDDEN_SCANNER_KEYS = new Set(['vibe_match', 'ai_detection']);

/** Pre-process scan results into the shape needed by AuditReport */
export function processAuditData(results: Record<string, ScanResultItem>): AuditReportData {
    const techStack = (results as any).tech_stack;
    const techStackCveFindings = techStack?.findings?.filter(
        (f: any) => f.severity?.toLowerCase() !== 'info'
    ) || [];

    const scannerResults = Object.fromEntries(
        Object.entries(results).filter(([key]) => key !== 'tech_stack' && !HIDDEN_SCANNER_KEYS.has(key))
    ) as Record<string, ScanResultItem>;

    const visibleScannerCount = Object.entries(scannerResults).filter(([key, result]: [string, any]) => {
        if (result.skipped) return false;
        if (key.endsWith('_hosting') && result.score === 100 && !result.error) {
            const allInfo = !result.findings?.length || result.findings.every((f: any) => f.severity?.toLowerCase() === 'info');
            if (allInfo) return false;
        }
        return true;
    }).length;

    const totalFindings = { critical: 0, high: 0, medium: 0, low: 0 };
    const allFindings: any[] = [];

    Object.entries(results).filter(([key]) => !HIDDEN_SCANNER_KEYS.has(key)).forEach(([, result]: [string, any]) => {
        if (result.skipped) return;
        if (result.findings && Array.isArray(result.findings)) {
            allFindings.push(...result.findings);
            result.findings.forEach((f: any) => {
                const sev = f.severity?.toLowerCase();
                if (sev === 'info') return;
                if (sev === 'critical') totalFindings.critical++;
                else if (sev === 'high') totalFindings.high++;
                else if (sev === 'medium') totalFindings.medium++;
                else totalFindings.low++;
            });
        }
    });

    const issueCount = totalFindings.critical + totalFindings.high + totalFindings.medium + totalFindings.low;

    let passingCheckCount = 0;
    Object.entries(results).filter(([key]) => !HIDDEN_SCANNER_KEYS.has(key)).forEach(([, result]: [string, any]) => {
        if (result.skipped) return;
        if (result.findings && Array.isArray(result.findings)) {
            result.findings.forEach((f: any) => {
                if (f.severity?.toLowerCase() === 'info') passingCheckCount++;
            });
        }
    });

    return { results, allFindings, totalFindings, issueCount, passingCheckCount, visibleScannerCount, techStack, techStackCveFindings, scannerResults };
}
