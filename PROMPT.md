# Goal

Implement 7 product improvements to CheckVibe that reduce false positives, separate signal from noise, and add scan diffing — transforming the audit report from a wall of findings into an actionable, trustworthy security tool.

## Context

**Scanner Architecture:** 26 Deno edge functions in `supabase/functions/` return `{ score, findings[] }` objects. The scan API route (`dashboard/src/app/api/scan/route.ts`) runs all scanners in parallel, computes a weighted overall score, and stores results as JSONB in the `scans` table.

**Display Layer:** `AuditReport` + `ScannerAccordion` components render findings. `processAuditData()` aggregates severity counts (already excludes `info` from the issue total). `export-markdown.ts` generates downloadable reports. `ProjectCard` shows issue count on the dashboard grid.

**Key Files:**
- Edge scanners: `supabase/functions/{api-key,supabase-mgmt,deps,github-security}-scanner/index.ts`
- Scan route: `dashboard/src/app/api/scan/route.ts`
- Report UI: `dashboard/src/components/dashboard/audit-report.tsx`, `scanner-accordion.tsx`
- Export: `dashboard/src/lib/export-markdown.ts`
- Project pages: `dashboard/src/app/dashboard/projects/[id]/page.tsx`, `history/page.tsx`
- DB schema: `supabase/migrations/20260131173500_create_scans_table.sql`

## Requirements

- **Fix 1 (Key Prefix Allowlist):** The API key scanner must not flag known-public key formats (Stripe `pk_live_*`, Supabase anon keys, Google Analytics `G-*`, etc.) as leaked secrets. Downgrade to `info` with a note explaining the key is public by design.
- **Fix 2 (Separate Info from Issues):** Info findings are already excluded from the count, but they still appear mixed inline with real issues in the accordion. Add a separate collapsible "Passing Checks" section at the bottom of each scanner. Update the overview card to say "X actionable issues + Y passing checks".
- **Fix 3 (RLS Role-Aware Analysis):** The `supabase-mgmt-scanner`'s `checkPermissivePolicies` must query the `roles` column from `pg_policies` and skip/downgrade policies that apply only to `service_role`.
- **Fix 4 (Top 5 Actions Summary):** Add a prioritized "Recommended Actions" card at the top of every audit report. Pick the top 5 findings by severity, include a one-line fix hint and link to the scanner section.
- **Fix 5 (Scan Diffing):** When a project has prior scans, compute and display a diff: new issues, resolved issues, unchanged issues. Show a summary banner on the report and individual badges per finding.
- **Fix 6 (Dependency Version Confidence):** The deps scanner should report confidence level when version detection is ambiguous. Show "confidence: low" instead of asserting wrong versions.
- **Fix 7 (Source Attribution):** Findings from GitHub's free tools (CodeQL, Dependabot, Secret Scanning) must be labeled with their source. CheckVibe-proprietary findings should be labeled distinctly.
