import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * GitHub Secrets Scanner
 * Searches GitHub's code search API for leaked secrets, credentials,
 * and configuration files related to a target domain in public repositories.
 */

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
    reportUrl?: string;
    category?: string;
}

interface GitHubSearchItem {
    repository: { full_name: string };
    path: string;
    html_url: string;
    text_matches?: Array<{ fragment: string }>;
}

interface GitHubSearchResponse {
    total_count: number;
    items: GitHubSearchItem[];
}

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

/** Build the list of search queries for a given domain. Max 5 queries. */
function buildSearchQueries(domain: string): Array<{ query: string; label: string; type: "secret" | "credential" | "config" }> {
    return [
        {
            query: `${domain} filename:.env`,
            label: ".env files",
            type: "secret" as const,
        },
        {
            query: `${domain} password OR secret OR api_key OR apikey OR api-key`,
            label: "credential keywords",
            type: "credential" as const,
        },
        {
            query: `${domain} AWS_SECRET OR STRIPE_SK OR DATABASE_URL`,
            label: "common secret names",
            type: "secret" as const,
        },
        {
            query: `${domain} filename:docker-compose.yml`,
            label: "Docker configs",
            type: "config" as const,
        },
        {
            query: `${domain} filename:config extension:json OR extension:yaml`,
            label: "config files",
            type: "config" as const,
        },
    ];
}

/** Extract the domain from a URL (e.g., "https://example.com/path" -> "example.com") */
function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return url;
    }
}

/** Mask a potential secret value: show first 4 chars then asterisks */
function maskSecret(value: string): string {
    if (value.length <= 4) return "****";
    return value.substring(0, 4) + "****";
}

/** Truncate evidence string to a maximum length */
function truncateEvidence(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "...";
}

/**
 * Mask any values that look like secrets within a text fragment.
 * Looks for patterns like KEY=value, "key": "value", etc.
 */
function maskSecretsInFragment(fragment: string): string {
    // Mask key=value patterns (e.g., API_KEY=sk_live_abc123)
    let masked = fragment.replace(
        /([A-Z_a-z]+(?:key|secret|password|token|passwd|pwd|credential|auth)[A-Z_a-z]*)\s*[=:]\s*["']?([^\s"',}{]+)/gi,
        (_match, key: string, value: string) => `${key}=${maskSecret(value)}`
    );
    // Mask connection strings
    masked = masked.replace(
        /((?:postgres|mysql|redis|mongodb)(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi,
        (_match, prefix: string, _password: string, suffix: string) => `${prefix}****${suffix}`
    );
    // Mask standalone long hex/base64 strings that look like keys (32+ chars)
    masked = masked.replace(
        /\b([a-zA-Z0-9_-]{4})[a-zA-Z0-9_-]{28,}\b/g,
        (_match, prefix: string) => `${prefix}****`
    );
    return masked;
}

/** Sleep for the given number of milliseconds */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Execute a single GitHub code search query */
async function searchGitHub(query: string): Promise<GitHubSearchResponse | null> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.github.com/search/code?q=${encodedQuery}&per_page=10`;

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.text-match+json",
                "User-Agent": "CheckVibe-Scanner/1.0",
            },
        });

        if (!response.ok) {
            console.error(`GitHub API error: ${response.status} ${response.statusText}`);
            // If rate limited, return null gracefully
            if (response.status === 403 || response.status === 429) {
                console.error("GitHub API rate limit hit");
                return null;
            }
            return null;
        }

        return await response.json() as GitHubSearchResponse;
    } catch (error) {
        console.error(`GitHub search failed for query "${query}":`, error);
        return null;
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
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
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            });
        }
        const targetUrl = validation.url!;
        const domain = extractDomain(targetUrl);

        // If no GitHub token configured, return an info result
        if (!GITHUB_TOKEN) {
            return new Response(
                JSON.stringify({
                    scannerType: "github-secrets",
                    score: 100,
                    checksRun: 0,
                    findings: [
                        {
                            id: "github-not-configured",
                            severity: "info",
                            title: "GitHub scanning not configured",
                            description:
                                "No GITHUB_TOKEN environment variable is set. GitHub code search for leaked secrets is unavailable.",
                            recommendation:
                                "Configure a GITHUB_TOKEN with code search permissions to enable GitHub secret scanning.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                }
            );
        }

        const queries = buildSearchQueries(domain);
        const findings: Finding[] = [];
        const seenFiles = new Set<string>(); // Deduplicate by repo+path
        let checksRun = 0;
        let score = 100;

        // Run searches sequentially with 1-second delay between calls to respect rate limits
        for (const { query, label, type } of queries) {
            checksRun++;
            const result = await searchGitHub(query);

            if (result && result.total_count > 0) {
                for (const item of result.items) {
                    const fileKey = `${item.repository.full_name}:${item.path}`;

                    // Skip duplicates
                    if (seenFiles.has(fileKey)) continue;
                    seenFiles.add(fileKey);

                    // Build evidence from text matches
                    let evidence = "";
                    if (item.text_matches && item.text_matches.length > 0) {
                        const rawFragment = item.text_matches
                            .map((tm) => tm.fragment)
                            .join(" | ");
                        evidence = truncateEvidence(maskSecretsInFragment(rawFragment));
                    }

                    // Classify the finding severity based on the search type
                    if (type === "secret") {
                        // .env files and common secret names => critical
                        findings.push({
                            id: `github-secret-${findings.length}`,
                            severity: "critical",
                            title: "Leaked credential in public repository",
                            description: `Found potential secret in repo ${item.repository.full_name} at path ${item.path} (matched: ${label}).`,
                            recommendation:
                                "Immediately rotate all credentials found in this file. Remove the file from the repository, and use GitHub's secret scanning alerts to prevent future leaks. Consider using .gitignore and environment variable injection at deploy time.",
                            evidence: evidence || `File: ${item.path}`,
                            reportUrl: item.html_url,
                            category: "credentials",
                        });
                        score -= 25;
                    } else if (type === "credential") {
                        // Generic credential keyword matches => high
                        findings.push({
                            id: `github-credential-${findings.length}`,
                            severity: "high",
                            title: "Potential credential reference in public repository",
                            description: `Found credential-related keywords alongside domain "${domain}" in repo ${item.repository.full_name} at path ${item.path} (matched: ${label}).`,
                            recommendation:
                                "Review this file for any exposed secrets or credentials. If real credentials are present, rotate them immediately and remove the file from version control.",
                            evidence: evidence || `File: ${item.path}`,
                            reportUrl: item.html_url,
                            category: "credentials",
                        });
                        score -= 15;
                    } else if (type === "config") {
                        // Config files referencing the domain => medium
                        findings.push({
                            id: `github-config-${findings.length}`,
                            severity: "medium",
                            title: "Configuration file referencing domain found in public repository",
                            description: `Found a configuration file referencing "${domain}" in repo ${item.repository.full_name} at path ${item.path} (matched: ${label}). This could leak infrastructure details.`,
                            recommendation:
                                "Review this configuration file for any sensitive information. Consider making the repository private if it contains internal infrastructure details.",
                            evidence: evidence || `File: ${item.path}`,
                            reportUrl: item.html_url,
                            category: "infrastructure",
                        });
                        score -= 5;
                    }
                }
            }

            // Rate limit: wait 1 second between API calls (skip after last query)
            if (checksRun < queries.length) {
                await sleep(1000);
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        // If nothing found, add an info finding
        if (findings.length === 0) {
            findings.push({
                id: "github-no-leaks",
                severity: "info",
                title: "No leaked secrets found on GitHub",
                description: `Searched ${checksRun} query patterns on GitHub code search for domain "${domain}" and found no leaked secrets or credentials in public repositories.`,
                recommendation:
                    "Continue monitoring for leaked credentials. Consider enabling GitHub secret scanning and push protection on your own repositories.",
            });
        }

        return new Response(
            JSON.stringify({
                scannerType: "github-secrets",
                score,
                checksRun,
                findings,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            }),
            {
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "github-secrets",
                score: 0,
                error: "Scan failed.",
                findings: [],
                metadata: {},
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            }
        );
    }
});
