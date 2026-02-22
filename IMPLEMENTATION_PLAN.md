# Implementation Plan

## Status
- [x] Planning
- [x] In Progress
- [x] Verification
- [x] Complete

## Task List

### Phase 1: Quick Wins (config/dependency fixes)
- [x] H1: Fix CI pipeline — remove `|| true` from test and audit steps in `.github/workflows/ci.yml`
- [x] H6: Pin GitHub Actions (`actions/checkout`, `actions/setup-node`, `github/codeql-action/*`) to full commit SHAs
- [x] M2: Move `@types/three` from `dependencies` to `devDependencies` in `dashboard/package.json`
- [x] M1: Fail fast if `SCANNER_SECRET_KEY` is empty in `dashboard/src/app/api/scan/route.ts`

### Phase 2: CSP Hardening
- [x] C1: Remove `unsafe-eval` from `script-src` in `next.config.ts` (kept `unsafe-inline` — Next.js requires it for hydration without full nonce setup)
- [ ] C1: Full nonce-based CSP (deferred — requires significant Next.js middleware changes, risk of breaking production)
- [x] H4: Restrict `img-src` — removed `http:`, restricted to `self`, `data:`, and specific trusted HTTPS domains

### Phase 3: API & Auth Hardening
- [x] H5: Increase `public_id` entropy — changed from `crypto.randomBytes(4)` (8 hex) to `crypto.randomBytes(16)` (32 hex)
- [x] M5: Webhook POST response — explicit column select, `secret` returned as separate one-time field
- [x] M7: Cron stays as GET (Vercel Cron limitation) — added comment documenting Bearer token protection
- [x] L5: Sanitize error logging in scan route — log `e.message` instead of full error object

### Phase 4: Database Migration
- [x] L3: Add `WITH CHECK (auth.uid() = user_id)` to scans UPDATE RLS policy
- [x] Applied migration `20260222200000_scans_update_with_check.sql` to live DB

### Phase 5: Verification
- [x] `npx tsc --noEmit` passes cleanly
- [x] Committed as b4b2961
- [x] Pushed to main

## Notes & Findings
- 2026-02-22: Initialized. Previous commit (34cd1a2) shipped 8 immediate security fixes.
- 2026-02-22: Completed all phases. Full nonce-based CSP deferred as a future improvement.
- M7: Vercel Cron only supports GET — cannot change to POST. Documented the security rationale.
