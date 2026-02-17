# Implementation Plan — Full Codebase Improvements

## Status
- [x] Planning
- [ ] In Progress
- [ ] Verification
- [ ] Complete

## Phase 1: DX Foundation
- [ ] 1.1 Remove `ignoreBuildErrors: true` from next.config.ts
- [ ] 1.2 Fix all TypeScript errors that surface
- [ ] 1.3 Add `type-check` script to package.json
- [ ] 1.4 Create shared `withAuth()` wrapper to deduplicate auth boilerplate
- [ ] 1.5 Create shared `getClientIp()` utility for IP extraction
- [ ] 1.6 Create shared `apiError()` response helper
- [ ] 1.7 Create `constants.ts` for severity levels, scan statuses, dismissal reasons
- [ ] 1.8 Complete `.env.local.example` with all required keys

## Phase 2: Backend Fixes
- [ ] 2.1 Add overall 55s scan timeout with partial result saving
- [ ] 2.2 Fix N+1 query in Projects GET — single JOIN query
- [ ] 2.3 Fix skipped scanner score inflation — use fixed denominator
- [ ] 2.4 Add rate limiting to POST /api/dismissals
- [ ] 2.5 Add pagination to GET /api/dismissals
- [ ] 2.6 SQL: Add composite index on scans(project_id, completed_at DESC)
- [ ] 2.7 SQL: Schedule cleanup for rate_limit_windows and api_key_usage_log

## Phase 3: Scanner Fixes
- [ ] 3.1 Fix legal scanner — return degraded result on Gemini failure
- [ ] 3.2 Fix CSP analysis — detect nonce/hash before penalizing unsafe-inline
- [ ] 3.3 Fix CSRF scanner — broaden cookie name matching
- [ ] 3.4 Fix SQLi blind detection — raise threshold from 50 to 500 bytes
- [ ] 3.5 Fix CSP data:/blob: scheme detection

## Phase 4: UI/UX
- [ ] 4.1 Create Project Settings page (edit name/URL/config, delete project)
- [ ] 4.2 Add scan progress feedback (polling + scanner status)
- [ ] 4.3 Add success/error toasts on all mutations
- [ ] 4.4 Add pagination to scan history page
- [ ] 4.5 Fix accessibility — text labels on severity indicators, role="alert"
- [ ] 4.6 Show usage quotas on dashboard header
- [ ] 4.7 Add onboarding welcome modal for new users

## Phase 5: Growth Features
- [ ] 5.1 Shareable public scan reports (public URL, short ID)
- [ ] 5.2 Embeddable security badges
- [ ] 5.3 JSON-LD structured data on landing page
- [ ] 5.4 Pricing comparison table

## Phase 6: Infrastructure
- [ ] 6.1 Add GitHub Actions CI pipeline (type-check + lint + build)
- [ ] 6.2 Remove unused dependencies (tw-animate-css)

## Notes & Findings
- Webhook idempotency already fixed in prior session (mark processed AFTER business logic)
- Score inflation: skipped scanners reduce denominator, inflating score by up to 19%
- N+1 in projects GET: 10 projects = 11 queries
