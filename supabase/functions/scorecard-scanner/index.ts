import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * OpenSSF Scorecard Scanner
 *
 * Calls the free public Security Scorecard API to evaluate supply chain
 * security for a GitHub repository. Checks ~18 areas including:
 *   - Branch protection, code review, dangerous workflows
 *   - Pinned dependencies, token permissions, SAST, fuzzing
 *   - License, maintained status, vulnerabilities
 *
 * API: https://api.securityscorecards.dev (no auth needed for public repos)
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

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 15000,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                "User-Agent": "CheckVibe-ScorecardScanner/1.0 (+https://checkvibe.dev)",
                Accept: "application/json",
                ...(options.headers || {}),
            },
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
    // Accept formats: "owner/repo", "https://github.com/owner/repo", "github.com/owner/repo"
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const urlMatch = cleaned.match(
        /(?:https?:\/\/)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)/,
    );
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

    const slashMatch = cleaned.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/);
    if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };

    return null;
}

// ---------------------------------------------------------------------------
// Severity mapping for scorecard check scores (0-10)
// ---------------------------------------------------------------------------

function scorecardCheckSeverity(
    score: number,
): "critical" | "high" | "medium" | "low" | "info" {
    if (score <= 2) return "critical";
    if (score <= 4) return "high";
    if (score <= 6) return "medium";
    if (score <= 8) return "low";
    return "info";
}

function scorecardDeduction(score: number): number {
    if (score <= 2) return 15;
    if (score <= 4) return 10;
    if (score <= 6) return 5;
    if (score <= 8) return 2;
    return 0;
}

// Human-readable descriptions for scorecard checks
const CHECK_DESCRIPTIONS: Record<string, { title: string; recommendation: string }> = {
    "Branch-Protection": {
        title: "Branch protection rules",
        recommendation:
            "Enable branch protection on default branch: require PR reviews, status checks, and prevent force pushes.",
    },
    "Code-Review": {
        title: "Code review before merge",
        recommendation:
            "Require at least one approving review before merging pull requests.",
    },
    "Dangerous-Workflow": {
        title: "Dangerous GitHub Actions workflows",
        recommendation:
            "Avoid using pull_request_target with checkout of PR code. Use pull_request event instead.",
    },
    "Token-Permissions": {
        title: "GitHub token permissions",
        recommendation:
            "Set minimal permissions for GITHUB_TOKEN in workflows. Use 'permissions: read-all' or scope to specific needs.",
    },
    "Pinned-Dependencies": {
        title: "Pinned dependencies in CI",
        recommendation:
            "Pin all third-party actions and Docker images to specific SHA hashes instead of mutable tags.",
    },
    "SAST": {
        title: "Static Application Security Testing",
        recommendation:
            "Enable CodeQL or another SAST tool in your CI pipeline to catch vulnerabilities before merge.",
    },
    "Binary-Artifacts": {
        title: "Binary artifacts in repository",
        recommendation:
            "Remove binary/compiled files from the repository. Use a package registry instead.",
    },
    "Fuzzing": {
        title: "Fuzz testing",
        recommendation:
            "Add fuzz tests to your project, ideally integrated with OSS-Fuzz or ClusterFuzzLite.",
    },
    "License": {
        title: "Project license",
        recommendation:
            "Add a LICENSE file to the root of your repository.",
    },
    "Maintained": {
        title: "Project maintenance activity",
        recommendation:
            "Ensure the project has recent commits and issue responses to demonstrate active maintenance.",
    },
    "Vulnerabilities": {
        title: "Known vulnerabilities",
        recommendation:
            "Address all known vulnerabilities flagged by OSV.dev. Enable Dependabot or similar tooling.",
    },
    "Security-Policy": {
        title: "Security policy (SECURITY.md)",
        recommendation:
            "Add a SECURITY.md file describing how to report vulnerabilities.",
    },
    "Signed-Releases": {
        title: "Signed releases",
        recommendation:
            "Sign release artifacts with GPG or Sigstore to allow consumers to verify authenticity.",
    },
    "Packaging": {
        title: "Build and packaging via CI",
        recommendation:
            "Build packages via CI/CD pipelines rather than local machines to prevent supply chain attacks.",
    },
    "CI-Tests": {
        title: "CI test execution",
        recommendation:
            "Ensure CI runs tests on pull requests to catch regressions.",
    },
    "CII-Best-Practices": {
        title: "CII Best Practices badge",
        recommendation:
            "Apply for a CII Best Practices badge at https://bestpractices.coreinfrastructure.org/.",
    },
    "Contributors": {
        title: "Number of contributors",
        recommendation:
            "Encourage community contributions. Bus-factor risk is lower with more contributors.",
    },
    "Webhooks": {
        title: "Webhook security",
        recommendation:
            "If using webhooks, ensure they use secrets to validate payloads.",
    },
};

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
                    scannerType: "scorecard",
                    score: 0,
                    findings: [
                        {
                            id: "scorecard-no-repo",
                            severity: "info",
                            title: "No GitHub repository provided",
                            description:
                                "The OpenSSF Scorecard scanner requires a public GitHub repository URL to evaluate supply chain security.",
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
                    scannerType: "scorecard",
                    score: 0,
                    findings: [
                        {
                            id: "scorecard-invalid-repo",
                            severity: "info",
                            title: "Invalid GitHub repository format",
                            description: `Could not parse "${githubRepo}" as a GitHub repository. Expected format: owner/repo.`,
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
        let checksRun = 0;
        let totalDeduction = 0;

        // Call the OpenSSF Scorecard API
        const apiUrl = `https://api.securityscorecards.dev/projects/github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

        let scorecardData: any;
        try {
            const response = await fetchWithTimeout(apiUrl, {}, 20000);

            if (response.status === 404) {
                findings.push({
                    id: "scorecard-not-found",
                    severity: "low",
                    title: "Repository not found in OpenSSF Scorecard",
                    description: `The repository ${owner}/${repo} was not found in the Scorecard database. It may be private, too new, or not yet analyzed.`,
                    recommendation:
                        "Ensure the repository is public. New repos may take a few days to appear in the Scorecard database. You can also run scorecard locally: https://github.com/ossf/scorecard",
                });

                return new Response(
                    JSON.stringify({
                        scannerType: "scorecard",
                        score: 50,
                        findings,
                        checksRun: 1,
                        scannedAt: new Date().toISOString(),
                        url: targetUrl,
                    } satisfies ScanResult),
                    {
                        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                    },
                );
            }

            if (!response.ok) {
                throw new Error(`Scorecard API returned ${response.status}`);
            }

            scorecardData = await response.json();
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            findings.push({
                id: "scorecard-api-error",
                severity: "info",
                title: "OpenSSF Scorecard API unavailable",
                description: `Could not reach the Scorecard API: ${errMsg}. The API may be temporarily unavailable.`,
                recommendation: "Try again later or run scorecard locally.",
            });

            return new Response(
                JSON.stringify({
                    scannerType: "scorecard",
                    score: 50,
                    findings,
                    checksRun: 1,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Process scorecard checks
        const overallScorecardScore = scorecardData?.score ?? null;
        const checks: Array<{ name: string; score: number; reason: string; documentation?: { url?: string } }> =
            scorecardData?.checks ?? [];

        if (overallScorecardScore !== null) {
            findings.push({
                id: "scorecard-overall",
                severity: "info",
                title: `OpenSSF Scorecard: ${overallScorecardScore.toFixed(1)}/10`,
                description: `The overall OpenSSF Scorecard score for ${owner}/${repo} is ${overallScorecardScore.toFixed(1)} out of 10. This evaluates supply chain security practices.`,
                recommendation:
                    "Focus on improving checks with the lowest scores. See https://scorecard.dev for details.",
                evidence: `Overall: ${overallScorecardScore.toFixed(1)}/10 | ${checks.length} checks evaluated`,
            });
        }

        for (const check of checks) {
            checksRun++;
            const checkScore = check.score ?? -1;
            if (checkScore < 0) continue; // Skip checks that returned errors

            const severity = scorecardCheckSeverity(checkScore);
            const deduction = scorecardDeduction(checkScore);
            const meta = CHECK_DESCRIPTIONS[check.name] || {
                title: check.name,
                recommendation: "Review the OpenSSF Scorecard documentation for remediation steps.",
            };

            totalDeduction += deduction;

            findings.push({
                id: `scorecard-${check.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                severity,
                title: `${meta.title}: ${checkScore}/10`,
                description: check.reason || `Score: ${checkScore}/10 for ${check.name}.`,
                recommendation: meta.recommendation,
                evidence: check.documentation?.url
                    ? `Score: ${checkScore}/10 | Docs: ${check.documentation.url}`
                    : `Score: ${checkScore}/10`,
            });
        }

        // Cap total deduction
        totalDeduction = Math.min(totalDeduction, 100);
        const score = Math.max(0, 100 - totalDeduction);

        const result: ScanResult = {
            scannerType: "scorecard",
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
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
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
