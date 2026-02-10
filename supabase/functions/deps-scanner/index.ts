import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Dependency Vulnerability Scanner
 *
 * Fetches dependency manifest files from a user-provided GitHub repository,
 * parses them into (name, version, ecosystem) tuples, and batch-queries the
 * OSV.dev API for known vulnerabilities.
 *
 * Supported ecosystems:
 *   - npm        (package.json)
 *   - PyPI       (requirements.txt)
 *   - RubyGems   (Gemfile.lock)
 *   - Packagist  (composer.lock)
 *   - Go         (go.sum)
 *   - crates.io  (Cargo.lock)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const USER_AGENT = "CheckVibe-DepsScanner/1.0 (+https://checkvibe.dev)";
const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_BATCH_SIZE = 100;
const OSV_INTER_BATCH_DELAY_MS = 100;
const MAX_DEDUCTION = 80; // score never below 20 from deps alone

// Severity => point deduction
const SEVERITY_DEDUCTION: Record<string, number> = {
    CRITICAL: 20,
    HIGH: 15,
    MODERATE: 8,
    MEDIUM: 8,
    LOW: 3,
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

interface Dependency {
    name: string;
    version: string;
    ecosystem: string;
}

interface OsvVuln {
    id: string;
    summary?: string;
    details?: string;
    severity?: Array<{ type: string; score: string }>;
    database_specific?: { severity?: string };
    affected?: Array<{
        ranges?: Array<{
            type: string;
            events: Array<{ introduced?: string; fixed?: string }>;
        }>;
    }>;
}

interface OsvBatchResult {
    vulns?: OsvVuln[];
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

function parseRepoFromUrl(input: string): string | null {
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const match = cleaned.match(
        /(?:github\.com\/)?([a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+)$/,
    );
    return match ? match[1] : null;
}

async function githubFetch(path: string, token: string): Promise<Response> {
    return fetch(`https://api.github.com${path}`, {
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": USER_AGENT,
        },
    });
}

/**
 * Fetch a file from a GitHub repo via the Contents API.
 * Returns the decoded UTF-8 text, or null if the file does not exist / errors.
 */
async function fetchRepoFile(
    repo: string,
    filePath: string,
    token: string,
): Promise<string | null> {
    try {
        const res = await githubFetch(
            `/repos/${repo}/contents/${encodeURIComponent(filePath)}`,
            token,
        );
        if (!res.ok) return null;

        const data = await res.json();
        if (data.content && data.encoding === "base64") {
            try {
                return atob(data.content.replace(/\n/g, ""));
            } catch {
                return null;
            }
        }
        return null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Version cleaning
// ---------------------------------------------------------------------------

/**
 * Strip common semver prefixes and range operators.
 * For ranges like ">=1.0.0,<2.0.0", uses the lower bound.
 */
function cleanVersion(raw: string): string {
    let v = raw.trim();

    // Handle comma-separated constraints (pip, etc.): take the lower bound
    if (v.includes(",")) {
        const parts = v.split(",").map((p) => p.trim());
        // Prefer the one with >= or == or just a plain version
        const lower =
            parts.find((p) => /^[>=~^]*\d/.test(p)) || parts[0];
        v = lower;
    }

    // Strip prefix operators
    v = v.replace(/^[~^>=<!]+/, "").trim();

    // Strip leading "v"
    v = v.replace(/^v/i, "");

    // Strip trailing wildcards like ".*"
    v = v.replace(/\.\*$/, ".0");

    return v;
}

// ---------------------------------------------------------------------------
// Dependency file parsers
// ---------------------------------------------------------------------------

function parsePackageJson(content: string): Dependency[] {
    const deps: Dependency[] = [];
    try {
        const pkg = JSON.parse(content);
        const sections = [pkg.dependencies, pkg.devDependencies];
        for (const section of sections) {
            if (!section || typeof section !== "object") continue;
            for (const [name, rawVersion] of Object.entries(section)) {
                if (typeof rawVersion !== "string") continue;
                // Skip non-version specifiers (git URLs, file refs, etc.)
                if (
                    rawVersion.startsWith("git") ||
                    rawVersion.startsWith("http") ||
                    rawVersion.startsWith("file:") ||
                    rawVersion === "*" ||
                    rawVersion === "latest" ||
                    rawVersion === ""
                ) {
                    continue;
                }
                const version = cleanVersion(rawVersion);
                if (version && /^\d/.test(version)) {
                    deps.push({ name, version, ecosystem: "npm" });
                }
            }
        }
    } catch {
        // Invalid JSON — skip
    }
    return deps;
}

function parseRequirementsTxt(content: string): Dependency[] {
    const deps: Dependency[] = [];
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        // Skip comments, blank lines, -r includes, extras
        if (!line || line.startsWith("#") || line.startsWith("-")) continue;

        // Match: package==version  or  package>=version
        const match = line.match(
            /^([a-zA-Z0-9_.-]+)\s*(?:[=!><~]+)\s*([\d][^\s;#,]*)/,
        );
        if (match) {
            const version = cleanVersion(match[2]);
            if (version && /^\d/.test(version)) {
                deps.push({ name: match[1], version, ecosystem: "PyPI" });
            }
        }
    }
    return deps;
}

function parseGemfileLock(content: string): Dependency[] {
    const deps: Dependency[] = [];
    // Gemfile.lock has a GEM section with indented "    gem_name (version)" lines
    let inGemSection = false;
    let inSpecs = false;

    for (const rawLine of content.split("\n")) {
        const line = rawLine;
        if (/^GEM$/m.test(line.trim())) {
            inGemSection = true;
            inSpecs = false;
            continue;
        }
        if (inGemSection && /^\s+specs:/.test(line)) {
            inSpecs = true;
            continue;
        }
        // End of GEM section when we hit a non-indented line
        if (inGemSection && inSpecs && /^\S/.test(line)) {
            inGemSection = false;
            inSpecs = false;
            continue;
        }

        if (inGemSection && inSpecs) {
            // Lines look like "    gem_name (1.2.3)"
            const match = line.match(/^\s{4}([a-zA-Z0-9_.-]+)\s+\(([\d][^)]*)\)/);
            if (match) {
                deps.push({
                    name: match[1],
                    version: match[2],
                    ecosystem: "RubyGems",
                });
            }
        }
    }
    return deps;
}

function parseComposerLock(content: string): Dependency[] {
    const deps: Dependency[] = [];
    try {
        const lock = JSON.parse(content);
        const sections = [lock.packages, lock["packages-dev"]];
        for (const packages of sections) {
            if (!Array.isArray(packages)) continue;
            for (const pkg of packages) {
                if (pkg.name && pkg.version) {
                    const version = cleanVersion(String(pkg.version));
                    if (version && /^\d/.test(version)) {
                        deps.push({
                            name: pkg.name,
                            version,
                            ecosystem: "Packagist",
                        });
                    }
                }
            }
        }
    } catch {
        // Invalid JSON — skip
    }
    return deps;
}

function parseGoSum(content: string): Dependency[] {
    const seen = new Set<string>();
    const deps: Dependency[] = [];

    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;

        // Lines: module v1.2.3 h1:hash=  or  module v1.2.3/go.mod h1:hash=
        const match = line.match(/^(\S+)\s+v([\d][^\s/]*)/);
        if (match) {
            const key = `${match[1]}@${match[2]}`;
            if (!seen.has(key)) {
                seen.add(key);
                deps.push({
                    name: match[1],
                    version: match[2],
                    ecosystem: "Go",
                });
            }
        }
    }
    return deps;
}

function parseCargoLock(content: string): Dependency[] {
    const deps: Dependency[] = [];
    // Cargo.lock has [[package]] blocks with name = "..." and version = "..."
    const blocks = content.split("[[package]]");

    for (const block of blocks) {
        const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
        const versionMatch = block.match(/version\s*=\s*"([^"]+)"/);
        if (nameMatch && versionMatch) {
            deps.push({
                name: nameMatch[1],
                version: versionMatch[1],
                ecosystem: "crates.io",
            });
        }
    }
    return deps;
}

// ---------------------------------------------------------------------------
// OSV.dev querying
// ---------------------------------------------------------------------------

interface VulnInfo {
    id: string;
    summary: string;
    severity: "critical" | "high" | "medium" | "low";
    fixVersion: string | null;
}

interface PackageVulns {
    name: string;
    version: string;
    ecosystem: string;
    vulns: VulnInfo[];
}

function extractSeverity(
    vuln: OsvVuln,
): "critical" | "high" | "medium" | "low" {
    // Try database_specific.severity first
    const dbSeverity = vuln.database_specific?.severity?.toUpperCase();
    if (dbSeverity) {
        if (dbSeverity === "CRITICAL") return "critical";
        if (dbSeverity === "HIGH") return "high";
        if (dbSeverity === "MODERATE" || dbSeverity === "MEDIUM") return "medium";
        if (dbSeverity === "LOW") return "low";
    }

    // Try CVSS score from severity array
    if (vuln.severity && vuln.severity.length > 0) {
        const score = parseFloat(vuln.severity[0].score);
        if (!isNaN(score)) {
            if (score >= 9.0) return "critical";
            if (score >= 7.0) return "high";
            if (score >= 4.0) return "medium";
            return "low";
        }
        // Sometimes the score field is a CVSS vector string; try extracting from it
        const cvssMatch = vuln.severity[0].score.match(
            /CVSS:\d\.\d\/AV:\w\/AC:\w\/PR:\w\/UI:\w\/S:\w\/C:\w\/I:\w\/A:\w/,
        );
        if (cvssMatch) {
            // Fall back to high if we can't parse the vector
            return "high";
        }
    }

    // Default
    return "medium";
}

function extractFixVersion(vuln: OsvVuln): string | null {
    if (!vuln.affected || vuln.affected.length === 0) return null;
    for (const affected of vuln.affected) {
        if (!affected.ranges) continue;
        for (const range of affected.ranges) {
            if (!range.events) continue;
            for (const event of range.events) {
                if (event.fixed) return event.fixed;
            }
        }
    }
    return null;
}

/**
 * Query OSV.dev in batches of up to OSV_BATCH_SIZE.
 * Returns a map from "name@version@ecosystem" to list of vulnerability info.
 */
async function queryOsv(
    deps: Dependency[],
): Promise<Map<string, PackageVulns>> {
    const resultMap = new Map<string, PackageVulns>();

    // Initialize entries
    for (const dep of deps) {
        const key = `${dep.name}@${dep.version}@${dep.ecosystem}`;
        if (!resultMap.has(key)) {
            resultMap.set(key, {
                name: dep.name,
                version: dep.version,
                ecosystem: dep.ecosystem,
                vulns: [],
            });
        }
    }

    // Deduplicate queries
    const uniqueDeps: Dependency[] = [];
    const seen = new Set<string>();
    for (const dep of deps) {
        const key = `${dep.name}@${dep.version}@${dep.ecosystem}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDeps.push(dep);
        }
    }

    // Batch queries
    for (let i = 0; i < uniqueDeps.length; i += OSV_BATCH_SIZE) {
        const batch = uniqueDeps.slice(i, i + OSV_BATCH_SIZE);
        const queries = batch.map((dep) => ({
            package: { name: dep.name, ecosystem: dep.ecosystem },
            version: dep.version,
        }));

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            let response: Response;
            try {
                response = await fetch(OSV_BATCH_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": USER_AGENT,
                    },
                    body: JSON.stringify({ queries }),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeout);
            }

            if (!response.ok) {
                console.error(
                    `OSV.dev returned ${response.status}: ${await response.text()}`,
                );
                // Non-fatal: we'll return partial results
                continue;
            }

            const data = await response.json();
            const results: OsvBatchResult[] = data.results || [];

            for (let j = 0; j < batch.length && j < results.length; j++) {
                const dep = batch[j];
                const key = `${dep.name}@${dep.version}@${dep.ecosystem}`;
                const entry = resultMap.get(key);
                if (!entry) continue;

                const vulns = results[j].vulns || [];
                for (const vuln of vulns) {
                    entry.vulns.push({
                        id: vuln.id,
                        summary:
                            vuln.summary ||
                            vuln.details?.substring(0, 150) ||
                            "No description available",
                        severity: extractSeverity(vuln),
                        fixVersion: extractFixVersion(vuln),
                    });
                }
            }
        } catch (err) {
            console.error("OSV.dev batch query error:", err);
            // Continue with remaining batches
        }

        // Inter-batch delay
        if (i + OSV_BATCH_SIZE < uniqueDeps.length) {
            await new Promise((r) => setTimeout(r, OSV_INTER_BATCH_DELAY_MS));
        }
    }

    return resultMap;
}

// ---------------------------------------------------------------------------
// Findings builder
// ---------------------------------------------------------------------------

function mapSeverityToFindingSeverity(
    sev: string,
): "critical" | "high" | "medium" | "low" {
    switch (sev) {
        case "critical":
            return "critical";
        case "high":
            return "high";
        case "medium":
            return "medium";
        case "low":
            return "low";
        default:
            return "medium";
    }
}

function buildFindings(vulnMap: Map<string, PackageVulns>): {
    findings: Finding[];
    totalDeduction: number;
} {
    const findings: Finding[] = [];
    let totalDeduction = 0;

    for (const [, pkg] of vulnMap) {
        if (pkg.vulns.length === 0) continue;

        // Sort vulns by severity (critical first)
        const severityOrder: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
        };
        pkg.vulns.sort(
            (a, b) =>
                (severityOrder[a.severity] ?? 3) -
                (severityOrder[b.severity] ?? 3),
        );

        // Deduplicate by vuln ID
        const seenIds = new Set<string>();
        const uniqueVulns: VulnInfo[] = [];
        for (const v of pkg.vulns) {
            if (!seenIds.has(v.id)) {
                seenIds.add(v.id);
                uniqueVulns.push(v);
            }
        }

        // Calculate deduction for this package (sum of all vulns)
        let pkgDeduction = 0;
        for (const v of uniqueVulns) {
            const sevKey = v.severity.toUpperCase();
            pkgDeduction += SEVERITY_DEDUCTION[sevKey] || 8;
        }
        totalDeduction += pkgDeduction;

        // Worst severity for the finding card
        const worstSeverity = uniqueVulns[0].severity;

        // Show top 3 CVEs, mention extras
        const top3 = uniqueVulns.slice(0, 3);
        const extraCount = uniqueVulns.length - top3.length;

        const cveList = top3
            .map((v) => {
                const fix = v.fixVersion ? ` (fix: ${v.fixVersion})` : "";
                return `${v.id}: ${v.summary}${fix}`;
            })
            .join("\n  ");

        const extraNote =
            extraCount > 0 ? `\n  ...and ${extraCount} more` : "";

        // Build fix recommendation
        let recommendation: string;
        const fixVersions = uniqueVulns
            .map((v) => v.fixVersion)
            .filter((v): v is string => v !== null);
        if (fixVersions.length > 0) {
            // Use the highest fix version as the target
            const latestFix = fixVersions.sort().pop()!;
            recommendation = `Update ${pkg.name} to at least version ${latestFix}. Run your package manager's update/upgrade command.`;
        } else {
            recommendation = `Check for an updated version of ${pkg.name} that addresses these vulnerabilities. If no fix is available, consider using an alternative package.`;
        }

        findings.push({
            id: `deps-vuln-${pkg.ecosystem}-${pkg.name}`.replace(
                /[^a-z0-9_-]/gi,
                "-",
            ),
            severity: mapSeverityToFindingSeverity(worstSeverity),
            title: `${pkg.name}@${pkg.version} (${pkg.ecosystem}) -- ${uniqueVulns.length} known vulnerability${uniqueVulns.length > 1 ? "ies" : ""}`,
            description: `Known vulnerabilities in ${pkg.name} ${pkg.version}:\n  ${cveList}${extraNote}`,
            recommendation,
            evidence: `Ecosystem: ${pkg.ecosystem}, Installed: ${pkg.version}, Vulnerabilities: ${uniqueVulns.map((v) => v.id).join(", ")}`,
        });
    }

    // Cap deductions
    if (totalDeduction > MAX_DEDUCTION) {
        totalDeduction = MAX_DEDUCTION;
    }

    return { findings, totalDeduction };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
            },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
            },
        });
    }

    try {
        const body = await req.json();
        const targetUrl = body.targetUrl || "";
        const githubRepo = body.githubRepo;

        // ---------------------------------------------------------------
        // 1. No repo provided
        // ---------------------------------------------------------------
        if (!githubRepo || typeof githubRepo !== "string") {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun: 0,
                    findings: [
                        {
                            id: "deps-no-repo",
                            severity: "info",
                            title: "No GitHub repository provided",
                            description:
                                "Dependency vulnerability scanning requires a GitHub repository URL. Provide one to check your project's dependencies for known CVEs.",
                            recommendation:
                                "Add your GitHub repository URL when starting a scan to enable dependency vulnerability detection.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 2. Parse and validate repo
        // ---------------------------------------------------------------
        const repo = parseRepoFromUrl(githubRepo);
        if (!repo) {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun: 0,
                    findings: [
                        {
                            id: "deps-invalid-repo",
                            severity: "info",
                            title: "Invalid GitHub repository URL",
                            description: `Could not parse repository from: ${githubRepo}. Expected format: owner/repo or https://github.com/owner/repo`,
                            recommendation:
                                "Provide a valid GitHub repository URL.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 3. Validate GITHUB_TOKEN
        // ---------------------------------------------------------------
        if (!GITHUB_TOKEN) {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun: 0,
                    findings: [
                        {
                            id: "deps-no-token",
                            severity: "info",
                            title: "GitHub scanning not configured",
                            description:
                                "GITHUB_TOKEN environment variable is not set. Dependency scanning requires GitHub API access.",
                            recommendation:
                                "Configure a GitHub personal access token to enable dependency scanning.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 4. Verify repo exists
        // ---------------------------------------------------------------
        const repoCheck = await githubFetch(`/repos/${repo}`, GITHUB_TOKEN);
        if (!repoCheck.ok) {
            const status = repoCheck.status;
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun: 0,
                    findings: [
                        {
                            id: "deps-repo-not-found",
                            severity: "info",
                            title:
                                status === 404
                                    ? "Repository not found"
                                    : "Cannot access repository",
                            description:
                                status === 404
                                    ? `Repository ${repo} does not exist or is private.`
                                    : `GitHub API returned ${status} for ${repo}.`,
                            recommendation:
                                status === 404
                                    ? "Check the repository URL. Private repos require a token with repo scope."
                                    : "Check your GitHub token permissions.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 5. Fetch dependency files in parallel
        // ---------------------------------------------------------------
        const depFiles: Array<{
            file: string;
            parser: (content: string) => Dependency[];
        }> = [
            { file: "package.json", parser: parsePackageJson },
            { file: "requirements.txt", parser: parseRequirementsTxt },
            { file: "Gemfile.lock", parser: parseGemfileLock },
            { file: "composer.lock", parser: parseComposerLock },
            { file: "go.sum", parser: parseGoSum },
            { file: "Cargo.lock", parser: parseCargoLock },
        ];

        const fileResults = await Promise.all(
            depFiles.map(async ({ file, parser }) => {
                const content = await fetchRepoFile(repo, file, GITHUB_TOKEN!);
                return { file, content, parser };
            }),
        );

        let checksRun = depFiles.length; // One check per file fetch
        const allDeps: Dependency[] = [];
        const filesFound: string[] = [];

        for (const { file, content, parser } of fileResults) {
            if (content === null) continue;
            filesFound.push(file);
            const parsed = parser(content);
            allDeps.push(...parsed);
        }

        // ---------------------------------------------------------------
        // 6. No dependency files found
        // ---------------------------------------------------------------
        if (filesFound.length === 0) {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun,
                    findings: [
                        {
                            id: "deps-no-files",
                            severity: "info",
                            title: "No dependency files found",
                            description: `No supported dependency manifests were found in ${repo}. Checked: ${depFiles.map((d) => d.file).join(", ")}`,
                            recommendation:
                                "If your project uses dependencies, ensure the manifest file is committed to the root of the repository.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 7. No dependencies parsed (e.g. empty package.json)
        // ---------------------------------------------------------------
        if (allDeps.length === 0) {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 100,
                    checksRun,
                    findings: [
                        {
                            id: "deps-no-dependencies",
                            severity: "info",
                            title: "No dependencies found in manifest files",
                            description: `Found ${filesFound.join(", ")} but no parseable dependencies were extracted. The file(s) may be empty or use unsupported version formats.`,
                            recommendation:
                                "Verify that your dependency files contain valid version specifiers.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 8. Query OSV.dev
        // ---------------------------------------------------------------
        checksRun++; // OSV query counts as a check

        let vulnMap: Map<string, PackageVulns>;
        let osvError = false;

        try {
            vulnMap = await queryOsv(allDeps);
        } catch (err) {
            console.error("OSV.dev query failed:", err);
            osvError = true;
            vulnMap = new Map();
        }

        // If OSV failed entirely, return degraded result
        if (osvError) {
            return new Response(
                JSON.stringify({
                    scannerType: "dependencies",
                    score: 80,
                    checksRun,
                    findings: [
                        {
                            id: "deps-osv-unavailable",
                            severity: "medium",
                            title: "Could not check vulnerabilities",
                            description: `Found ${allDeps.length} dependencies in ${filesFound.join(", ")} but OSV.dev was unavailable to check for known vulnerabilities.`,
                            recommendation:
                                "Try scanning again later. You can also check your dependencies manually at https://osv.dev.",
                        },
                    ],
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                }),
                {
                    headers: {
                        ...getCorsHeaders(req),
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // ---------------------------------------------------------------
        // 9. Build findings from vulnerability results
        // ---------------------------------------------------------------
        const { findings, totalDeduction } = buildFindings(vulnMap);

        // If no vulnerabilities found, report clean
        if (findings.length === 0) {
            findings.push({
                id: "deps-clean",
                severity: "info",
                title: "No known vulnerabilities found in dependencies",
                description: `Scanned ${allDeps.length} dependencies from ${filesFound.join(", ")} in ${repo}. No known vulnerabilities were found in the OSV.dev database.`,
                recommendation:
                    "Keep your dependencies updated regularly. Consider using automated tools like Dependabot or Renovate for continuous vulnerability monitoring.",
            });
        }

        const score = Math.max(0, Math.min(100, 100 - totalDeduction));

        return new Response(
            JSON.stringify({
                scannerType: "dependencies",
                score,
                checksRun,
                findings,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
                repository: repo,
                dependenciesScanned: allDeps.length,
                filesAnalyzed: filesFound,
            }),
            {
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error) {
        console.error("Scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "dependencies",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: "",
            }),
            {
                headers: {
                    ...getCorsHeaders(req),
                    "Content-Type": "application/json",
                },
                status: 500,
            },
        );
    }
});
