# Goal

Comprehensive audit of CheckVibe — the full-stack security scanning SaaS for vibe-coded websites. Fix all broken features, data inconsistencies, missing integrations, and UX issues identified in the February 2026 audit.

## Context

- **Product**: CheckVibe (checkvibe.online / checkvibe.dev) — SaaS security scanner
- **Stack**: Next.js 14 (dashboard), Deno Edge Functions (34 scanners), Supabase (auth + DB), Stripe (billing)
- **Previous audit**: `LAUNCH_AUDIT.md` (Feb 9, 2026) — 42 issues found, many now fixed
- **This audit**: Feb 20, 2026 — deep code review of all frontend, backend, and edge functions
- **Live scan report**: `checkvibe-checkvibe.online-2026-02-20.md` — confirms several display bugs

## Key Files

| File | Purpose |
|------|---------|
| `dashboard/src/app/api/scan/route.ts` | Core scan orchestrator — launches all 34 scanners |
| `dashboard/src/lib/audit-data.ts` | Scanner key registry, display names, data processing |
| `dashboard/src/components/dashboard/scanner-accordion.tsx` | Scanner result display UI |
| `dashboard/src/components/dashboard/audit-report.tsx` | Main audit report component |
| `dashboard/src/app/api/stripe/webhook/route.ts` | Stripe webhook handler |
| `dashboard/src/app/page.tsx` | Landing page |
| `dashboard/src/app/dashboard/credits/page.tsx` | Pricing/credits page |
| `dashboard/src/app/dashboard/changelog/page.tsx` | Changelog |
| `dashboard/next.config.ts` | Security headers, CSP |
| `supabase/functions/*/index.ts` | 34 scanner edge functions |

## Requirements

### CRITICAL — Broken Features (must fix)

- [ ] **C1**: Scanner weights sum to 1.25 instead of 1.0 — overall scores are deflated by ~20% (a perfect site scores ~80 instead of 100)
- [ ] **C2**: 3 scanners (`graphql`, `jwt_audit`, `ai_llm`) missing from `CURRENT_SCANNER_KEYS` in `audit-data.ts` — causes display bugs, missing from outdated-scan detection
- [ ] **C3**: 4 scanners (`graphql`, `jwt_audit`, `ai_llm`, `domain_hijacking`) missing from `VALID_SCAN_TYPES` in `scan/route.ts` — cannot be individually selected via API
- [ ] **C4**: 3 scanners (`graphql`, `jwt_audit`, `ai_llm`) missing display names in `scanner-accordion.tsx` and `audit-report.tsx` — show as raw keys in UI and exported reports
- [ ] **C5**: CSP `report-uri /api/security/csp-report` endpoint doesn't exist — browser CSP violation reports silently fail

### HIGH — Data Inconsistencies

- [ ] **H1**: Landing page stats say "30 Security Scanners" — actually 34 scanners (31 always-run + conditional ones)
- [ ] **H2**: Changelog v0.6.0 says "30 edge functions" — should reflect current count (34)
- [ ] **H3**: Login page subtitle says "26 automated scanners" — severely outdated
- [ ] **H4**: `audit-report.tsx` has its own `SCANNER_NAMES` map that's missing `domain_hijacking` entry
- [ ] **H5**: `audit_logging` and `mobile_api` scanners don't receive `renderedHtml`/`interceptedApiCalls`/`interceptedCookies` — they only get `targetUrl`
- [ ] **H6**: `domain_hijacking` scanner also doesn't receive rendered HTML data

### MEDIUM — UX/UI Improvements

- [ ] **M1**: Account deletion is email-only ("Request Deletion" links to mailto) — no self-service
- [ ] **M2**: Email address cannot be changed — "Email cannot be changed at this time" is a dead end
- [ ] **M3**: No scan retry mechanism — if individual scanners fail, user must re-run entire scan
- [ ] **M4**: No search/filter on scans list page — only chronological list
- [ ] **M5**: Exported Markdown report shows raw scanner keys for unnamed scanners (visible in live report)
- [ ] **M6**: `export-markdown.ts` likely missing display names for new scanners
- [ ] **M7**: No breadcrumb navigation in project sub-pages
- [ ] **M8**: "Scans" not in sidebar nav — user must go Projects → History to see scans (legacy /dashboard/scans route exists but is unlisted)

### LOW — Polish & Improvements

- [ ] **L1**: Duplicate `SCANNER_NAMES` map defined in both `audit-report.tsx` and `scanner-accordion.tsx` — should share from `audit-data.ts`
- [ ] **L2**: Duplicate `isValidUrl` function in both `new/page.tsx` (scan) and `projects/new/page.tsx` — should share from `url-validation.ts`
- [ ] **L3**: Comparison features table on credits page says "Full scan suite (30 scanners)" — outdated
- [ ] **L4**: `getIssueCountColor` function defined in both `audit-report.tsx` and `scanner-accordion.tsx` with different logic
- [ ] **L5**: No loading skeleton for scanner-accordion (uses dynamic import with basic pulse animation)
- [ ] **L6**: CSP uses `unsafe-eval` and `unsafe-inline` for scripts — required by Framer Motion but should be documented/minimized

## Constraints

- No new external libraries without strong justification
- Must not break existing scan results stored in DB
- All changes must be backwards-compatible with existing scan data
- Scanner weight rebalancing must be done carefully to avoid sudden score changes for existing users

## Success Criteria

- [ ] All scanner weights sum to exactly 1.0
- [ ] All 34 scanners appear with proper display names in UI and exports
- [ ] Stats on landing/changelog/login pages are accurate
- [ ] CSP report endpoint exists and handles reports
- [ ] Exported reports show human-readable scanner names, not raw keys
- [ ] No TypeScript build errors
