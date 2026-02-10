import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * GitHub Secrets Scanner
 * Searches WITHIN a user-provided GitHub repository for leaked secrets.
 * Requires the user to provide their repo URL (e.g. github.com/user/repo).
 *
 * Checks:
 * 1. Direct file check — do .env files currently exist in the repo?
 * 2. Git history check — were .env files ever committed (even if deleted)?
 * 3. .gitignore check — does .gitignore exclude .env files?
 * 4. Code search — are there hardcoded secrets/keys in source code?
 * 5. Private key files — are .pem/.key files committed?
 */

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

const SENSITIVE_FILES = [".env", ".env.local", ".env.production", ".env.staging", ".env.development"];

// Patterns that indicate real secrets (not placeholders)
const SECRET_VALUE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS Access Key" },
    { pattern: /sk_live_[0-9a-zA-Z]{24,}/, label: "Stripe Live Secret Key" },
    { pattern: /rk_live_[0-9a-zA-Z]{24,}/, label: "Stripe Restricted Key" },
    { pattern: /ghp_[0-9a-zA-Z]{36}/, label: "GitHub Personal Access Token" },
    { pattern: /gho_[0-9a-zA-Z]{36}/, label: "GitHub OAuth Token" },
    { pattern: /glpat-[0-9a-zA-Z_-]{20,}/, label: "GitLab Personal Access Token" },
    { pattern: /xox[bporas]-[0-9a-zA-Z-]{10,}/, label: "Slack Token" },
    { pattern: /SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}/, label: "SendGrid API Key" },
    { pattern: /sq0atp-[0-9A-Za-z_-]{22}/, label: "Square Access Token" },
    { pattern: /sk-[0-9a-zA-Z]{32,}/, label: "OpenAI / Generic Secret Key" },
    { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, label: "Private Key" },
    { pattern: /mongodb\+srv:\/\/[^:]+:[^@]+@/, label: "MongoDB Connection String" },
    { pattern: /postgres:\/\/[^:]+:[^@]+@/, label: "PostgreSQL Connection String" },
    { pattern: /mysql:\/\/[^:]+:[^@]+@/, label: "MySQL Connection String" },
    { pattern: /redis:\/\/[^:]+:[^@]+@/, label: "Redis Connection String" },
];

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
    reportUrl?: string;
}

function parseRepoFromUrl(input: string): string | null {
    // Accept: "owner/repo", "github.com/owner/repo", "https://github.com/owner/repo", etc.
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const match = cleaned.match(/(?:github\.com\/)?([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)$/);
    return match ? match[1] : null;
}

function maskSecret(value: string): string {
    if (value.length <= 8) return "****";
    return value.substring(0, 4) + "****";
}

function maskSecretsInContent(content: string): string {
    let masked = content;
    // Mask key=value patterns
    masked = masked.replace(/([A-Z_]+(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|CREDENTIAL|AUTH))\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/gi,
        (_, key, val) => `${key}=${maskSecret(val)}`
    );
    // Mask connection strings
    masked = masked.replace(/((?:mongodb|postgres|mysql|redis)\+?(?:srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
        (_, pre, pass, post) => `${pre}${maskSecret(pass)}${post}`
    );
    // Mask standalone long tokens
    masked = masked.replace(/(?:sk_live_|rk_live_|ghp_|gho_|glpat-|xox[bporas]-)([a-zA-Z0-9_-]{8,})/g,
        (match) => maskSecret(match)
    );
    return masked;
}

async function githubFetch(path: string, token: string): Promise<Response> {
    return fetch(`https://api.github.com${path}`, {
        headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "CheckVibe-Scanner/2.0",
        },
    });
}

async function githubSearchFetch(query: string, token: string): Promise<Response> {
    return fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`, {
        headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.text-match+json",
            "User-Agent": "CheckVibe-Scanner/2.0",
        },
    });
}

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
        const githubRepo = body.githubRepo;

        // If no repo provided, skip gracefully
        if (!githubRepo || typeof githubRepo !== "string") {
            return new Response(JSON.stringify({
                scannerType: "github_secrets",
                score: 100,
                checksRun: 0,
                findings: [{
                    id: "github-no-repo",
                    severity: "info" as const,
                    title: "No GitHub repository provided",
                    description: "Provide a GitHub repository URL to scan for leaked secrets in your source code.",
                    recommendation: "Add your GitHub repository URL when starting a scan to enable secret detection.",
                }],
                scannedAt: new Date().toISOString(),
                url: body.targetUrl || "",
            }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }

        const repo = parseRepoFromUrl(githubRepo);
        if (!repo) {
            return new Response(JSON.stringify({
                scannerType: "github_secrets",
                score: 100,
                checksRun: 0,
                findings: [{
                    id: "github-invalid-repo",
                    severity: "info" as const,
                    title: "Invalid GitHub repository URL",
                    description: `Could not parse repository from: ${githubRepo}. Expected format: owner/repo or https://github.com/owner/repo`,
                    recommendation: "Provide a valid GitHub repository URL.",
                }],
                scannedAt: new Date().toISOString(),
                url: body.targetUrl || "",
            }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }

        if (!GITHUB_TOKEN) {
            return new Response(JSON.stringify({
                scannerType: "github_secrets",
                score: 100,
                checksRun: 0,
                findings: [{
                    id: "github-no-token",
                    severity: "info" as const,
                    title: "GitHub scanning not configured",
                    description: "GITHUB_TOKEN environment variable is not set.",
                    recommendation: "Configure a GitHub personal access token to enable repository scanning.",
                }],
                scannedAt: new Date().toISOString(),
                url: body.targetUrl || "",
            }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }

        // Verify repo exists
        const repoCheck = await githubFetch(`/repos/${repo}`, GITHUB_TOKEN);
        if (!repoCheck.ok) {
            const status = repoCheck.status;
            return new Response(JSON.stringify({
                scannerType: "github_secrets",
                score: 100,
                checksRun: 0,
                findings: [{
                    id: "github-repo-not-found",
                    severity: "info" as const,
                    title: status === 404 ? "Repository not found" : "Cannot access repository",
                    description: status === 404
                        ? `Repository ${repo} does not exist or is private.`
                        : `GitHub API returned ${status} for ${repo}.`,
                    recommendation: status === 404
                        ? "Check the repository URL. Private repos require a token with repo scope."
                        : "Check your GitHub token permissions.",
                }],
                scannedAt: new Date().toISOString(),
                url: body.targetUrl || "",
            }), {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // =========================================================
        // CHECK 1: Do .env files currently exist in the repo?
        // =========================================================
        checksRun++;
        const envFileChecks = await Promise.all(
            SENSITIVE_FILES.map(async (file) => {
                try {
                    const res = await githubFetch(`/repos/${repo}/contents/${file}`, GITHUB_TOKEN);
                    if (res.ok) {
                        const data = await res.json();
                        let content = "";
                        if (data.content && data.encoding === "base64") {
                            try {
                                content = atob(data.content.replace(/\n/g, ""));
                            } catch { /* ignore decode errors */ }
                        }
                        return { file, exists: true, content, htmlUrl: data.html_url || `https://github.com/${repo}/blob/main/${file}` };
                    }
                    return { file, exists: false, content: "", htmlUrl: "" };
                } catch {
                    return { file, exists: false, content: "", htmlUrl: "" };
                }
            })
        );

        for (const check of envFileChecks) {
            if (!check.exists) continue;

            // Check if the file contains real secrets (not just placeholders/examples)
            const foundSecrets: string[] = [];
            for (const sp of SECRET_VALUE_PATTERNS) {
                if (sp.pattern.test(check.content)) {
                    foundSecrets.push(sp.label);
                }
            }

            // Also check for non-empty key=value pairs that look like real credentials
            const hasRealValues = /(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|DATABASE_URL)\s*=\s*[^\s]{8,}/i.test(check.content);

            if (foundSecrets.length > 0) {
                score -= 30;
                findings.push({
                    id: `github-env-secrets-${check.file}`,
                    severity: "critical",
                    title: `Live secrets found in ${check.file}`,
                    description: `${check.file} contains real credentials: ${foundSecrets.join(", ")}. These secrets are exposed to anyone with access to this repository.`,
                    recommendation: "Immediately rotate all exposed credentials. Remove the file from the repo and git history using 'git filter-branch' or BFG Repo-Cleaner. Add the file to .gitignore.",
                    evidence: maskSecretsInContent(check.content.substring(0, 300)),
                    reportUrl: check.htmlUrl,
                });
            } else if (hasRealValues) {
                score -= 20;
                findings.push({
                    id: `github-env-creds-${check.file}`,
                    severity: "high",
                    title: `Potential credentials in ${check.file}`,
                    description: `${check.file} exists in the repository and appears to contain credential values. Even if they are test/dev credentials, committed .env files are a security risk.`,
                    recommendation: "Remove the file from the repository and git history. Use environment variables injected at deploy time instead of committed files.",
                    evidence: maskSecretsInContent(check.content.substring(0, 300)),
                    reportUrl: check.htmlUrl,
                });
            } else {
                score -= 5;
                findings.push({
                    id: `github-env-exists-${check.file}`,
                    severity: "medium",
                    title: `${check.file} file committed to repository`,
                    description: `${check.file} exists in the repository. Even if it currently contains only placeholders, this file may have contained real secrets in previous commits.`,
                    recommendation: "Remove the file from the repository. Add it to .gitignore. Check git history for previously committed secrets.",
                    reportUrl: check.htmlUrl,
                });
            }
        }

        // =========================================================
        // CHECK 2: Were .env files ever committed? (git history)
        // =========================================================
        checksRun++;
        const historyChecks = await Promise.all(
            [".env", ".env.local", ".env.production"].map(async (file) => {
                // Skip if file currently exists (already reported above)
                if (envFileChecks.find(c => c.file === file && c.exists)) {
                    return { file, wasCommitted: false };
                }
                try {
                    const res = await githubFetch(`/repos/${repo}/commits?path=${encodeURIComponent(file)}&per_page=1`, GITHUB_TOKEN);
                    if (res.ok) {
                        const commits = await res.json();
                        if (Array.isArray(commits) && commits.length > 0) {
                            return { file, wasCommitted: true, commitUrl: commits[0].html_url };
                        }
                    }
                    return { file, wasCommitted: false };
                } catch {
                    return { file, wasCommitted: false };
                }
            })
        );

        for (const check of historyChecks) {
            if (!check.wasCommitted) continue;
            score -= 20;
            findings.push({
                id: `github-history-${check.file}`,
                severity: "high",
                title: `${check.file} found in git history`,
                description: `${check.file} was previously committed to the repository and later deleted. The file contents (including any secrets) are still accessible in the git history.`,
                recommendation: "Use BFG Repo-Cleaner or 'git filter-repo' to permanently remove the file from git history. Rotate any credentials that were in the file.",
                reportUrl: check.commitUrl,
            });
        }

        // =========================================================
        // CHECK 3: Does .gitignore exclude .env files?
        // =========================================================
        checksRun++;
        try {
            const res = await githubFetch(`/repos/${repo}/contents/.gitignore`, GITHUB_TOKEN);
            if (res.ok) {
                const data = await res.json();
                let gitignoreContent = "";
                if (data.content && data.encoding === "base64") {
                    try {
                        gitignoreContent = atob(data.content.replace(/\n/g, ""));
                    } catch { /* ignore */ }
                }

                const hasEnvIgnore = /^\.env/m.test(gitignoreContent);
                if (!hasEnvIgnore) {
                    score -= 10;
                    findings.push({
                        id: "github-no-gitignore-env",
                        severity: "high",
                        title: ".gitignore does not exclude .env files",
                        description: "The .gitignore file does not contain a pattern to exclude .env files. This means .env files can be accidentally committed.",
                        recommendation: "Add '.env*' or '.env' to your .gitignore file to prevent accidental commits of environment files.",
                        reportUrl: data.html_url,
                    });
                }
            } else {
                score -= 5;
                findings.push({
                    id: "github-no-gitignore",
                    severity: "medium",
                    title: "No .gitignore file found",
                    description: "The repository does not have a .gitignore file. Without it, sensitive files can easily be committed by accident.",
                    recommendation: "Create a .gitignore file that excludes .env files, node_modules, build artifacts, and other sensitive or unnecessary files.",
                });
            }
        } catch {
            // Non-critical, continue
        }

        // =========================================================
        // CHECK 3.5: Search for .env files ANYWHERE in the repo
        // (Check 1 only covers root-level files)
        // =========================================================
        checksRun++;
        await new Promise(r => setTimeout(r, 500));
        try {
            const envSearchQuery = `repo:${repo} filename:.env`;
            const envSearchRes = await githubSearchFetch(envSearchQuery, GITHUB_TOKEN);
            if (envSearchRes.ok) {
                const envSearchData = await envSearchRes.json();
                if (envSearchData.total_count > 0 && envSearchData.items) {
                    // Filter out files already found in Check 1 (root level)
                    const rootFiles = new Set(SENSITIVE_FILES);
                    const subDirEnvFiles = envSearchData.items.filter(
                        (item: any) => !rootFiles.has(item.path) && !item.path.includes(".example") && !item.path.includes(".sample") && !item.path.includes(".template") && !item.path.includes("template")
                    );

                    for (const item of subDirEnvFiles.slice(0, 5)) {
                        // Fetch the file content to check for real secrets
                        let hasSecrets = false;
                        const secretLabels: string[] = [];
                        const fragments = item.text_matches?.map((tm: any) => tm.fragment).join("\n") || "";

                        for (const sp of SECRET_VALUE_PATTERNS) {
                            if (sp.pattern.test(fragments)) {
                                hasSecrets = true;
                                secretLabels.push(sp.label);
                            }
                        }

                        if (hasSecrets) {
                            score -= 25;
                            findings.push({
                                id: `github-subdir-env-${item.path.replace(/[^a-z0-9]/gi, "-")}`,
                                severity: "critical",
                                title: `Secrets in ${item.path}`,
                                description: `Found .env file with real credentials (${secretLabels.join(", ")}) at ${item.path}.`,
                                recommendation: "Remove the .env file from the repository and git history. Use environment variables injected at deploy time.",
                                evidence: maskSecretsInContent(fragments.substring(0, 200)),
                                reportUrl: item.html_url,
                            });
                        } else {
                            score -= 5;
                            findings.push({
                                id: `github-subdir-env-${item.path.replace(/[^a-z0-9]/gi, "-")}`,
                                severity: "medium",
                                title: `.env file committed: ${item.path}`,
                                description: `An .env file exists at ${item.path}. Even without live secrets, committed .env files are a security risk.`,
                                recommendation: "Remove the file from the repository. Add .env patterns to .gitignore.",
                                reportUrl: item.html_url,
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Env file search error:", e);
        }

        // =========================================================
        // CHECK 4: Search for hardcoded secrets in source code
        // =========================================================
        checksRun++;
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 500));
        try {
            const searchQuery = `repo:${repo} PRIVATE_KEY OR SECRET_KEY OR API_KEY OR PASSWORD`;
            const res = await githubSearchFetch(searchQuery, GITHUB_TOKEN);
            if (res.ok) {
                const data = await res.json();
                if (data.total_count > 0 && data.items) {
                    // Check each result for actual secret values (not just variable names)
                    const realFindings: Array<{ path: string; url: string; fragment: string; secrets: string[] }> = [];

                    for (const item of data.items.slice(0, 10)) {
                        // Skip common false positives
                        const skipPatterns = [".md", "README", "CHANGELOG", "LICENSE", "package-lock.json", "yarn.lock", ".example", ".sample", ".template"];
                        if (skipPatterns.some(p => item.path.includes(p))) continue;

                        const fragments = item.text_matches?.map((tm: any) => tm.fragment).join("\n") || "";
                        const foundSecrets: string[] = [];
                        for (const sp of SECRET_VALUE_PATTERNS) {
                            if (sp.pattern.test(fragments)) {
                                foundSecrets.push(sp.label);
                            }
                        }

                        if (foundSecrets.length > 0) {
                            realFindings.push({
                                path: item.path,
                                url: item.html_url,
                                fragment: fragments,
                                secrets: foundSecrets,
                            });
                        }
                    }

                    for (const rf of realFindings.slice(0, 5)) {
                        score -= 25;
                        findings.push({
                            id: `github-code-secret-${rf.path.replace(/[^a-z0-9]/gi, "-")}`,
                            severity: "critical",
                            title: `Hardcoded secret in ${rf.path}`,
                            description: `Found hardcoded credentials in source code: ${rf.secrets.join(", ")}. Secrets should never be committed to source control.`,
                            recommendation: "Move all secrets to environment variables. Use a secrets manager (e.g., Doppler, Vault, or your hosting provider's secrets). Rotate the exposed credentials immediately.",
                            evidence: maskSecretsInContent(rf.fragment.substring(0, 200)),
                            reportUrl: rf.url,
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Code search error:", e);
        }

        // =========================================================
        // CHECK 5: Search for private key files
        // =========================================================
        checksRun++;
        await new Promise(r => setTimeout(r, 500));
        try {
            const keyQuery = `repo:${repo} extension:pem OR extension:key OR filename:id_rsa`;
            const res = await githubSearchFetch(keyQuery, GITHUB_TOKEN);
            if (res.ok) {
                const data = await res.json();
                if (data.total_count > 0 && data.items) {
                    for (const item of data.items.slice(0, 3)) {
                        score -= 25;
                        findings.push({
                            id: `github-private-key-${item.path.replace(/[^a-z0-9]/gi, "-")}`,
                            severity: "critical",
                            title: `Private key file committed: ${item.path}`,
                            description: `A private key file (${item.path}) is committed to the repository. Private keys should never be in source control.`,
                            recommendation: "Remove the private key from the repository and git history. Generate a new key pair. Use environment variables or a secrets manager to provide keys at runtime.",
                            reportUrl: item.html_url,
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Key search error:", e);
        }

        // =========================================================
        // No findings = good news
        // =========================================================
        if (findings.length === 0) {
            findings.push({
                id: "github-clean",
                severity: "info",
                title: "No leaked secrets detected",
                description: `Scanned repository ${repo} — no committed .env files, no secrets in git history, and no hardcoded credentials found in source code.`,
                recommendation: "Keep using environment variables and .gitignore to protect secrets. Consider enabling GitHub's secret scanning feature for continuous protection.",
            });
        }

        return new Response(JSON.stringify({
            scannerType: "github_secrets",
            score: Math.max(0, score),
            checksRun,
            findings,
            scannedAt: new Date().toISOString(),
            url: body.targetUrl || "",
            repository: repo,
        }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Scanner error:", error);
        return new Response(JSON.stringify({
            scannerType: "github_secrets",
            score: 0,
            error: "Scan failed. Please try again.",
            findings: [],
            metadata: {},
        }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 500,
        });
    }
});
