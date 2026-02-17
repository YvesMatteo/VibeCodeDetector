# Implementation Plan — Full Codebase Improvements

## Status
- [x] Planning
- [x] In Progress
- [x] Verification
- [x] Complete

## Phase 1: DX Foundation
- [x] 1.1 Remove `ignoreBuildErrors: true` from next.config.ts
- [x] 1.2 Fix all TypeScript errors that surface
- [x] 1.3 Add `type-check` script to package.json
- [x] 1.4 Create shared `withAuth()` wrapper to deduplicate auth boilerplate
- [x] 1.5 Create shared `getClientIp()` utility for IP extraction
- [x] 1.6 Create shared `apiError()` response helper
- [x] 1.7 Create `constants.ts` for severity levels, scan statuses, dismissal reasons
- [x] 1.8 Complete `.env.local.example` with all required keys

## Phase 2: Backend Fixes
- [x] 2.1 Add overall 55s scan timeout with partial result saving
- [x] 2.2 Fix N+1 query in Projects GET — single batch query with `.in()`
- [x] 2.3 Fix skipped scanner score inflation — use fixed denominator (FIXED_TOTAL_WEIGHT)
- [x] 2.4 Add rate limiting to POST /api/dismissals (30/min/user)
- [x] 2.5 Add pagination to GET /api/dismissals (limit/offset with count)
- [x] 2.6 SQL: Add composite index on scans(project_id, completed_at DESC) — deployed
- [x] 2.7 SQL: Schedule cleanup for rate_limit_windows and api_key_usage_log — deployed

## Phase 3: Scanner Fixes
- [x] 3.1 Fix legal scanner — return degraded result (score:50) on Gemini failure — deployed
- [x] 3.2 Fix CSP analysis — detect nonce/hash before penalizing unsafe-inline — deployed
- [x] 3.3 Fix CSRF scanner — broaden cookie name matching — deployed
- [x] 3.4 Fix SQLi blind detection — raise threshold from 50 to 500 bytes — deployed
- [x] 3.5 Fix CSP data:/blob: scheme detection — deployed

## Phase 4: UI/UX
- [x] 4.1 Create Project Settings page (edit name/URL/config, delete project)
- [x] 4.2 Add scan progress feedback (progress bar + scanner name cycling)
- [x] 4.3 Add success/error toasts on all mutations
- [x] 4.4 Add pagination to scan history page (PAGE_SIZE = 20)
- [x] 4.5 Fix accessibility — aria-label on severity bar, role="list" on severity counts, aria-hidden on decorative dots
- [x] 4.6 Show usage quotas on dashboard header (already existed)
- [x] 4.7 Add onboarding welcome modal for new users

## Phase 5: Growth Features
- [x] 5.1 Shareable public scan reports (public URL via /report/[publicId], share/unshare API)
- [x] 5.2 Embeddable security badges (SVG at /api/badge/[publicId])
- [x] 5.3 JSON-LD structured data on landing page (SoftwareApplication schema)
- [x] 5.4 Pricing comparison table (10-row feature comparison below pricing cards)

## Phase 6: Infrastructure
- [x] 6.1 Add GitHub Actions CI pipeline (type-check + lint + build)
- [x] 6.2 Remove unused dependencies (tw-animate-css)

## Deployments
- [x] SQL: favicon_url column on projects — deployed
- [x] SQL: idx_scans_project_completed index + pg_cron cleanup — deployed
- [x] SQL: public_id column + index on scans — deployed
- [x] Edge: legal-scanner — deployed
- [x] Edge: security-headers-scanner — deployed
- [x] Edge: csrf-scanner — deployed
- [x] Edge: sqli-scanner — deployed

## Notes & Findings
- Webhook idempotency already fixed in prior session (mark processed AFTER business logic)
- Score inflation: skipped scanners reduce denominator, inflating score by up to 19% → FIXED with FIXED_TOTAL_WEIGHT
- N+1 in projects GET: 10 projects = 11 queries → FIXED with batch `.in()` query
- Usage quotas already existed in dashboard header — no change needed
- Supabase typed client doesn't know custom columns — use `.from('table' as any)` pattern
