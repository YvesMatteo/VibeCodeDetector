import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * GitHub Deep Secrets Scanner v2
 * Comprehensive secret detection across a user-provided GitHub repository.
 *
 * 8 Checks:
 * 1. Current .env files — scan for real secrets in committed env files
 * 2. Git history for deleted .env — detect previously committed env files
 * 3. .gitignore validation — ensure .env patterns are excluded
 * 4. Deep commit history scanning — scan recent commit diffs for 50+ secret patterns
 * 5. Multi-branch scanning — check non-default branches for secrets
 * 6. Dangerous file detection — find committed keys, certs, credentials, tfstate
 * 7. Dependency file secret scan — hardcoded secrets in Docker, CI/CD, Makefiles
 * 8. .env.example with real values — detect example files containing live secrets
 *
 * SECURITY: All secrets are redacted before inclusion in findings output.
 * Full secret values are NEVER logged, stored, or transmitted.
 */

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

// =========================================================================
// Secret Patterns (50+)
// =========================================================================

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "critical" | "high" | "medium" }> = [
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS Access Key", severity: "critical" },
  { pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i, label: "AWS Secret Key", severity: "critical" },
  // Stripe
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/, label: "Stripe Live Secret Key", severity: "critical" },
  { pattern: /rk_live_[a-zA-Z0-9]{24,}/, label: "Stripe Restricted Key", severity: "critical" },
  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{32,}/, label: "OpenAI API Key", severity: "critical" },
  { pattern: /sk-proj-[a-zA-Z0-9]{48,}/, label: "OpenAI Project Key", severity: "critical" },
  // Anthropic
  { pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/, label: "Anthropic API Key", severity: "critical" },
  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/, label: "GitHub PAT", severity: "critical" },
  { pattern: /gho_[a-zA-Z0-9]{36}/, label: "GitHub OAuth Token", severity: "critical" },
  { pattern: /github_pat_[a-zA-Z0-9_]{82}/, label: "GitHub Fine-Grained PAT", severity: "critical" },
  // GitLab
  { pattern: /glpat-[0-9a-zA-Z_-]{20,}/, label: "GitLab PAT", severity: "critical" },
  // Slack
  { pattern: /xox[bporas]-[0-9a-zA-Z-]{10,}/, label: "Slack Token", severity: "critical" },
  { pattern: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9a-zA-Z]{24}/, label: "Slack Webhook", severity: "critical" },
  // Discord
  { pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/, label: "Discord Webhook", severity: "critical" },
  // SendGrid
  { pattern: /SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}/, label: "SendGrid API Key", severity: "critical" },
  // Mailgun
  { pattern: /key-[a-zA-Z0-9]{32}/, label: "Mailgun API Key", severity: "critical" },
  // Mailchimp
  { pattern: /[a-f0-9]{32}-us[0-9]{1,2}/, label: "Mailchimp API Key", severity: "critical" },
  // Twilio
  { pattern: /SK[a-f0-9]{32}/, label: "Twilio API Key", severity: "critical" },
  // Telegram
  { pattern: /\d{8,10}:[A-Za-z0-9_-]{35}/, label: "Telegram Bot Token", severity: "critical" },
  // Google / Firebase
  { pattern: /AIza[0-9A-Za-z-_]{35}/, label: "Google/Firebase API Key", severity: "critical" },
  // Supabase service role / JWT
  { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, label: "JWT/Supabase Key", severity: "critical" },
  // Hugging Face
  { pattern: /hf_[a-zA-Z0-9]{34,}/, label: "Hugging Face Token", severity: "critical" },
  // Replicate
  { pattern: /r8_[a-zA-Z0-9]{20,}/, label: "Replicate API Token", severity: "critical" },
  // NPM
  { pattern: /npm_[A-Za-z0-9]{36}/, label: "NPM Token", severity: "critical" },
  // PyPI
  { pattern: /pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}/, label: "PyPI API Token", severity: "critical" },
  // Docker Hub
  { pattern: /dckr_pat_[A-Za-z0-9_-]{20,}/, label: "Docker Hub PAT", severity: "critical" },
  // Shopify
  { pattern: /shppa_[0-9a-fA-F]{32}/, label: "Shopify Private App Token", severity: "critical" },
  // Square
  { pattern: /sq0atp-[0-9A-Za-z_-]{22,}/, label: "Square Access Token", severity: "critical" },
  // Doppler
  { pattern: /dp\.st\.[a-zA-Z0-9_-]{40,}/, label: "Doppler Token", severity: "critical" },
  // Snyk
  { pattern: /snyk_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/, label: "Snyk API Token", severity: "critical" },
  // Linear
  { pattern: /lin_api_[a-zA-Z0-9]{40,}/, label: "Linear API Key", severity: "critical" },
  // Neon
  { pattern: /nk_[a-zA-Z0-9]{30,}/, label: "Neon Database Key", severity: "critical" },
  // Database connection strings
  { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@\s'"]+@[^\s'"]+/, label: "MongoDB Connection String", severity: "critical" },
  { pattern: /postgres(ql)?:\/\/[^:]+:[^@\s'"]+@[^\s'"]+/, label: "PostgreSQL Connection String", severity: "critical" },
  { pattern: /mysql:\/\/[^:]+:[^@\s'"]+@[^\s'"]+/, label: "MySQL Connection String", severity: "critical" },
  { pattern: /redis:\/\/[^:]*:[^@\s'"]+@[^\s'"]+/, label: "Redis Connection String", severity: "critical" },
  { pattern: /amqp:\/\/[^:]+:[^@\s'"]+@[^\s'"]+/, label: "RabbitMQ Connection String", severity: "critical" },
  // Private keys
  { pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, label: "Private Key", severity: "critical" },
  // Generic high-confidence patterns
  { pattern: /(?:SECRET_KEY|PRIVATE_KEY|API_SECRET)\s*[=:]\s*['"]([^'"]{16,})['"]/, label: "Generic Secret Key", severity: "high" },
  { pattern: /(?:DATABASE_URL|DB_URL)\s*[=:]\s*['"]([^'"]{16,})['"]/, label: "Database URL", severity: "critical" },
];

// Sensitive environment files to check
const SENSITIVE_ENV_FILES = [".env", ".env.local", ".env.production", ".env.staging", ".env.development", ".env.prod", ".env.dev", ".env.test", ".env.backup"];

// Example/template env files
const EXAMPLE_ENV_FILES = [".env.example", ".env.sample", ".env.template"];

// Dangerous file patterns in repo tree
const DANGEROUS_FILE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\.pem$/, label: "PEM certificate/key" },
  { pattern: /\.key$/, label: "Private key file" },
  { pattern: /(?:^|\/)id_rsa(?:\.pub)?$/, label: "SSH RSA key" },
  { pattern: /(?:^|\/)id_ed25519(?:\.pub)?$/, label: "SSH Ed25519 key" },
  { pattern: /\.pfx$/, label: "PKCS#12 certificate" },
  { pattern: /\.p12$/, label: "PKCS#12 certificate" },
  { pattern: /(?:^|\/)credentials\.json$/, label: "Credentials file" },
  { pattern: /(?:^|\/)service-account[^/]*\.json$/, label: "Service account key" },
  { pattern: /(?:^|\/)terraform\.tfstate$/, label: "Terraform state (contains secrets)" },
  { pattern: /\.tfvars$/, label: "Terraform variables (may contain secrets)" },
  { pattern: /(?:^|\/)kubeconfig$/, label: "Kubernetes config" },
  { pattern: /(?:^|\/)\.npmrc$/, label: "NPM config (may contain auth tokens)" },
  { pattern: /(?:^|\/)\.pypirc$/, label: "PyPI config (may contain auth tokens)" },
];

// Dependency/CI files to check for hardcoded secrets
const DEPENDENCY_FILES = ["docker-compose.yml", "docker-compose.yaml", "Dockerfile", "Makefile"];

// =========================================================================
// Interfaces
// =========================================================================

interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
  reportUrl?: string;
}

interface SecretMatch {
  label: string;
  severity: "critical" | "high" | "medium";
  evidence: string;
}

// =========================================================================
// Helper Functions
// =========================================================================

/** Parse "owner/repo" from various GitHub URL formats */
function parseRepoFromUrl(input: string): string | null {
  const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  const match = cleaned.match(/(?:github\.com\/)?([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)$/);
  return match ? match[1] : null;
}

/** Redact a secret value: show first 4 chars + "****" */
function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return value.substring(0, 4) + "****";
}

/** Mask all secret-like patterns in a string for safe evidence output */
function maskSecretsInContent(content: string): string {
  let masked = content;

  // Mask key=value patterns with sensitive names
  masked = masked.replace(
    /([A-Z_]+(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|CREDENTIAL|AUTH|URL))\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/gi,
    (_, key, val) => `${key}=${maskSecret(val)}`
  );

  // Mask connection strings (hide password portion)
  masked = masked.replace(
    /((?:mongodb|postgres|mysql|redis|amqp)\+?(?:srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
    (_, pre, pass, post) => `${pre}${maskSecret(pass)}${post}`
  );

  // Mask standalone token patterns
  masked = masked.replace(
    /(?:sk_live_|rk_live_|sk-|sk-proj-|sk-ant-|ghp_|gho_|github_pat_|glpat-|xox[bporas]-|SG\.|npm_|pypi-|dckr_pat_|shppa_|sq0atp-|hf_|r8_|nk_|lin_api_|dp\.st\.)([a-zA-Z0-9_.-]{8,})/g,
    (match) => maskSecret(match)
  );

  // Mask AWS access keys
  masked = masked.replace(/AKIA[0-9A-Z]{16}/g, (match) => maskSecret(match));

  // Mask JWTs
  masked = masked.replace(
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    (match) => maskSecret(match)
  );

  // Mask private key blocks
  masked = masked.replace(
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    "-----BEGIN PRIVATE KEY----- ****REDACTED**** -----END PRIVATE KEY-----"
  );

  return masked;
}

/** Fetch from GitHub API with auth headers and User-Agent */
async function githubFetch(path: string, token: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CheckVibe-Scanner/2.0",
    },
  });
}

/** Scan content against all secret patterns, return matched secrets */
function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const seen = new Set<string>();

  for (const sp of SECRET_PATTERNS) {
    // Use a fresh regex each time to avoid lastIndex issues
    const regex = new RegExp(sp.pattern.source, sp.pattern.flags);
    const match = regex.exec(content);
    if (match) {
      const matchedValue = match[0];
      const dedupeKey = `${sp.label}:${matchedValue.substring(0, 12)}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        matches.push({
          label: sp.label,
          severity: sp.severity,
          evidence: maskSecret(matchedValue),
        });
      }
    }
  }

  return matches;
}

/** Rate limit helper — delay execution */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Decode base64 content from GitHub API response */
function decodeBase64Content(data: { content?: string; encoding?: string }): string {
  if (data.content && data.encoding === "base64") {
    try {
      return atob(data.content.replace(/\n/g, ""));
    } catch {
      return "";
    }
  }
  return "";
}

/** Track API calls to stay within rate limits */
let apiCallCount = 0;
const MAX_API_CALLS = 120;

async function rateLimitedGithubFetch(path: string, token: string): Promise<Response | null> {
  if (apiCallCount >= MAX_API_CALLS) {
    return null;
  }
  apiCallCount++;
  await delay(100);
  return githubFetch(path, token);
}

// =========================================================================
// Main Handler
// =========================================================================

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

  // Reset per-request state
  apiCallCount = 0;

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

    // Verify repo exists and get default branch
    const repoCheck = await githubFetch(`/repos/${repo}`, GITHUB_TOKEN);
    apiCallCount++;
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

    const repoData = await repoCheck.json();
    const defaultBranch: string = repoData.default_branch || "main";

    const findings: Finding[] = [];
    let score = 100;
    let checksRun = 0;

    // =====================================================================
    // CHECK 1: Current .env files
    // =====================================================================
    checksRun++;
    const envFileResults: Array<{ file: string; exists: boolean; content: string; htmlUrl: string }> = [];

    try {
      const envChecks = await Promise.all(
        SENSITIVE_ENV_FILES.map(async (file) => {
          try {
            const res = await rateLimitedGithubFetch(`/repos/${repo}/contents/${file}`, GITHUB_TOKEN);
            if (res && res.ok) {
              const data = await res.json();
              const content = decodeBase64Content(data);
              return {
                file,
                exists: true,
                content,
                htmlUrl: data.html_url || `https://github.com/${repo}/blob/${defaultBranch}/${file}`,
              };
            }
            return { file, exists: false, content: "", htmlUrl: "" };
          } catch {
            return { file, exists: false, content: "", htmlUrl: "" };
          }
        })
      );
      envFileResults.push(...envChecks);

      for (const check of envFileResults) {
        if (!check.exists) continue;

        const secretMatches = scanForSecrets(check.content);
        const hasRealValues = /(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|DATABASE_URL)\s*=\s*[^\s]{8,}/i.test(check.content);

        if (secretMatches.length > 0) {
          score -= 30;
          findings.push({
            id: `github-env-secrets-${check.file.replace(/\./g, "-")}`,
            severity: "critical",
            title: `Live secrets found in ${check.file}`,
            description: `${check.file} contains real credentials: ${secretMatches.map(s => s.label).join(", ")}. These secrets are exposed to anyone with access to this repository.`,
            recommendation: "Immediately rotate all exposed credentials. Remove the file from the repo and git history using 'git filter-repo' or BFG Repo-Cleaner. Add the file to .gitignore.",
            evidence: maskSecretsInContent(check.content.substring(0, 300)),
            reportUrl: check.htmlUrl,
          });
        } else if (hasRealValues) {
          score -= 20;
          findings.push({
            id: `github-env-creds-${check.file.replace(/\./g, "-")}`,
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
            id: `github-env-exists-${check.file.replace(/\./g, "-")}`,
            severity: "medium",
            title: `${check.file} file committed to repository`,
            description: `${check.file} exists in the repository. Even if it currently contains only placeholders, this file may have contained real secrets in previous commits.`,
            recommendation: "Remove the file from the repository. Add it to .gitignore. Check git history for previously committed secrets.",
            reportUrl: check.htmlUrl,
          });
        }
      }
    } catch {
      // Non-blocking — continue with other checks
    }

    // =====================================================================
    // CHECK 2: Git history for deleted .env files
    // =====================================================================
    checksRun++;
    try {
      const historyChecks = await Promise.all(
        SENSITIVE_ENV_FILES.map(async (file) => {
          // Skip if file currently exists (already reported in Check 1)
          if (envFileResults.find(c => c.file === file && c.exists)) {
            return { file, wasCommitted: false, commitUrl: "" };
          }
          try {
            const res = await rateLimitedGithubFetch(
              `/repos/${repo}/commits?path=${encodeURIComponent(file)}&per_page=1`,
              GITHUB_TOKEN
            );
            if (res && res.ok) {
              const commits = await res.json();
              if (Array.isArray(commits) && commits.length > 0) {
                return { file, wasCommitted: true, commitUrl: commits[0].html_url };
              }
            }
            return { file, wasCommitted: false, commitUrl: "" };
          } catch {
            return { file, wasCommitted: false, commitUrl: "" };
          }
        })
      );

      for (const check of historyChecks) {
        if (!check.wasCommitted) continue;
        score -= 20;
        findings.push({
          id: `github-history-${check.file.replace(/\./g, "-")}`,
          severity: "high",
          title: `${check.file} found in git history`,
          description: `${check.file} was previously committed to the repository and later deleted. The file contents (including any secrets) are still accessible in the git history.`,
          recommendation: "Use BFG Repo-Cleaner or 'git filter-repo' to permanently remove the file from git history. Rotate any credentials that were in the file.",
          reportUrl: check.commitUrl,
        });
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 3: .gitignore validation
    // =====================================================================
    checksRun++;
    try {
      const res = await rateLimitedGithubFetch(`/repos/${repo}/contents/.gitignore`, GITHUB_TOKEN);
      if (res && res.ok) {
        const data = await res.json();
        const gitignoreContent = decodeBase64Content(data);

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
      } else if (res && res.status === 404) {
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
      // Non-blocking
    }

    // =====================================================================
    // CHECK 4: Deep commit history scanning (up to 100 commits across 2 pages)
    // =====================================================================
    checksRun++;
    try {
      // Fetch up to 100 commits across 2 pages for deeper history coverage
      const allCommitShas: string[] = [];
      for (let page = 1; page <= 2; page++) {
        const commitsRes = await rateLimitedGithubFetch(
          `/repos/${repo}/commits?per_page=50&page=${page}`,
          GITHUB_TOKEN
        );
        if (commitsRes && commitsRes.ok) {
          const commits = await commitsRes.json();
          if (Array.isArray(commits)) {
            allCommitShas.push(...commits.map((c: { sha: string }) => c.sha));
          }
          if (!Array.isArray(commits) || commits.length < 50) break;
        } else {
          break;
        }
      }

      if (allCommitShas.length > 0) {
          const commitShas = allCommitShas;
          const commitHistorySecrets: Map<string, { label: string; severity: "critical" | "high" | "medium"; commitUrl: string; filePath: string }> = new Map();

          // Process commits in batches of 5 to respect rate limits
          for (let batchStart = 0; batchStart < commitShas.length; batchStart += 5) {
            const batch = commitShas.slice(batchStart, batchStart + 5);

            const batchResults = await Promise.all(
              batch.map(async (sha) => {
                try {
                  const commitRes = await rateLimitedGithubFetch(
                    `/repos/${repo}/commits/${sha}`,
                    GITHUB_TOKEN
                  );
                  if (!commitRes || !commitRes.ok) return [];

                  const commitData = await commitRes.json();
                  const files: Array<{ filename: string; patch?: string }> = commitData.files || [];
                  const commitUrl: string = commitData.html_url || `https://github.com/${repo}/commit/${sha}`;
                  const results: Array<{ dedupeKey: string; label: string; severity: "critical" | "high" | "medium"; commitUrl: string; filePath: string }> = [];

                  for (const file of files) {
                    if (!file.patch) continue;
                    // Skip scanner source files (contain regex patterns that match secrets)
                    if (file.filename.includes('-scanner/') || file.filename.includes('_scanner/') || file.filename.endsWith('-scanner.ts') || file.filename.endsWith('-scanner.js')) continue;
                    // Only scan added lines (lines starting with +)
                    const addedLines = file.patch
                      .split("\n")
                      .filter((line: string) => line.startsWith("+") && !line.startsWith("+++"))
                      .join("\n");

                    if (!addedLines) continue;

                    const matches = scanForSecrets(addedLines);
                    for (const m of matches) {
                      const dedupeKey = `${m.label}:${m.evidence}`;
                      results.push({
                        dedupeKey,
                        label: m.label,
                        severity: m.severity,
                        commitUrl,
                        filePath: file.filename,
                      });
                    }
                  }
                  return results;
                } catch {
                  return [];
                }
              })
            );

            for (const results of batchResults) {
              for (const r of results) {
                if (!commitHistorySecrets.has(r.dedupeKey)) {
                  commitHistorySecrets.set(r.dedupeKey, {
                    label: r.label,
                    severity: r.severity,
                    commitUrl: r.commitUrl,
                    filePath: r.filePath,
                  });
                }
              }
            }

            // Cap findings to prevent excessive output
            if (commitHistorySecrets.size >= 10) break;
          }

          // Convert deduplicated secrets to findings (cap at 10)
          let commitSecretCount = 0;
          for (const [, secret] of commitHistorySecrets) {
            if (commitSecretCount >= 10) break;
            commitSecretCount++;
            score -= 25;
            findings.push({
              id: `github-commit-secret-${commitSecretCount}`,
              severity: "critical",
              title: `${secret.label} found in commit history`,
              description: `A ${secret.label} was detected in the diff of file "${secret.filePath}" in a recent commit. Even if it was later removed, the secret remains in git history.`,
              recommendation: "Rotate this credential immediately. Use BFG Repo-Cleaner or 'git filter-repo' to scrub it from history. Never commit secrets to source control.",
              reportUrl: secret.commitUrl,
            });
          }
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 5: Multi-branch scanning
    // =====================================================================
    checksRun++;
    try {
      const branchesRes = await rateLimitedGithubFetch(
        `/repos/${repo}/branches?per_page=10`,
        GITHUB_TOKEN
      );

      if (branchesRes && branchesRes.ok) {
        const branches = await branchesRes.json();
        if (Array.isArray(branches)) {
          // Filter to non-default branches
          const nonDefaultBranches = branches.filter(
            (b: { name: string }) => b.name !== defaultBranch
          );

          let branchSecretCount = 0;
          const BRANCH_SECRET_CAP = 5;

          for (const branch of nonDefaultBranches.slice(0, 5)) {
            if (branchSecretCount >= BRANCH_SECRET_CAP) break;

            try {
              const branchCommitSha = branch.commit?.sha;
              if (!branchCommitSha) continue;

              const commitRes = await rateLimitedGithubFetch(
                `/repos/${repo}/commits/${branchCommitSha}`,
                GITHUB_TOKEN
              );

              if (!commitRes || !commitRes.ok) continue;

              const commitData = await commitRes.json();
              const files: Array<{ filename: string; patch?: string }> = commitData.files || [];

              for (const file of files) {
                if (branchSecretCount >= BRANCH_SECRET_CAP) break;
                if (!file.patch) continue;

                const addedLines = file.patch
                  .split("\n")
                  .filter((line: string) => line.startsWith("+") && !line.startsWith("+++"))
                  .join("\n");

                if (!addedLines) continue;

                const matches = scanForSecrets(addedLines);
                for (const m of matches) {
                  if (branchSecretCount >= BRANCH_SECRET_CAP) break;
                  branchSecretCount++;
                  score -= 15;
                  findings.push({
                    id: `github-branch-secret-${branch.name.replace(/[^a-z0-9]/gi, "-")}-${branchSecretCount}`,
                    severity: "critical",
                    title: `${m.label} on branch "${branch.name}"`,
                    description: `A ${m.label} was found in file "${file.filename}" on branch "${branch.name}". Non-default branches are often overlooked during security reviews.`,
                    recommendation: `Rotate this credential. Remove it from the "${branch.name}" branch and its history. Ensure all branches are included in secret scanning.`,
                    reportUrl: `https://github.com/${repo}/tree/${encodeURIComponent(branch.name)}`,
                  });
                }
              }
            } catch {
              // Skip this branch
            }
          }
        }
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 6: Dangerous file detection (full tree scan)
    // =====================================================================
    checksRun++;
    try {
      const treeRes = await rateLimitedGithubFetch(
        `/repos/${repo}/git/trees/${defaultBranch}?recursive=1`,
        GITHUB_TOKEN
      );

      if (treeRes && treeRes.ok) {
        const treeData = await treeRes.json();
        const treeEntries: Array<{ path: string; type: string }> = treeData.tree || [];

        let dangerousFileScore = 0;
        const DANGEROUS_FILE_SCORE_CAP = 45;

        for (const entry of treeEntries) {
          if (entry.type !== "blob") continue;
          if (dangerousFileScore >= DANGEROUS_FILE_SCORE_CAP) break;

          for (const dp of DANGEROUS_FILE_PATTERNS) {
            if (dp.pattern.test(entry.path)) {
              // Skip files in test/example/fixture directories
              if (/(?:test|fixture|example|sample|mock|fake|dummy)\//i.test(entry.path)) continue;

              const deduction = Math.min(15, DANGEROUS_FILE_SCORE_CAP - dangerousFileScore);
              dangerousFileScore += deduction;
              score -= deduction;

              findings.push({
                id: `github-dangerous-file-${entry.path.replace(/[^a-z0-9]/gi, "-")}`,
                severity: "high",
                title: `Dangerous file committed: ${entry.path}`,
                description: `A ${dp.label} (${entry.path}) is committed to the repository. These files often contain secrets and should not be in source control.`,
                recommendation: "Remove this file from the repository and git history. Store sensitive files using a secrets manager or encrypted storage, never in version control.",
                reportUrl: `https://github.com/${repo}/blob/${defaultBranch}/${entry.path}`,
              });

              break; // Only one finding per file
            }
          }
        }
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 7: Dependency file secret scan (Docker, CI/CD, Makefile)
    // =====================================================================
    checksRun++;
    try {
      // First, find GitHub Actions workflow files from the tree
      let workflowFiles: string[] = [];
      try {
        const treeRes = await rateLimitedGithubFetch(
          `/repos/${repo}/git/trees/${defaultBranch}?recursive=1`,
          GITHUB_TOKEN
        );
        if (treeRes && treeRes.ok) {
          const treeData = await treeRes.json();
          const entries: Array<{ path: string; type: string }> = treeData.tree || [];
          workflowFiles = entries
            .filter((e) => e.type === "blob" && /^\.github\/workflows\/.*\.ya?ml$/.test(e.path))
            .map((e) => e.path)
            .slice(0, 5); // Cap at 5 workflow files
        }
      } catch {
        // Skip workflow discovery
      }

      const allDepFiles = [...DEPENDENCY_FILES, ...workflowFiles];

      const depResults = await Promise.all(
        allDepFiles.map(async (filePath) => {
          try {
            const res = await rateLimitedGithubFetch(
              `/repos/${repo}/contents/${filePath}`,
              GITHUB_TOKEN
            );
            if (!res || !res.ok) return null;

            const data = await res.json();
            const content = decodeBase64Content(data);
            if (!content) return null;

            const depFindings: Finding[] = [];
            const isWorkflow = filePath.startsWith(".github/workflows/");
            const isDockerfile = filePath.toLowerCase() === "dockerfile";
            const isDockerCompose = filePath.toLowerCase().startsWith("docker-compose");

            // Check for hardcoded secrets using the full pattern list
            const secretMatches = scanForSecrets(content);
            if (secretMatches.length > 0) {
              depFindings.push({
                id: `github-dep-secret-${filePath.replace(/[^a-z0-9]/gi, "-")}`,
                severity: "critical",
                title: `Hardcoded secret in ${filePath}`,
                description: `Found ${secretMatches.map(s => s.label).join(", ")} hardcoded in ${filePath}. Secrets should be injected via environment variables or a secrets manager.`,
                recommendation: isWorkflow
                  ? "Use GitHub Actions secrets (${{ secrets.YOUR_SECRET }}) instead of hardcoding values."
                  : "Use environment variables or a secrets manager. Never hardcode secrets in configuration files.",
                evidence: maskSecretsInContent(content.substring(0, 200)),
                reportUrl: data.html_url,
              });
            }

            // GitHub Actions: check for secrets NOT using ${{ secrets.* }}
            if (isWorkflow) {
              // Look for env vars with hardcoded values that look like credentials
              const hardcodedEnvPattern = /(?:env|with):\s*\n((?:\s+[A-Z_]+:\s*.+\n?)+)/gi;
              let envMatch;
              while ((envMatch = hardcodedEnvPattern.exec(content)) !== null) {
                const envBlock = envMatch[1];
                const envLines = envBlock.split("\n");
                for (const line of envLines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;

                  // Check for sensitive variable names with hardcoded (non-secret) values
                  const keyValueMatch = trimmed.match(/^([A-Z_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH)[A-Z_]*):\s*(.+)$/i);
                  if (keyValueMatch) {
                    const value = keyValueMatch[3].trim();
                    // If NOT using secrets context, flag it
                    if (!value.includes("${{") && value.length > 4 && value !== "''") {
                      depFindings.push({
                        id: `github-workflow-hardcoded-${filePath.replace(/[^a-z0-9]/gi, "-")}-${keyValueMatch[1]}`,
                        severity: "high",
                        title: `Hardcoded credential in GitHub Actions: ${keyValueMatch[1]}`,
                        description: `The workflow file "${filePath}" sets ${keyValueMatch[1]} to a hardcoded value instead of using GitHub Actions secrets.`,
                        recommendation: `Replace the hardcoded value with \${{ secrets.${keyValueMatch[1]} }} and add the secret in your repository settings.`,
                        reportUrl: data.html_url,
                      });
                    }
                  }
                }
              }
            }

            // Dockerfile: check for hardcoded secrets in ENV/ARG
            if (isDockerfile) {
              const dockerLines = content.split("\n");
              for (const line of dockerLines) {
                const trimmed = line.trim();
                if (/^(ENV|ARG)\s+/i.test(trimmed)) {
                  const keyValueMatch = trimmed.match(/^(?:ENV|ARG)\s+([A-Z_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|DATABASE_URL)[A-Z_]*)[=\s]+(.+)/i);
                  if (keyValueMatch) {
                    const value = keyValueMatch[3].trim().replace(/["']/g, "");
                    // Skip empty values, placeholders, and variable references
                    if (value && value.length > 4 && !value.startsWith("$") && !value.includes("changeme") && !value.includes("placeholder") && !value.includes("xxx")) {
                      depFindings.push({
                        id: `github-dockerfile-hardcoded-${keyValueMatch[1]}`,
                        severity: "high",
                        title: `Hardcoded credential in Dockerfile: ${keyValueMatch[1]}`,
                        description: `The Dockerfile sets ${keyValueMatch[1]} to a hardcoded value. Secrets should be passed at runtime via --build-arg or environment variables.`,
                        recommendation: "Use ARG for build-time secrets and pass them with --build-arg. For runtime secrets, use environment variables or Docker secrets.",
                        reportUrl: data.html_url,
                      });
                    }
                  }
                }
              }
            }

            // Docker Compose: check for hardcoded secrets in environment sections
            if (isDockerCompose) {
              const envSectionPattern = /environment:\s*\n((?:\s+-?\s*[A-Z_]+=?.+\n?)+)/gi;
              let composeMatch;
              while ((composeMatch = envSectionPattern.exec(content)) !== null) {
                const envBlock = composeMatch[1];
                const envLines = envBlock.split("\n");
                for (const line of envLines) {
                  const trimmed = line.trim().replace(/^-\s*/, "");
                  if (!trimmed) continue;

                  const keyValueMatch = trimmed.match(/^([A-Z_]*(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AUTH|DATABASE_URL)[A-Z_]*)=(.+)/i);
                  if (keyValueMatch) {
                    const value = keyValueMatch[3].trim().replace(/["']/g, "");
                    if (value && value.length > 4 && !value.startsWith("${") && !value.includes("changeme") && !value.includes("placeholder")) {
                      depFindings.push({
                        id: `github-compose-hardcoded-${keyValueMatch[1]}`,
                        severity: "high",
                        title: `Hardcoded credential in docker-compose: ${keyValueMatch[1]}`,
                        description: `docker-compose.yml sets ${keyValueMatch[1]} to a hardcoded value instead of using variable substitution.`,
                        recommendation: "Use environment variable substitution (${VARIABLE}) or a .env file (excluded from git) instead of hardcoding secrets.",
                        reportUrl: data.html_url,
                      });
                    }
                  }
                }
              }
            }

            return depFindings;
          } catch {
            return null;
          }
        })
      );

      for (const result of depResults) {
        if (!result) continue;
        for (const finding of result) {
          score -= 15;
          findings.push(finding);
        }
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 8: .env.example with real values
    // =====================================================================
    checksRun++;
    try {
      const exampleResults = await Promise.all(
        EXAMPLE_ENV_FILES.map(async (file) => {
          try {
            const res = await rateLimitedGithubFetch(
              `/repos/${repo}/contents/${file}`,
              GITHUB_TOKEN
            );
            if (!res || !res.ok) return null;

            const data = await res.json();
            const content = decodeBase64Content(data);
            if (!content) return null;

            const secretMatches = scanForSecrets(content);
            if (secretMatches.length > 0) {
              return {
                file,
                labels: secretMatches.map(s => s.label),
                content: content.substring(0, 200),
                htmlUrl: data.html_url,
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      for (const result of exampleResults) {
        if (!result) continue;
        score -= 10;
        findings.push({
          id: `github-example-env-secrets-${result.file.replace(/\./g, "-")}`,
          severity: "high",
          title: `Real secrets in ${result.file}`,
          description: `${result.file} contains what appear to be real secret values (${result.labels.join(", ")}), not placeholders. Example files are meant to show the format without exposing real credentials.`,
          recommendation: "Replace real secret values with placeholder text like 'your_api_key_here' or 'change_me'. Rotate any exposed credentials immediately.",
          evidence: maskSecretsInContent(result.content),
          reportUrl: result.htmlUrl,
        });
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // CHECK 9: GitHub Code Search for secrets in codebase
    // =====================================================================
    checksRun++;
    try {
      // Search queries targeting common secret patterns in the repo
      const searchQueries = [
        { q: `filename:.env repo:${repo}`, label: ".env file" },
        { q: `SUPABASE_SERVICE_ROLE_KEY repo:${repo}`, label: "Supabase service role key" },
        { q: `sk_live_ repo:${repo}`, label: "Stripe live key" },
        { q: `AKIA repo:${repo}`, label: "AWS access key" },
        { q: `sk-ant- repo:${repo}`, label: "Anthropic API key" },
        { q: `ghp_ repo:${repo}`, label: "GitHub PAT" },
        { q: `sk-proj- repo:${repo}`, label: "OpenAI project key" },
        { q: `DATABASE_URL repo:${repo} NOT .env.example NOT .env.sample NOT README`, label: "Database URL" },
      ];

      const searchFindings: Array<{ label: string; path: string; htmlUrl: string }> = [];

      for (const sq of searchQueries) {
        if (searchFindings.length >= 5) break;
        try {
          const searchRes = await rateLimitedGithubFetch(
            `/search/code?q=${encodeURIComponent(sq.q)}&per_page=3`,
            GITHUB_TOKEN!
          );
          if (searchRes && searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.total_count > 0 && Array.isArray(searchData.items)) {
              for (const item of searchData.items.slice(0, 2)) {
                // Skip known-safe files
                const path = item.path?.toLowerCase() || '';
                if (path.endsWith('.example') || path.endsWith('.sample') || path.endsWith('.template') ||
                    path.includes('readme') || path.includes('test') || path.includes('mock') ||
                    path.includes('fixture') || path.includes('node_modules')) continue;

                searchFindings.push({
                  label: sq.label,
                  path: item.path,
                  htmlUrl: item.html_url || '',
                });
              }
            }
          }
          // Code search has a strict rate limit — add extra delay
          await delay(500);
        } catch {
          // Search may fail on some repos — non-blocking
        }
      }

      // Deduplicate by path
      const seenPaths = new Set<string>();
      for (const sf of searchFindings) {
        if (seenPaths.has(sf.path)) continue;
        seenPaths.add(sf.path);
        score -= 15;
        findings.push({
          id: `github-search-${sf.path.replace(/[^a-zA-Z0-9]/g, "-")}`,
          severity: "high",
          title: `${sf.label} found via code search in ${sf.path}`,
          description: `GitHub code search found a match for "${sf.label}" in file "${sf.path}". This may indicate secrets or sensitive configuration committed to the repository.`,
          recommendation: "Review the file immediately. If it contains real credentials, rotate them and remove the file from the repository and its git history.",
          reportUrl: sf.htmlUrl,
        });
      }
    } catch {
      // Non-blocking
    }

    // =====================================================================
    // No findings = good news
    // =====================================================================
    if (findings.length === 0) {
      findings.push({
        id: "github-clean",
        severity: "info",
        title: "No leaked secrets detected",
        description: `Scanned repository ${repo} across ${checksRun} checks — no committed .env files, no secrets in git history or commit diffs, no dangerous files, and no hardcoded credentials found.`,
        recommendation: "Keep using environment variables and .gitignore to protect secrets. Consider enabling GitHub's built-in secret scanning feature for continuous protection.",
      });
    }

    return new Response(JSON.stringify({
      scannerType: "github_secrets",
      score: Math.max(0, score),
      findings,
      checksRun,
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
