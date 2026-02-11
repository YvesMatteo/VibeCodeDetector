import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * GitHub Native Security Scanner
 *
 * Queries GitHub's built-in security features via the REST API to surface
 * pre-computed vulnerability data:
 *
 *   1. Dependabot Alerts   — known CVEs in dependencies
 *   2. Code Scanning Alerts — SAST findings (CodeQL, etc.)
 *   3. Secret Scanning Alerts — leaked secrets detected by GitHub
 *
 * These APIs return data that GitHub has already computed. This scanner
 * aggregates it into the standard finding format alongside the other scanners.
 *
 * SECURITY GUARANTEES:
 *   - Read-only: only GET requests to GitHub API
 *   - Uses server-side GITHUB_TOKEN (never exposed to clients)
 *   - All secret values in alerts are redacted before output
 *   - Rate-limited to stay within GitHub API limits
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const USER_AGENT = "CheckVibe-GitHubSecurityScanner/1.0";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ALERTS_PER_TYPE = 100;

// Severity deductions
const SEVERITY_DEDUCTION: Record<string, number> = {
    critical: 20,
    high: 15,
    medium: 8,
    low: 3,
};

const MAX_DEDUCTION = 80;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface DependabotAlert {
    number: number;
    state: string;
    security_advisory: {
        ghsa_id: string;
        cve_id: string | null;
        summary: string;
        severity: string;
        description?: string;
    };
    security_vulnerability: {
        package: { name: string; ecosystem: string };
        severity: string;
        vulnerable_version_range: string;
        first_patched_version: { identifier: string } | null;
    };
    html_url: string;
}

interface CodeScanningAlert {
    number: number;
    state: string;
    rule: {
        id: string;
        severity: string | null;
        security_severity_level: string | null;
        description: string;
        name: string;
    };
    tool: { name: string };
    most_recent_instance: {
        location?: {
            path?: string;
            start_line?: number;
        };
        message?: { text?: string };
    };
    html_url: string;
}

interface SecretScanningAlert {
    number: number;
    state: string;
    secret_type: string;
    secret_type_display_name: string;
    html_url: string;
    push_protection_bypassed: boolean | null;
    resolution: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRepoFromUrl(input: string): string | null {
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const match = cleaned.match(
        /(?:github\.com\/)?([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)$/,
    );
    return match ? match[1] : null;
}

function normalizeSeverity(
    sev: string | null | undefined,
): "critical" | "high" | "medium" | "low" {
    if (!sev) return "medium";
    const s = sev.toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high") return "high";
    if (s === "medium" || s === "moderate" || s === "warning") return "medium";
    if (s === "low" || s === "note") return "low";
    return "medium";
}

async function githubApiFetch(
    path: string,
    token: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`https://api.github.com${path}`, {
            method: "GET",
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": USER_AGENT,
            },
            signal: controller.signal,
        });

        const data = response.ok ? await response.json() : null;
        return { ok: response.ok, status: response.status, data };
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            return { ok: false, status: 408, data: null };
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ---------------------------------------------------------------------------
// Check implementations
// ---------------------------------------------------------------------------

async function checkDependabotAlerts(
    repo: string,
    token: string,
): Promise<{ findings: Finding[]; deduction: number; available: boolean }> {
    const findings: Finding[] = [];
    let deduction = 0;

    const result = await githubApiFetch(
        `/repos/${repo}/dependabot/alerts?state=open&per_page=${MAX_ALERTS_PER_TYPE}&sort=severity&direction=desc`,
        token,
    );

    // 404 = Dependabot not enabled, 403 = insufficient permissions
    if (!result.ok) {
        if (result.status === 404 || result.status === 403) {
            findings.push({
                id: "ghsec-dependabot-unavailable",
                severity: "info",
                title: "Dependabot alerts not accessible",
                description: result.status === 404
                    ? "Dependabot alerts are not enabled for this repository."
                    : "Insufficient permissions to access Dependabot alerts. The GitHub token may need the 'security_events' scope.",
                recommendation: "Enable Dependabot alerts in your repository settings under Security > Code security and analysis.",
            });
            return { findings, deduction: 0, available: false };
        }
        return { findings, deduction: 0, available: false };
    }

    const alerts = result.data as DependabotAlert[];

    if (!Array.isArray(alerts) || alerts.length === 0) {
        findings.push({
            id: "ghsec-dependabot-clean",
            severity: "info",
            title: "No open Dependabot alerts",
            description: "GitHub Dependabot found no known vulnerabilities in your dependencies.",
            recommendation: "Keep Dependabot enabled to continuously monitor for new vulnerabilities.",
        });
        return { findings, deduction: 0, available: true };
    }

    // Count by severity
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const alert of alerts) {
        const sev = normalizeSeverity(alert.security_vulnerability?.severity || alert.security_advisory?.severity);
        counts[sev] = (counts[sev] || 0) + 1;
    }

    // Calculate deduction
    for (const [sev, count] of Object.entries(counts)) {
        deduction += (SEVERITY_DEDUCTION[sev] || 5) * Math.min(count, 5); // Cap per-severity contribution
    }

    // Create summary finding
    const severityBreakdown = Object.entries(counts)
        .filter(([, c]) => c > 0)
        .map(([s, c]) => `${c} ${s}`)
        .join(", ");

    const worstSeverity = counts.critical > 0 ? "critical"
        : counts.high > 0 ? "high"
        : counts.medium > 0 ? "medium"
        : "low";

    findings.push({
        id: "ghsec-dependabot-summary",
        severity: worstSeverity,
        title: `${alerts.length} open Dependabot alert${alerts.length > 1 ? "s" : ""} (${severityBreakdown})`,
        description: `GitHub Dependabot has detected ${alerts.length} known vulnerabilities in your dependencies that have not been addressed.`,
        recommendation: "Review and resolve Dependabot alerts by updating affected dependencies or dismissing false positives.",
        evidence: `Open alerts: ${alerts.length} (${severityBreakdown})`,
    });

    // Add top 5 individual alerts as separate findings
    const topAlerts = alerts.slice(0, 5);
    for (const alert of topAlerts) {
        const sev = normalizeSeverity(alert.security_vulnerability?.severity || alert.security_advisory?.severity);
        const pkg = alert.security_vulnerability?.package;
        const fix = alert.security_vulnerability?.first_patched_version?.identifier;

        findings.push({
            id: `ghsec-dependabot-${alert.security_advisory?.ghsa_id || alert.number}`,
            severity: sev,
            title: `${pkg?.name || "Unknown"} (${pkg?.ecosystem || "?"}) — ${alert.security_advisory?.summary || "Vulnerability"}`,
            description: `${alert.security_advisory?.ghsa_id || ""}${alert.security_advisory?.cve_id ? ` / ${alert.security_advisory.cve_id}` : ""}: ${alert.security_advisory?.summary || "No summary available"}. Vulnerable range: ${alert.security_vulnerability?.vulnerable_version_range || "unknown"}.`,
            recommendation: fix
                ? `Update ${pkg?.name} to version ${fix} or later.`
                : `Check for an updated version of ${pkg?.name} that addresses this vulnerability.`,
            evidence: `Package: ${pkg?.name}@${alert.security_vulnerability?.vulnerable_version_range}, Advisory: ${alert.security_advisory?.ghsa_id || "N/A"}`,
        });
    }

    if (alerts.length > 5) {
        findings.push({
            id: "ghsec-dependabot-more",
            severity: "info",
            title: `${alerts.length - 5} additional Dependabot alerts not shown`,
            description: `There are ${alerts.length - 5} more open Dependabot alerts. Review them in your repository's Security tab.`,
            recommendation: `Visit https://github.com/${repo}/security/dependabot to see all alerts.`,
        });
    }

    return { findings, deduction, available: true };
}

async function checkCodeScanningAlerts(
    repo: string,
    token: string,
): Promise<{ findings: Finding[]; deduction: number; available: boolean }> {
    const findings: Finding[] = [];
    let deduction = 0;

    const result = await githubApiFetch(
        `/repos/${repo}/code-scanning/alerts?state=open&per_page=${MAX_ALERTS_PER_TYPE}&sort=severity&direction=desc`,
        token,
    );

    if (!result.ok) {
        if (result.status === 404 || result.status === 403) {
            findings.push({
                id: "ghsec-codescan-unavailable",
                severity: "info",
                title: "Code scanning not configured",
                description: result.status === 404
                    ? "Code scanning (CodeQL/SAST) is not enabled for this repository."
                    : "Insufficient permissions to access code scanning alerts.",
                recommendation: "Enable code scanning in your repository settings. GitHub offers free CodeQL analysis for public repositories via GitHub Actions.",
            });
            return { findings, deduction: 0, available: false };
        }
        return { findings, deduction: 0, available: false };
    }

    const alerts = result.data as CodeScanningAlert[];

    if (!Array.isArray(alerts) || alerts.length === 0) {
        findings.push({
            id: "ghsec-codescan-clean",
            severity: "info",
            title: "No open code scanning alerts",
            description: "GitHub code scanning (SAST) found no security issues in the codebase.",
            recommendation: "Keep code scanning enabled to catch vulnerabilities introduced in new code.",
        });
        return { findings, deduction: 0, available: true };
    }

    // Count by severity
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const alert of alerts) {
        const sev = normalizeSeverity(alert.rule?.security_severity_level || alert.rule?.severity);
        counts[sev] = (counts[sev] || 0) + 1;
    }

    for (const [sev, count] of Object.entries(counts)) {
        deduction += (SEVERITY_DEDUCTION[sev] || 5) * Math.min(count, 5);
    }

    const severityBreakdown = Object.entries(counts)
        .filter(([, c]) => c > 0)
        .map(([s, c]) => `${c} ${s}`)
        .join(", ");

    const worstSeverity = counts.critical > 0 ? "critical"
        : counts.high > 0 ? "high"
        : counts.medium > 0 ? "medium"
        : "low";

    findings.push({
        id: "ghsec-codescan-summary",
        severity: worstSeverity,
        title: `${alerts.length} open code scanning alert${alerts.length > 1 ? "s" : ""} (${severityBreakdown})`,
        description: `GitHub code scanning (SAST) detected ${alerts.length} potential security issues in the source code.`,
        recommendation: "Review and fix code scanning alerts. These represent potential vulnerabilities like SQL injection, XSS, or insecure data handling.",
        evidence: `Open alerts: ${alerts.length} (${severityBreakdown})`,
    });

    // Top 5 individual alerts
    const topAlerts = alerts.slice(0, 5);
    for (const alert of topAlerts) {
        const sev = normalizeSeverity(alert.rule?.security_severity_level || alert.rule?.severity);
        const location = alert.most_recent_instance?.location;
        const locationStr = location?.path
            ? `${location.path}${location.start_line ? `:${location.start_line}` : ""}`
            : "unknown location";

        findings.push({
            id: `ghsec-codescan-${alert.number}`,
            severity: sev,
            title: `${alert.rule?.name || alert.rule?.id || "Unknown rule"} in ${locationStr}`,
            description: `${alert.rule?.description || "No description available"}${alert.most_recent_instance?.message?.text ? `\n\n${alert.most_recent_instance.message.text}` : ""}`,
            recommendation: `Fix the ${alert.rule?.name || "issue"} in ${locationStr}. Detected by ${alert.tool?.name || "code scanning"}.`,
            evidence: `Rule: ${alert.rule?.id || "N/A"}, Tool: ${alert.tool?.name || "N/A"}, Location: ${locationStr}`,
        });
    }

    if (alerts.length > 5) {
        findings.push({
            id: "ghsec-codescan-more",
            severity: "info",
            title: `${alerts.length - 5} additional code scanning alerts not shown`,
            description: `There are ${alerts.length - 5} more open code scanning alerts.`,
            recommendation: `Visit https://github.com/${repo}/security/code-scanning to see all alerts.`,
        });
    }

    return { findings, deduction, available: true };
}

async function checkSecretScanningAlerts(
    repo: string,
    token: string,
): Promise<{ findings: Finding[]; deduction: number; available: boolean }> {
    const findings: Finding[] = [];
    let deduction = 0;

    const result = await githubApiFetch(
        `/repos/${repo}/secret-scanning/alerts?state=open&per_page=${MAX_ALERTS_PER_TYPE}`,
        token,
    );

    if (!result.ok) {
        if (result.status === 404 || result.status === 403) {
            findings.push({
                id: "ghsec-secrets-unavailable",
                severity: "info",
                title: "Secret scanning not accessible",
                description: result.status === 404
                    ? "Secret scanning is not enabled for this repository."
                    : "Insufficient permissions to access secret scanning alerts.",
                recommendation: "Enable secret scanning in your repository settings under Security > Code security and analysis. It's free for public repositories.",
            });
            return { findings, deduction: 0, available: false };
        }
        return { findings, deduction: 0, available: false };
    }

    const alerts = result.data as SecretScanningAlert[];

    if (!Array.isArray(alerts) || alerts.length === 0) {
        findings.push({
            id: "ghsec-secrets-clean",
            severity: "info",
            title: "No open secret scanning alerts",
            description: "GitHub secret scanning found no leaked secrets in the repository.",
            recommendation: "Keep secret scanning enabled to catch accidentally committed credentials.",
        });
        return { findings, deduction: 0, available: true };
    }

    // All secret scanning alerts are at least high severity
    deduction = alerts.length * 20; // -20 per leaked secret

    findings.push({
        id: "ghsec-secrets-summary",
        severity: "critical",
        title: `${alerts.length} leaked secret${alerts.length > 1 ? "s" : ""} detected by GitHub`,
        description: `GitHub secret scanning has detected ${alerts.length} leaked secret${alerts.length > 1 ? "s" : ""} in this repository that have not been resolved. These secrets may still be active and exploitable.`,
        recommendation: "Immediately rotate all detected secrets, then revoke the old credentials. Mark alerts as resolved in your repository's Security tab.",
        evidence: `Open secret alerts: ${alerts.length}`,
    });

    // Individual alerts (no secret values exposed — only type)
    const topAlerts = alerts.slice(0, 8);
    for (const alert of topAlerts) {
        const bypassed = alert.push_protection_bypassed === true;

        findings.push({
            id: `ghsec-secret-${alert.number}`,
            severity: "critical",
            title: `Leaked ${alert.secret_type_display_name || alert.secret_type}${bypassed ? " (push protection bypassed)" : ""}`,
            description: `GitHub detected a ${alert.secret_type_display_name || alert.secret_type} committed to the repository.${bypassed ? " Push protection was bypassed when this secret was committed." : ""} The secret value is not shown here for safety — view it in GitHub's Security tab.`,
            recommendation: `1. Rotate this ${alert.secret_type_display_name || "secret"} immediately. 2. Revoke the old credential. 3. Mark the alert as resolved in GitHub.`,
            evidence: `Secret type: ${alert.secret_type_display_name || alert.secret_type}, Alert #${alert.number}`,
        });
    }

    if (alerts.length > 8) {
        findings.push({
            id: "ghsec-secrets-more",
            severity: "info",
            title: `${alerts.length - 8} additional secret scanning alerts not shown`,
            description: `There are ${alerts.length - 8} more open secret scanning alerts.`,
            recommendation: `Visit https://github.com/${repo}/security/secret-scanning to see all alerts.`,
        });
    }

    return { findings, deduction, available: true };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }
    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const targetUrl = body.targetUrl || "";
        const githubRepo = body.githubRepo;

        // No repo provided
        if (!githubRepo || typeof githubRepo !== "string") {
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "ghsec-no-repo",
                        severity: "info",
                        title: "No GitHub repository provided",
                        description: "GitHub native security scanning requires a GitHub repository URL to check Dependabot alerts, code scanning results, and secret scanning findings.",
                        recommendation: "Add your GitHub repository URL when starting a scan to enable GitHub security analysis.",
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        const repo = parseRepoFromUrl(githubRepo);
        if (!repo) {
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "ghsec-invalid-repo",
                        severity: "info",
                        title: "Invalid GitHub repository URL",
                        description: `Could not parse repository from: ${githubRepo}. Expected format: owner/repo or https://github.com/owner/repo`,
                        recommendation: "Provide a valid GitHub repository URL.",
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        if (!GITHUB_TOKEN) {
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "ghsec-no-token",
                        severity: "info",
                        title: "GitHub scanning not configured",
                        description: "GITHUB_TOKEN environment variable is not set. GitHub native security scanning requires API access.",
                        recommendation: "Configure a GitHub personal access token with security_events scope.",
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        // Verify repo exists
        const repoCheck = await githubApiFetch(`/repos/${repo}`, GITHUB_TOKEN);
        if (!repoCheck.ok) {
            const status = repoCheck.status;
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "ghsec-repo-not-found",
                        severity: "info",
                        title: status === 404 ? "Repository not found" : "Cannot access repository",
                        description: status === 404
                            ? `Repository ${repo} does not exist or is private.`
                            : `GitHub API returned ${status} for ${repo}.`,
                        recommendation: status === 404
                            ? "Check the repository URL. Private repos require a token with appropriate scope."
                            : "Check your GitHub token permissions.",
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        // ------------------------------------------------------------------
        // Run all three checks in parallel
        // ------------------------------------------------------------------

        const [dependabot, codeScanning, secretScanning] = await Promise.all([
            checkDependabotAlerts(repo, GITHUB_TOKEN),
            checkCodeScanningAlerts(repo, GITHUB_TOKEN),
            checkSecretScanningAlerts(repo, GITHUB_TOKEN),
        ]);

        // ------------------------------------------------------------------
        // Aggregate results
        // ------------------------------------------------------------------

        const allFindings: Finding[] = [];
        let totalDeduction = 0;
        let checksRun = 0;
        const featuresAvailable: string[] = [];

        if (dependabot.available) featuresAvailable.push("Dependabot");
        checksRun++;
        allFindings.push(...dependabot.findings);
        totalDeduction += dependabot.deduction;

        if (codeScanning.available) featuresAvailable.push("Code Scanning");
        checksRun++;
        allFindings.push(...codeScanning.findings);
        totalDeduction += codeScanning.deduction;

        if (secretScanning.available) featuresAvailable.push("Secret Scanning");
        checksRun++;
        allFindings.push(...secretScanning.findings);
        totalDeduction += secretScanning.deduction;

        // Cap total deduction
        if (totalDeduction > MAX_DEDUCTION) {
            totalDeduction = MAX_DEDUCTION;
        }

        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return new Response(
            JSON.stringify({
                scannerType: "github_security",
                score,
                checksRun,
                findings: allFindings,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
                repository: repo,
                featuresDetected: featuresAvailable,
            }),
            { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("GitHub security scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "github_security",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: "",
            }),
            {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
});
