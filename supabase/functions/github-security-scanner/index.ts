import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * GitHub Native Security Scanner
 *
 * Aggregates GitHub's own pre-computed security data from 3 APIs in parallel:
 *   1. Dependabot alerts (dependency CVEs)
 *   2. Code scanning alerts (CodeQL / SAST findings)
 *   3. Secret scanning alerts (leaked credentials)
 *
 * Uses the server-side GITHUB_TOKEN (needs `security_events` scope for private repos;
 * public repos work with basic `repo` scope for Dependabot + code scanning,
 * and `security_events` for secret scanning).
 *
 * SECURITY: Read-only — only GETs alert data, never modifies anything.
 */

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

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    checksRun: number;
    scannedAt: string;
    url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") || "";

async function fetchGitHub(
    path: string,
    timeout = 12000,
): Promise<{ data: any; status: number; error?: string }> {
    if (!GITHUB_TOKEN) {
        return { data: null, status: 0, error: "No GITHUB_TOKEN configured" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`https://api.github.com${path}`, {
            signal: controller.signal,
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "CheckVibe-GitHubSecurityScanner/1.0",
            },
        });

        const status = response.status;
        if (status === 200) {
            const data = await response.json();
            return { data, status };
        }
        if (status === 404 || status === 403 || status === 451) {
            return { data: null, status };
        }

        return { data: null, status, error: `GitHub API returned ${status}` };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { data: null, status: 0, error: msg };
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const urlMatch = cleaned.match(
        /(?:https?:\/\/)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)/,
    );
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

    const slashMatch = cleaned.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/);
    if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };

    return null;
}

function mapGitHubSeverity(severity: string): "critical" | "high" | "medium" | "low" {
    switch (severity?.toLowerCase()) {
        case "critical":
            return "critical";
        case "high":
            return "high";
        case "medium":
        case "moderate":
            return "medium";
        default:
            return "low";
    }
}

// ---------------------------------------------------------------------------
// Dependabot alerts
// ---------------------------------------------------------------------------

async function fetchDependabotAlerts(
    owner: string,
    repo: string,
    findings: Finding[],
): Promise<{ checksRun: number; deduction: number }> {
    const { data, status, error } = await fetchGitHub(
        `/repos/${owner}/${repo}/dependabot/alerts?state=open&per_page=100&sort=severity&direction=desc`,
    );

    if (error || status === 0) {
        findings.push({
            id: "gh-sec-dependabot-error",
            severity: "info",
            title: "Could not fetch Dependabot alerts",
            description: error || "Dependabot alerts API is unavailable.",
            recommendation: "Ensure the GITHUB_TOKEN has the `security_events` scope.",
        });
        return { checksRun: 1, deduction: 0 };
    }

    if (status === 404 || status === 403) {
        findings.push({
            id: "gh-sec-dependabot-disabled",
            severity: "medium",
            title: "Dependabot alerts not enabled or not accessible",
            description:
                "The Dependabot alerts API returned 404/403. Dependabot may not be enabled for this repository, or the token lacks permission.",
            recommendation:
                "Enable Dependabot alerts in Settings > Code security and analysis. Ensure the token has `security_events` scope.",
        });
        return { checksRun: 1, deduction: 10 };
    }

    if (!Array.isArray(data)) {
        return { checksRun: 1, deduction: 0 };
    }

    const alerts = data;
    let deduction = 0;

    // Count by severity
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const alert of alerts) {
        const sev = alert.security_advisory?.severity || alert.security_vulnerability?.severity || "low";
        const mapped = mapGitHubSeverity(sev);
        counts[mapped]++;
    }

    if (alerts.length === 0) {
        findings.push({
            id: "gh-sec-dependabot-clean",
            severity: "info",
            title: "No open Dependabot alerts",
            description: "No known dependency vulnerabilities were found by Dependabot.",
            recommendation: "Keep Dependabot enabled and address alerts as they appear.",
        });
    } else {
        // Summary finding
        findings.push({
            id: "gh-sec-dependabot-summary",
            severity: counts.critical > 0 ? "critical" : counts.high > 0 ? "high" : "medium",
            title: `${alerts.length} open Dependabot alert${alerts.length > 1 ? "s" : ""}`,
            description: `Found ${alerts.length} unresolved dependency vulnerabilities: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low.`,
            recommendation:
                "Review and remediate Dependabot alerts, starting with critical and high severity. Enable Dependabot security updates for automatic fix PRs.",
            evidence: `Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}`,
        });

        // Top 5 individual alerts
        const top = alerts.slice(0, 5);
        for (const alert of top) {
            const advisory = alert.security_advisory || {};
            const vuln = alert.security_vulnerability || {};
            const sev = mapGitHubSeverity(advisory.severity || vuln.severity || "low");
            const pkg = vuln.package?.name || alert.dependency?.package?.name || "unknown";
            const cveId = advisory.cve_id || `GHSA-${alert.number}`;

            findings.push({
                id: `gh-sec-dependabot-${alert.number}`,
                severity: sev,
                title: `${cveId}: ${advisory.summary || "Vulnerability in " + pkg}`,
                description: `${pkg} has a known ${sev} vulnerability. ${advisory.description?.substring(0, 200) || ""}`,
                recommendation: vuln.first_patched_version?.identifier
                    ? `Upgrade ${pkg} to ${vuln.first_patched_version.identifier} or later.`
                    : `Check for updates to ${pkg} and review the advisory.`,
                evidence: `Package: ${pkg} | Severity: ${sev}`,
            });
        }

        deduction = Math.min(
            counts.critical * 15 + counts.high * 8 + counts.medium * 3 + counts.low * 1,
            50,
        );
    }

    return { checksRun: 1, deduction };
}

// ---------------------------------------------------------------------------
// Code scanning alerts (CodeQL / SAST)
// ---------------------------------------------------------------------------

async function fetchCodeScanningAlerts(
    owner: string,
    repo: string,
    findings: Finding[],
): Promise<{ checksRun: number; deduction: number }> {
    const { data, status, error } = await fetchGitHub(
        `/repos/${owner}/${repo}/code-scanning/alerts?state=open&per_page=100&sort=created&direction=desc`,
    );

    if (error || status === 0) {
        findings.push({
            id: "gh-sec-codescan-error",
            severity: "info",
            title: "Could not fetch code scanning alerts",
            description: error || "Code scanning API is unavailable.",
            recommendation: "Ensure CodeQL or another SAST tool is configured.",
        });
        return { checksRun: 1, deduction: 0 };
    }

    if (status === 404 || status === 403) {
        findings.push({
            id: "gh-sec-codescan-disabled",
            severity: "medium",
            title: "Code scanning (SAST) not enabled",
            description:
                "No code scanning results found. CodeQL or a similar SAST tool is not configured for this repository.",
            recommendation:
                "Enable CodeQL code scanning via GitHub Actions. Go to Settings > Code security > Code scanning > Set up code scanning.",
        });
        return { checksRun: 1, deduction: 10 };
    }

    if (!Array.isArray(data)) {
        return { checksRun: 1, deduction: 0 };
    }

    const alerts = data;
    let deduction = 0;

    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const alert of alerts) {
        const sev = mapGitHubSeverity(
            alert.rule?.security_severity_level || alert.rule?.severity || "low",
        );
        counts[sev]++;
    }

    if (alerts.length === 0) {
        findings.push({
            id: "gh-sec-codescan-clean",
            severity: "info",
            title: "No open code scanning alerts",
            description:
                "Code scanning (SAST) found no open vulnerabilities in the codebase.",
            recommendation: "Continue running code scanning on every PR.",
        });
    } else {
        findings.push({
            id: "gh-sec-codescan-summary",
            severity: counts.critical > 0 ? "critical" : counts.high > 0 ? "high" : "medium",
            title: `${alerts.length} open code scanning alert${alerts.length > 1 ? "s" : ""}`,
            description: `Found ${alerts.length} SAST findings: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low.`,
            recommendation:
                "Review and fix code scanning alerts. Focus on critical/high severity findings first.",
            evidence: `Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}`,
        });

        const top = alerts.slice(0, 5);
        for (const alert of top) {
            const sev = mapGitHubSeverity(
                alert.rule?.security_severity_level || alert.rule?.severity || "low",
            );
            findings.push({
                id: `gh-sec-codescan-${alert.number}`,
                severity: sev,
                title: `${alert.rule?.id || "CodeQL"}: ${alert.rule?.description || alert.most_recent_instance?.message?.text || "Code vulnerability"}`,
                description: `Found in ${alert.most_recent_instance?.location?.path || "unknown file"}${alert.most_recent_instance?.location?.start_line ? `:${alert.most_recent_instance.location.start_line}` : ""}.`,
                recommendation:
                    alert.rule?.description
                        ? `Fix the ${alert.rule.id} issue. See CodeQL documentation for remediation.`
                        : "Review and fix this code scanning alert.",
                evidence: `Tool: ${alert.tool?.name || "CodeQL"} | Rule: ${alert.rule?.id || "unknown"}`,
            });
        }

        deduction = Math.min(
            counts.critical * 12 + counts.high * 6 + counts.medium * 2 + counts.low * 1,
            40,
        );
    }

    return { checksRun: 1, deduction };
}

// ---------------------------------------------------------------------------
// Secret scanning alerts
// ---------------------------------------------------------------------------

async function fetchSecretScanningAlerts(
    owner: string,
    repo: string,
    findings: Finding[],
): Promise<{ checksRun: number; deduction: number }> {
    const { data, status, error } = await fetchGitHub(
        `/repos/${owner}/${repo}/secret-scanning/alerts?state=open&per_page=100`,
    );

    if (error || status === 0) {
        findings.push({
            id: "gh-sec-secrets-error",
            severity: "info",
            title: "Could not fetch secret scanning alerts",
            description: error || "Secret scanning API is unavailable.",
            recommendation:
                "Ensure the GITHUB_TOKEN has `security_events` scope and secret scanning is enabled.",
        });
        return { checksRun: 1, deduction: 0 };
    }

    if (status === 404 || status === 403) {
        findings.push({
            id: "gh-sec-secrets-disabled",
            severity: "low",
            title: "Secret scanning not enabled or not accessible",
            description:
                "Secret scanning alerts are not available. The feature may be disabled or the token lacks permission.",
            recommendation:
                "Enable secret scanning in Settings > Code security and analysis. Note: push protection prevents secrets from being committed.",
        });
        return { checksRun: 1, deduction: 5 };
    }

    if (!Array.isArray(data)) {
        return { checksRun: 1, deduction: 0 };
    }

    const alerts = data;
    let deduction = 0;

    if (alerts.length === 0) {
        findings.push({
            id: "gh-sec-secrets-clean",
            severity: "info",
            title: "No open secret scanning alerts",
            description: "GitHub secret scanning found no leaked credentials in the repository.",
            recommendation:
                "Keep secret scanning enabled. Consider enabling push protection to block secrets before they're committed.",
        });
    } else {
        // Group by secret type
        const typeGroups: Record<string, number> = {};
        for (const alert of alerts) {
            const type = alert.secret_type_display_name || alert.secret_type || "unknown";
            typeGroups[type] = (typeGroups[type] || 0) + 1;
        }

        const typeList = Object.entries(typeGroups)
            .map(([type, count]) => `${type} (${count})`)
            .join(", ");

        findings.push({
            id: "gh-sec-secrets-summary",
            severity: "critical",
            title: `${alerts.length} leaked secret${alerts.length > 1 ? "s" : ""} detected`,
            description: `GitHub secret scanning found ${alerts.length} exposed credential(s): ${typeList}. These secrets should be rotated immediately.`,
            recommendation:
                "1) Rotate ALL exposed credentials immediately. 2) Revoke the old credentials. 3) Enable push protection to prevent future leaks. 4) Review git history for additional exposure.",
            evidence: `Secret types: ${typeList}`,
        });

        // Individual alerts (top 5, no secret values exposed)
        const top = alerts.slice(0, 5);
        for (const alert of top) {
            findings.push({
                id: `gh-sec-secret-${alert.number}`,
                severity: "critical",
                title: `Leaked: ${alert.secret_type_display_name || alert.secret_type || "credential"}`,
                description: `A ${alert.secret_type_display_name || alert.secret_type} was found in the repository. Created: ${alert.created_at?.substring(0, 10) || "unknown"}.`,
                recommendation: `Rotate this ${alert.secret_type_display_name || "credential"} immediately and revoke the old one.`,
            });
        }

        deduction = Math.min(alerts.length * 10, 40);
    }

    return { checksRun: 1, deduction };
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

        if (!githubRepo || typeof githubRepo !== "string") {
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 0,
                    findings: [
                        {
                            id: "gh-sec-no-repo",
                            severity: "info",
                            title: "No GitHub repository provided",
                            description:
                                "The GitHub Security scanner requires a repository URL to check Dependabot, code scanning, and secret scanning alerts.",
                            recommendation: "Provide a GitHub repository URL in the scan form.",
                        },
                    ],
                    checksRun: 0,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        const parsed = parseGitHubRepo(githubRepo);
        if (!parsed) {
            return new Response(
                JSON.stringify({
                    scannerType: "github_security",
                    score: 0,
                    findings: [
                        {
                            id: "gh-sec-invalid-repo",
                            severity: "info",
                            title: "Invalid GitHub repository format",
                            description: `Could not parse "${githubRepo}". Expected: owner/repo.`,
                            recommendation: "Use format: owner/repo or https://github.com/owner/repo",
                        },
                    ],
                    checksRun: 0,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        const { owner, repo } = parsed;
        const findings: Finding[] = [];

        // Run all three checks in parallel
        const [dependabot, codeScanning, secretScanning] = await Promise.all([
            fetchDependabotAlerts(owner, repo, findings),
            fetchCodeScanningAlerts(owner, repo, findings),
            fetchSecretScanningAlerts(owner, repo, findings),
        ]);

        const totalChecks =
            dependabot.checksRun + codeScanning.checksRun + secretScanning.checksRun;
        const totalDeduction = Math.min(
            dependabot.deduction + codeScanning.deduction + secretScanning.deduction,
            100,
        );

        const score = Math.max(0, 100 - totalDeduction);

        const result: ScanResult = {
            scannerType: "github_security",
            score,
            findings,
            checksRun: totalChecks,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("GitHub Security scanner error:", error);
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
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
