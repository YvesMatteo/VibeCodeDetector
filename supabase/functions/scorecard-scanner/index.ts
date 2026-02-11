import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * OpenSSF Scorecard Scanner
 *
 * Queries the OpenSSF Scorecard REST API for a public GitHub repository
 * and translates the structured check results into security findings.
 *
 * Scorecard evaluates ~18 checks covering supply-chain security:
 *   - Branch-Protection, Code-Review, Dangerous-Workflow, Token-Permissions,
 *     Pinned-Dependencies, Vulnerabilities, SAST, Maintained, License, etc.
 *
 * API: https://api.scorecard.dev/projects/github.com/{owner}/{repo}
 * No authentication required. Free for all public repositories.
 *
 * SECURITY GUARANTEES:
 *   - Read-only: single GET request to scorecard API
 *   - No credentials sent or stored
 *   - No interaction with the target repository
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORECARD_API_BASE = "https://api.scorecard.dev/projects/github.com";
const REQUEST_TIMEOUT_MS = 20000;

// Map scorecard check names to severity thresholds and descriptions
const CHECK_CONFIG: Record<string, {
    weight: number;
    criticalBelow: number;
    highBelow: number;
    mediumBelow: number;
    category: string;
    recommendation: string;
}> = {
    "Branch-Protection": {
        weight: 3,
        criticalBelow: 2,
        highBelow: 5,
        mediumBelow: 7,
        category: "Access Control",
        recommendation: "Enable branch protection rules: require pull request reviews, status checks, and prevent force pushes on your default branch.",
    },
    "Code-Review": {
        weight: 3,
        criticalBelow: 2,
        highBelow: 5,
        mediumBelow: 7,
        category: "Code Quality",
        recommendation: "Require code reviews for all pull requests before merging. Set up CODEOWNERS for critical paths.",
    },
    "Dangerous-Workflow": {
        weight: 4,
        criticalBelow: 5,
        highBelow: 8,
        mediumBelow: 10,
        category: "CI/CD Security",
        recommendation: "Avoid using pull_request_target with checkout, untrusted input in run: blocks, or other dangerous workflow patterns. See https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/",
    },
    "Token-Permissions": {
        weight: 3,
        criticalBelow: 2,
        highBelow: 5,
        mediumBelow: 7,
        category: "CI/CD Security",
        recommendation: "Set explicit, minimal permissions for GITHUB_TOKEN in your workflows. Add 'permissions:' block at the top of each workflow file.",
    },
    "Pinned-Dependencies": {
        weight: 2,
        criticalBelow: 2,
        highBelow: 4,
        mediumBelow: 7,
        category: "Supply Chain",
        recommendation: "Pin GitHub Actions and Docker images to full-length commit SHAs instead of mutable tags. Use tools like StepSecurity Secure-Repo to automate this.",
    },
    "Vulnerabilities": {
        weight: 4,
        criticalBelow: 5,
        highBelow: 8,
        mediumBelow: 10,
        category: "Vulnerabilities",
        recommendation: "Address known vulnerabilities in your dependencies. Enable Dependabot alerts and security updates.",
    },
    "SAST": {
        weight: 2,
        criticalBelow: 1,
        highBelow: 3,
        mediumBelow: 6,
        category: "Code Quality",
        recommendation: "Enable static analysis security testing (SAST) in your CI/CD pipeline. Consider CodeQL, Semgrep, or similar tools.",
    },
    "Maintained": {
        weight: 2,
        criticalBelow: 1,
        highBelow: 3,
        mediumBelow: 5,
        category: "Project Health",
        recommendation: "Ensure the project shows signs of active maintenance: recent commits, issue responses, and dependency updates.",
    },
    "Binary-Artifacts": {
        weight: 2,
        criticalBelow: 5,
        highBelow: 8,
        mediumBelow: 10,
        category: "Supply Chain",
        recommendation: "Remove binary artifacts (compiled executables, JARs, etc.) from the repository. Build from source in CI/CD instead.",
    },
    "CI-Tests": {
        weight: 1,
        criticalBelow: 1,
        highBelow: 3,
        mediumBelow: 5,
        category: "Code Quality",
        recommendation: "Add CI tests that run on pull requests. This helps catch bugs and regressions before they reach production.",
    },
    "Fuzzing": {
        weight: 1,
        criticalBelow: 0,
        highBelow: 1,
        mediumBelow: 3,
        category: "Code Quality",
        recommendation: "Consider adding fuzz testing to discover edge-case bugs and security vulnerabilities. OSS-Fuzz is free for open-source projects.",
    },
    "License": {
        weight: 1,
        criticalBelow: 0,
        highBelow: 1,
        mediumBelow: 5,
        category: "Project Health",
        recommendation: "Add a LICENSE file to your repository to clarify usage terms and legal protections.",
    },
    "Security-Policy": {
        weight: 2,
        criticalBelow: 1,
        highBelow: 3,
        mediumBelow: 6,
        category: "Project Health",
        recommendation: "Add a SECURITY.md file describing how to report security vulnerabilities. This helps researchers disclose issues responsibly.",
    },
    "Signed-Releases": {
        weight: 1,
        criticalBelow: 0,
        highBelow: 1,
        mediumBelow: 5,
        category: "Supply Chain",
        recommendation: "Sign your releases and tags with GPG or sigstore to allow consumers to verify authenticity.",
    },
    "Packaging": {
        weight: 1,
        criticalBelow: 0,
        highBelow: 2,
        mediumBelow: 5,
        category: "Supply Chain",
        recommendation: "Use automated, secure packaging workflows (e.g., GitHub Actions with SLSA provenance) for building and publishing releases.",
    },
    "Dependency-Update-Tool": {
        weight: 2,
        criticalBelow: 1,
        highBelow: 3,
        mediumBelow: 6,
        category: "Supply Chain",
        recommendation: "Enable Dependabot or Renovate to automatically create pull requests for dependency updates.",
    },
    "Webhooks": {
        weight: 1,
        criticalBelow: 2,
        highBelow: 5,
        mediumBelow: 7,
        category: "Access Control",
        recommendation: "Ensure all webhooks use HTTPS and have a secret configured for payload validation.",
    },
};

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

interface ScorecardCheck {
    name: string;
    score: number;
    reason: string;
    details?: string[];
    documentation?: { url?: string };
}

interface ScorecardResponse {
    date: string;
    repo: { name: string };
    scorecard: { version: string; commit: string };
    score: number;
    checks: ScorecardCheck[];
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

function checkSeverity(
    checkName: string,
    score: number,
): "critical" | "high" | "medium" | "low" | "info" {
    const config = CHECK_CONFIG[checkName];
    if (!config) {
        // Unknown check — use generic thresholds
        if (score <= 2) return "high";
        if (score <= 5) return "medium";
        if (score <= 7) return "low";
        return "info";
    }

    if (score < config.criticalBelow) return "critical";
    if (score < config.highBelow) return "high";
    if (score < config.mediumBelow) return "medium";
    if (score < 10) return "low";
    return "info";
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
                    scannerType: "scorecard",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "scorecard-no-repo",
                        severity: "info",
                        title: "No GitHub repository provided",
                        description:
                            "OpenSSF Scorecard analysis requires a public GitHub repository URL. Provide one to evaluate your project's supply chain security posture.",
                        recommendation:
                            "Add your GitHub repository URL when starting a scan to enable Scorecard analysis.",
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
                    scannerType: "scorecard",
                    score: 100,
                    checksRun: 0,
                    findings: [{
                        id: "scorecard-invalid-repo",
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

        // ------------------------------------------------------------------
        // Query OpenSSF Scorecard API
        // ------------------------------------------------------------------

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let apiResponse: Response;
        try {
            apiResponse = await fetch(`${SCORECARD_API_BASE}/${repo}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "CheckVibe-ScorecardScanner/1.0",
                },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        // Handle errors
        if (!apiResponse.ok) {
            const status = apiResponse.status;

            if (status === 404) {
                return new Response(
                    JSON.stringify({
                        scannerType: "scorecard",
                        score: 100,
                        checksRun: 0,
                        findings: [{
                            id: "scorecard-not-found",
                            severity: "info",
                            title: "Scorecard data not available",
                            description: `No OpenSSF Scorecard data found for ${repo}. This usually means the repository is private, very new, or has not been analyzed by Scorecard yet.`,
                            recommendation:
                                "Scorecard only works with public GitHub repositories. You can run it locally with: scorecard --repo=github.com/" + repo,
                        }],
                        scannedAt: new Date().toISOString(),
                        url: targetUrl,
                    }),
                    { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
                );
            }

            return new Response(
                JSON.stringify({
                    scannerType: "scorecard",
                    score: 80,
                    checksRun: 0,
                    findings: [{
                        id: "scorecard-api-error",
                        severity: "medium",
                        title: "Scorecard API unavailable",
                        description: `OpenSSF Scorecard API returned HTTP ${status} for ${repo}.`,
                        recommendation: "Try scanning again later. The Scorecard API may be temporarily unavailable.",
                    }],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
            );
        }

        const data: ScorecardResponse = await apiResponse.json();
        const checks = data.checks || [];

        // ------------------------------------------------------------------
        // Convert scorecard checks to findings
        // ------------------------------------------------------------------

        const findings: Finding[] = [];
        let totalWeightedDeduction = 0;
        let totalWeight = 0;

        for (const check of checks) {
            const checkScore = check.score ?? -1;
            // Score of -1 means the check was not applicable
            if (checkScore < 0) continue;

            const config = CHECK_CONFIG[check.name];
            const weight = config?.weight ?? 1;
            totalWeight += weight;

            const severity = checkSeverity(check.name, checkScore);
            const category = config?.category ?? "General";

            // Calculate weighted deduction (10 = perfect, 0 = worst)
            const deduction = (10 - checkScore) * weight;
            totalWeightedDeduction += deduction;

            // Only report checks scoring below 10 (not perfect)
            if (checkScore < 10) {
                const detailSnippet = check.details && check.details.length > 0
                    ? `\n\nDetails: ${check.details.slice(0, 3).join("; ")}${check.details.length > 3 ? ` ...and ${check.details.length - 3} more` : ""}`
                    : "";

                findings.push({
                    id: `scorecard-${check.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                    severity,
                    title: `${check.name}: ${checkScore}/10${severity === "info" || severity === "low" ? "" : ` [${category}]`}`,
                    description: `${check.reason}${detailSnippet}`,
                    recommendation: config?.recommendation ?? `Improve the ${check.name} check. See https://github.com/ossf/scorecard/blob/main/docs/checks.md#${check.name.toLowerCase()} for details.`,
                    evidence: `Scorecard check: ${check.name}, Score: ${checkScore}/10, Category: ${category}`,
                });
            }
        }

        // ------------------------------------------------------------------
        // Calculate overall score (0-100 scale)
        // ------------------------------------------------------------------

        let score: number;
        if (totalWeight > 0) {
            // Max possible deduction = 10 * totalWeight
            const maxDeduction = 10 * totalWeight;
            const deductionRatio = totalWeightedDeduction / maxDeduction;
            score = Math.round(100 * (1 - deductionRatio));
        } else {
            score = 100;
        }

        // Clamp
        score = Math.max(0, Math.min(100, score));

        // Add overall scorecard score as info finding
        findings.unshift({
            id: "scorecard-overall",
            severity: score >= 70 ? "info" : score >= 40 ? "medium" : "high",
            title: `OpenSSF Scorecard: ${data.score.toFixed(1)}/10 overall`,
            description: `Repository ${repo} received an overall OpenSSF Scorecard score of ${data.score.toFixed(1)}/10 across ${checks.length} checks. Scorecard evaluates supply chain security practices including branch protection, dependency management, CI/CD security, and code review.`,
            recommendation: score >= 70
                ? "Your supply chain security posture is reasonable. Review individual checks below for areas to improve."
                : "Your supply chain security posture needs attention. Focus on the highest-severity findings first.",
            evidence: `Scorecard version: ${data.scorecard?.version ?? "unknown"}, Analysis date: ${data.date ?? "unknown"}`,
        });

        return new Response(
            JSON.stringify({
                scannerType: "scorecard",
                score,
                checksRun: checks.length,
                findings,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
                repository: repo,
                scorecardVersion: data.scorecard?.version,
                rawScore: data.score,
            }),
            { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("Scorecard scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "scorecard",
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
