# Implementation Plan — CheckVibe Product Improvements v7

## Status
- [x] Planning
- [ ] In Progress
- [ ] Complete

## Overview

7 fixes across edge functions (backend) and dashboard (frontend), ordered by priority. Each fix is independent and can be deployed separately.

---

## Fix 1: Key Prefix Allowlist (Kill False Positives)

### [MODIFY] `supabase/functions/api-key-scanner/index.ts`

**Problem:** The scanner flags Stripe publishable keys (`pk_live_*`, `pk_test_*`), Supabase anon keys (`eyJ...` with role=anon), Google Analytics IDs (`G-*`), and other designed-to-be-public keys as CRITICAL leaked secrets.

**Changes:**

1. Add a `PUBLIC_KEY_PATTERNS` allowlist array right after the existing `API_KEY_PATTERNS` array (after line 124):

```typescript
const PUBLIC_KEY_PATTERNS: Array<{
    name: string;
    pattern: RegExp;
    note: string;
}> = [
    // Stripe publishable keys (designed for client-side)
    { name: 'Stripe Publishable Key', pattern: /pk_(?:live|test)_[a-zA-Z0-9]{24,}/g, note: 'Stripe publishable keys are safe to expose in client-side code.' },

    // Supabase anon/publishable key (public by design)
    { name: 'Supabase Anon Key', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, note: 'Supabase anon keys are designed for client-side use with RLS.' },
    // This one needs an additional check: decode JWT, confirm role === "anon"

    // Google Analytics Measurement ID
    { name: 'Google Analytics ID', pattern: /\bG-[A-Z0-9]{6,12}\b/g, note: 'Google Analytics measurement IDs are public tracking identifiers.' },

    // Google AdSense Publisher ID
    { name: 'Google AdSense ID', pattern: /\bca-pub-\d{10,16}\b/g, note: 'AdSense publisher IDs are public by design.' },

    // Google Maps API Key (often restricted by referrer, low risk)
    { name: 'Google Maps API Key', pattern: /AIzaSy[0-9A-Za-z-_]{33}/g, note: 'Google Maps API keys are commonly used client-side with HTTP referrer restrictions. Verify domain restrictions are set in Google Cloud Console.' },

    // Firebase client config keys
    { name: 'Firebase Config Key', pattern: /(?:apiKey|FIREBASE_API_KEY)\s*[:=]\s*['"](AIza[0-9A-Za-z-_]{35})['"]/gi, note: 'Firebase API keys are designed for client-side use. They are not secrets — Firebase Security Rules provide access control.' },

    // Supabase URL pattern (not a secret)
    { name: 'Supabase Project URL', pattern: /https:\/\/[a-z0-9]+\.supabase\.co/g, note: 'Supabase project URLs are public identifiers, not secrets.' },

    // Publishable API keys with explicit "publishable" prefix
    { name: 'Publishable Key', pattern: /(?:pk|pub|publishable)[_-][a-zA-Z0-9_-]{16,}/gi, note: 'This appears to be a publishable/public key intended for client-side use.' },

    // Recaptcha site key (public by design)
    { name: 'reCAPTCHA Site Key', pattern: /\b6L[a-zA-Z0-9_-]{38}\b/g, note: 'reCAPTCHA site keys are designed to be public.' },
];
```

2. Add a helper function `isPublicKey(match: string, patterns: typeof PUBLIC_KEY_PATTERNS)` that checks if a matched string is a known public key format. For the Supabase case, decode the JWT payload and check `role === "anon"`.

3. In the main scanning loop (where `API_KEY_PATTERNS` are matched against page content), before creating a finding, call `isPublicKey()`. If it returns a match:
   - Change severity from `critical` → `info`
   - Prepend the finding title with "Public Key: "
   - Set description to the `note` from the allowlist
   - Set recommendation to "No action required. This is a publishable key intended for client-side use."

4. Special handling for `Google API Key` pattern (`AIza...`): Currently flagged as `critical` at line 42. Check if it matches the Firebase config pattern or is near `maps` / `analytics` context. If so, downgrade to `info`. If standalone and no context clues, downgrade to `low` (not critical) with recommendation to verify domain restrictions.

5. Special handling for Supabase JWT (`eyJ...`): The existing pattern at line 58 already has `additionalCheck: (match) => match.includes('service_role')`. This means it only flags service_role tokens. **Keep this behavior** — but also add a separate check: if a JWT is found with `role: "anon"`, emit an `info` finding: "Supabase anon key detected (public by design)."

**Score impact:** Public keys should not deduct from the scanner score. Only add `info` findings (0 deduction).

---

## Fix 2: Separate Info/Passing Checks from Real Issues

### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

**Problem:** The overview card shows issue count correctly (excludes info), but there's no visibility into how many "all clear" checks passed. Users see "12 issues" but don't know there were 27 passing checks — which would build trust.

**Changes to `processAuditData()` (line 39-77):**

1. Add `passingCheckCount` to the return type and computation:
```typescript
// After the existing forEach that counts totalFindings:
let passingCheckCount = 0;
Object.values(results).forEach((result: any) => {
    if (result.findings && Array.isArray(result.findings)) {
        result.findings.forEach((f: any) => {
            if (f.severity?.toLowerCase() === 'info') passingCheckCount++;
        });
    }
});
```

2. Update `AuditReportData` interface (line 27) to include `passingCheckCount: number`.

3. In the overview card JSX (line 94), change the "issues" label:
```tsx
<span className="text-xs text-zinc-500 mt-1">
    {issueCount === 1 ? 'issue' : 'issues'}
</span>
// Add below:
{passingCheckCount > 0 && (
    <span className="text-xs text-emerald-500/70 mt-0.5">
        + {passingCheckCount} passing checks
    </span>
)}
```

### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

**Changes to each scanner's finding list rendering:**

In the accordion content area where findings are rendered, split findings into two groups:
- `actionableFindings` = findings with severity !== 'info'
- `passingChecks` = findings with severity === 'info'

Render actionable findings as-is (current behavior). After them, if `passingChecks.length > 0`, render a collapsible "Passing Checks" section:

```tsx
{passingChecks.length > 0 && (
    <details className="mt-4 pt-3 border-t border-white/5">
        <summary className="cursor-pointer text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            {passingChecks.length} passing check{passingChecks.length !== 1 ? 's' : ''}
        </summary>
        <div className="mt-2 space-y-2">
            {passingChecks.map((f, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs text-zinc-500 bg-zinc-900/30 rounded">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500/50 mt-0.5 shrink-0" />
                    <span>{f.title}</span>
                </div>
            ))}
        </div>
    </details>
)}
```

### [MODIFY] `dashboard/src/lib/export-markdown.ts`

**Changes to `generateScanMarkdown()` (line 95):**

1. In the "Issues Found" header (line 127), change to:
```
## Issues Found: ${totalIssueCount} actionable (${infoCount} passing checks)
```

2. In the per-scanner detail section (line 226), render info findings under a "### Passing Checks" sub-header instead of mixed in with real issues.

---

## Fix 3: RLS Role-Aware Analysis

### [MODIFY] `supabase/functions/supabase-mgmt-scanner/index.ts`

**Problem:** `checkPermissivePolicies()` (line 143-169) queries `pg_policies` for rows where `qual IS NULL OR qual::text = 'true'` but doesn't check the `roles` column. service_role policies with `true` are expected/correct.

**Changes to `checkPermissivePolicies()` function:**

1. Update the SQL query (line 145-149) to also select the `roles` column:
```sql
SELECT schemaname, tablename, policyname, permissive, cmd, qual,
       roles
FROM pg_policies
WHERE schemaname = 'public'
AND (qual IS NULL OR qual::text = 'true' OR qual::text = '(true)');
```

2. After fetching results, partition them into three categories:
```typescript
const serviceRolePolicies = data.filter((r: any) => {
    const roles = r.roles;
    // roles is a text[] like {service_role} or {authenticated,anon}
    if (!roles) return false;
    const rolesStr = typeof roles === 'string' ? roles : JSON.stringify(roles);
    return rolesStr.includes('service_role') && !rolesStr.includes('authenticated') && !rolesStr.includes('anon');
});

const anonWritePolicies = data.filter((r: any) => {
    const rolesStr = typeof r.roles === 'string' ? r.roles : JSON.stringify(r.roles || '');
    const isWrite = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes((r.cmd || '').toUpperCase());
    return rolesStr.includes('anon') && isWrite;
});

const otherPermissive = data.filter((r: any) =>
    !serviceRolePolicies.includes(r) && !anonWritePolicies.includes(r)
);
```

3. Generate findings per category:

- **`serviceRolePolicies`**: Emit a single `info` finding:
  ```
  id: "mgmt-policies-service-role"
  severity: "info"
  title: "${serviceRolePolicies.length} service_role policies use 'true' (expected)"
  description: "Service role policies are expected to use 'true' as the condition because the backend authenticates via the service_role key and needs full access."
  recommendation: "No action needed. These policies are correctly configured for backend operations."
  ```
  Deduction: 0

- **`anonWritePolicies`**: Emit a `critical` finding per policy:
  ```
  id: "mgmt-policy-anon-write-{tablename}"
  severity: "critical"
  title: "Unauthenticated write access on {tablename}"
  description: "The policy '{policyname}' allows anonymous users to {cmd} all rows in {tablename} without restrictions."
  recommendation: "Replace the 'true' condition with proper auth checks, or restrict to authenticated users only."
  ```
  Deduction: 15 per policy

- **`otherPermissive`** (authenticated with true): Keep existing behavior — `high` severity, 10 deduction per policy.

4. Update the deduction calculation to reflect the three categories.

---

## Fix 4: Top 5 Actions Summary

### [NEW] `dashboard/src/components/dashboard/recommended-actions.tsx`

Create a new component that takes `AuditReportData` and renders a prioritized action list.

**Logic to pick top 5:**
```typescript
function getTopActions(data: AuditReportData): Action[] {
    const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

    // Collect all non-info findings with their scanner key
    const allActionable: Array<{ finding: any; scannerKey: string }> = [];
    for (const [key, result] of Object.entries(data.scannerResults)) {
        if (!result.findings) continue;
        for (const f of result.findings) {
            if (f.severity === 'info') continue;
            allActionable.push({ finding: f, scannerKey: key });
        }
    }
    // Also include tech stack CVEs
    for (const f of data.techStackCveFindings) {
        allActionable.push({ finding: f, scannerKey: 'tech_stack' });
    }

    // Sort by severity, then by scanner weight (higher weight = more important)
    allActionable.sort((a, b) => {
        const sevDiff = (SEVERITY_ORDER[a.finding.severity] ?? 4) - (SEVERITY_ORDER[b.finding.severity] ?? 4);
        if (sevDiff !== 0) return sevDiff;
        return 0; // Stable sort preserves scanner order
    });

    return allActionable.slice(0, 5).map(({ finding, scannerKey }) => ({
        severity: finding.severity,
        title: finding.title,
        recommendation: finding.recommendation || 'Review and remediate this finding.',
        scannerKey,
        scannerName: scannerNames[scannerKey] || scannerKey,
    }));
}
```

**JSX:**
```tsx
<Card className="bg-zinc-900/40 border-white/5 mb-8">
    <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-white text-base">Recommended Actions</CardTitle>
        </div>
    </CardHeader>
    <CardContent>
        <ol className="space-y-3">
            {actions.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="text-sm font-mono text-zinc-500 mt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <SeverityDot severity={action.severity} />
                            <span className="text-sm font-medium text-white">{action.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{action.recommendation}</p>
                        <span className="text-xs text-zinc-600">— {action.scannerName}</span>
                    </div>
                </li>
            ))}
        </ol>
    </CardContent>
</Card>
```

### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

Insert `<RecommendedActions data={data} />` as the FIRST child inside the fragment (before the Findings Overview card, line 89). Only render if `issueCount > 0`.

### [MODIFY] `dashboard/src/lib/export-markdown.ts`

Add a "## Recommended Actions (Priority Order)" section right after the severity summary table (after line 148). Use the same top-5 picking logic. Format:

```markdown
## Recommended Actions (Priority Order)

1. 🔴 **Rotate leaked Supabase Service Key** — GitHub Security Alerts
   Fix: Rotate the key immediately and remove from repository history.
2. 🟠 **Fix 3 clear-text logging issues** — GitHub Security Alerts
   Fix: Use structured logging with secret masking.
...
```

---

## Fix 5: Scan Diffing Between Runs

### [NEW] `dashboard/src/lib/scan-diff.ts`

Create a utility that compares two scans' findings:

```typescript
interface ScanDiff {
    newIssues: DiffFinding[];        // In current but not previous
    resolvedIssues: DiffFinding[];   // In previous but not current
    unchangedIssues: DiffFinding[];  // In both
}

interface DiffFinding {
    finding: any;
    scannerKey: string;
}

export function computeScanDiff(
    currentResults: Record<string, any>,
    previousResults: Record<string, any>
): ScanDiff {
    // Build fingerprints for each finding:
    // fingerprint = `${scannerKey}::${finding.id || finding.title}::${finding.severity}`
    // This handles findings that have stable IDs (most do) plus title-based fallback

    const currentFingerprints = new Map<string, DiffFinding>();
    const previousFingerprints = new Map<string, DiffFinding>();

    for (const [key, result] of Object.entries(currentResults)) {
        if (!result?.findings) continue;
        for (const f of result.findings) {
            if (f.severity === 'info') continue;
            const fp = `${key}::${f.id || f.title}::${f.severity}`;
            currentFingerprints.set(fp, { finding: f, scannerKey: key });
        }
    }

    for (const [key, result] of Object.entries(previousResults)) {
        if (!result?.findings) continue;
        for (const f of result.findings) {
            if (f.severity === 'info') continue;
            const fp = `${key}::${f.id || f.title}::${f.severity}`;
            previousFingerprints.set(fp, { finding: f, scannerKey: key });
        }
    }

    const newIssues: DiffFinding[] = [];
    const resolvedIssues: DiffFinding[] = [];
    const unchangedIssues: DiffFinding[] = [];

    for (const [fp, df] of currentFingerprints) {
        if (previousFingerprints.has(fp)) unchangedIssues.push(df);
        else newIssues.push(df);
    }
    for (const [fp, df] of previousFingerprints) {
        if (!currentFingerprints.has(fp)) resolvedIssues.push(df);
    }

    return { newIssues, resolvedIssues, unchangedIssues };
}
```

### [NEW] `dashboard/src/components/dashboard/scan-diff-banner.tsx`

A banner component that shows the diff summary:

```tsx
interface ScanDiffBannerProps {
    diff: ScanDiff;
    previousScanDate: string;
}

// Renders:
// ┌─────────────────────────────────────────────────────┐
// │ Since last scan (Feb 12, 2026):                     │
// │ ✅ 5 issues resolved  ⚠️ 2 new issues  ─ 7 unchanged │
// └─────────────────────────────────────────────────────┘
```

Use emerald for resolved, red for new, zinc for unchanged. Make it a Card with flex row layout.

### [MODIFY] `dashboard/src/app/dashboard/projects/[id]/page.tsx`

1. After fetching the latest completed scan, also fetch the **second most recent** completed scan for the same project:
```typescript
const { data: previousScans } = await supabase
    .from('scans')
    .select('id, results, completed_at')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .range(1, 1);  // Skip first (current), get second

const previousScan = previousScans?.[0] || null;
```

2. If both current and previous scans exist, compute the diff:
```typescript
const diff = previousScan
    ? computeScanDiff(latestScan.results, previousScan.results)
    : null;
```

3. Pass `diff` and `previousScan.completed_at` to the `AuditReport` component as optional props.

### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

1. Add optional `diff` and `previousScanDate` props to `AuditReportProps`.
2. If `diff` is provided, render `<ScanDiffBanner diff={diff} previousScanDate={previousScanDate} />` between the Findings Overview card and the Detected Stack section.

### [MODIFY] `dashboard/src/lib/export-markdown.ts`

If diff data is available (passed as optional param to `generateScanMarkdown`), add a "## Changes Since Last Scan" section after the severity summary:

```markdown
## Changes Since Last Scan (Feb 12, 2026)

- ✅ **5 issues resolved**
- ⚠️ **2 new issues detected**
- **7 issues unchanged**

### New Issues
1. 🔴 Missing HSTS header — Security Scanner
2. 🟠 Open redirect on /login — Open Redirect

### Resolved Issues
1. 🔴 Leaked service_role key — GitHub Security Alerts
...
```

---

## Fix 6: Dependency Version Confidence

### [MODIFY] `supabase/functions/deps-scanner/index.ts`

**Problem:** The scanner reads `package.json` (which has version ranges like `^4.30.0`) and reports the minimum version from the range as the actual installed version. This leads to stale version reports (e.g., reporting 4.30.0 when 4.57.6 is actually installed).

**Changes:**

1. Add a `confidence` field to the internal `Dependency` interface:
```typescript
interface Dependency {
    name: string;
    version: string;
    ecosystem: string;
    confidence: 'high' | 'medium' | 'low';
}
```

2. In each parser function, set confidence based on the source:
   - `package-lock.json` / `Gemfile.lock` / `composer.lock` / `Cargo.lock` → `confidence: 'high'` (exact pinned versions)
   - `requirements.txt` with `==` operator → `confidence: 'high'`
   - `requirements.txt` with `>=` or `~=` → `confidence: 'low'`
   - `package.json` dependencies (semver range) → `confidence: 'low'`
   - `go.sum` → `confidence: 'high'` (exact hashes)

3. Prioritize lockfiles over manifests:
   - In `parseNpmDeps()`, attempt `package-lock.json` first. If found, use it and set `confidence: 'high'`. Only fall back to `package.json` (with `confidence: 'low'`) if no lockfile exists.
   - Currently (line 168-196), the scanner already tries `package.json`. Add a preceding attempt for `package-lock.json`.

4. In the finding output, include confidence in the description when it's `low`:
```typescript
if (dep.confidence === 'low') {
    finding.description += ` (Version ${dep.version} detected from manifest — actual installed version may differ. Verify with lockfile.)`;
}
```

5. In the overall scanner summary finding, if >50% of deps have `confidence: 'low'`, add a warning finding:
```typescript
{
    id: "deps-confidence-warning",
    severity: "info",
    title: "Version detection based on manifests, not lockfiles",
    description: "No lockfile (package-lock.json, yarn.lock, etc.) was found. Versions were inferred from version ranges in the manifest. Actual installed versions may be newer.",
    recommendation: "Commit your lockfile to the repository for accurate vulnerability scanning."
}
```

---

## Fix 7: Source Attribution on Findings

### [MODIFY] `supabase/functions/github-security-scanner/index.ts`

**Problem:** Dependabot, CodeQL, and Secret Scanning are GitHub's free built-in tools. The findings appear as if CheckVibe found them, reducing perceived value-add.

**Changes:**

1. Add a `source` field to every finding emitted by this scanner. In each of the three sub-functions:

   - `fetchDependabotAlerts()`: Add `source: "GitHub Dependabot (free)"` to every finding
   - `fetchCodeScanningAlerts()`: Add `source: "GitHub CodeQL (free)"` to every finding
   - `fetchSecretScanningAlerts()`: Add `source: "GitHub Secret Scanning (free)"` to every finding

2. This is a simple change: in each `findings.push({...})` call, add the `source` field:
   ```typescript
   findings.push({
       id: `gh-sec-dependabot-${alert.number}`,
       severity: sev,
       title: `...`,
       description: `...`,
       recommendation: `...`,
       source: "GitHub Dependabot (free)",  // ← ADD THIS
   });
   ```

### [MODIFY] Other edge function scanners

For ALL other scanners (api-key, supabase, supabase-mgmt, cors, csrf, etc.), add `source: "CheckVibe"` to every finding they emit. This creates a clear contrast.

**Scanners to update (add `source: "CheckVibe"` to all findings.push calls):**
- `api-key-scanner/index.ts`
- `supabase-scanner/index.ts`
- `supabase-mgmt-scanner/index.ts`
- `security-headers-scanner/index.ts`
- `cors-scanner/index.ts`
- `csrf-scanner/index.ts`
- `cookie-scanner/index.ts`
- `auth-scanner/index.ts`
- `sqli-scanner/index.ts`
- `xss-scanner/index.ts`
- `redirect-scanner/index.ts`
- `ssl-scanner/index.ts`
- `dns-scanner/index.ts`
- `deps-scanner/index.ts`
- `threat-scanner/index.ts`
- `legal-scanner/index.ts`
- `tech-scanner/index.ts`
- `vibe-scanner/index.ts`
- `vercel-scanner/index.ts`
- `netlify-scanner/index.ts`
- `cloudflare-scanner/index.ts`
- `railway-scanner/index.ts`
- `scorecard-scanner/index.ts`
- `firebase-scanner/index.ts`
- `convex-scanner/index.ts`
- `github-scanner/index.ts`

### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

In the `FindingCard` component, display the `source` badge if present:

```tsx
{finding.source && (
    <Badge
        variant="outline"
        className={
            finding.source.includes('free')
                ? 'text-zinc-500 border-zinc-700 text-[10px]'
                : 'text-indigo-400 border-indigo-500/30 text-[10px]'
        }
    >
        {finding.source}
    </Badge>
)}
```

Position it next to the severity badge in the finding header.

### [MODIFY] `dashboard/src/lib/export-markdown.ts`

In the per-finding markdown output (line 226-247), append source if available:
```typescript
if (finding.source) {
    lines.push(`**Source:** ${finding.source}  `);
}
```

---

## Verification

### Build Verification
```bash
cd dashboard && npm run build
```

### Deploy Updated Edge Functions
```bash
# Fix 1: API Key Scanner
supabase functions deploy api-key-scanner --no-verify-jwt

# Fix 3: Supabase Mgmt Scanner
supabase functions deploy supabase-mgmt-scanner --no-verify-jwt

# Fix 6: Deps Scanner
supabase functions deploy deps-scanner --no-verify-jwt

# Fix 7: All scanners (source attribution)
# Deploy all 26 edge functions
for scanner in security-headers-scanner api-key-scanner legal-scanner threat-scanner sqli-scanner tech-scanner github-scanner cors-scanner csrf-scanner cookie-scanner auth-scanner supabase-scanner firebase-scanner convex-scanner deps-scanner ssl-scanner dns-scanner xss-scanner redirect-scanner scorecard-scanner github-security-scanner supabase-mgmt-scanner vercel-scanner netlify-scanner cloudflare-scanner railway-scanner vibe-scanner; do
    supabase functions deploy $scanner --no-verify-jwt
done
```

### Manual Testing
```bash
# Test API key scanner (Fix 1) — should NOT flag pk_live_ as critical
curl -X POST https://vlffoepzknlbyxhkmwmn.supabase.co/functions/v1/api-key-scanner \
  -H "Content-Type: application/json" \
  -H "x-scanner-key: $SCANNER_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"targetUrl": "https://checkvibe.dev"}'

# Test supabase-mgmt scanner (Fix 3) — should separate service_role from real issues
curl -X POST https://vlffoepzknlbyxhkmwmn.supabase.co/functions/v1/supabase-mgmt-scanner \
  -H "Content-Type: application/json" \
  -H "x-scanner-key: $SCANNER_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"targetUrl": "https://checkvibe.dev", "supabasePAT": "...", "supabaseUrl": "https://vlffoepzknlbyxhkmwmn.supabase.co"}'

# Full scan test — verify all fixes work together
# Run two scans on the same project to test diff (Fix 5)
```

---

## Summary Table

| Fix | Priority | Scope | Files Modified | New Files |
|-----|----------|-------|---------------|-----------|
| 1. Key Prefix Allowlist | P1 | Backend | `api-key-scanner/index.ts` | — |
| 2. Separate Info/Passing | P2 | Frontend | `audit-report.tsx`, `scanner-accordion.tsx`, `export-markdown.ts` | — |
| 3. RLS Role-Aware | P3 | Backend | `supabase-mgmt-scanner/index.ts` | — |
| 4. Top 5 Actions | P4 | Frontend | `audit-report.tsx`, `export-markdown.ts` | `recommended-actions.tsx` |
| 5. Scan Diffing | P5 | Full-stack | `projects/[id]/page.tsx`, `audit-report.tsx`, `export-markdown.ts` | `scan-diff.ts`, `scan-diff-banner.tsx` |
| 6. Dep Version Confidence | P6 | Backend | `deps-scanner/index.ts` | — |
| 7. Source Attribution | P7 | Full-stack | All 26 edge functions, `scanner-accordion.tsx`, `export-markdown.ts` | — |
