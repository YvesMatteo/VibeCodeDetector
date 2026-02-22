# Implementation Plan

## Status
- [x] Planning
- [ ] In Progress
- [ ] Verification
- [ ] Complete

## Task List

### Phase 1: Quick Wins (config/dependency fixes)
- [ ] H1: Fix CI pipeline — remove `|| true` from test and audit steps in `.github/workflows/ci.yml`
- [ ] H6: Pin GitHub Actions (`actions/checkout`, `actions/setup-node`, `github/codeql-action/*`) to full commit SHAs
- [ ] M2: Move `@types/three` from `dependencies` to `devDependencies` in `dashboard/package.json`
- [ ] M1: Fail fast if `SCANNER_SECRET_KEY` is empty in `dashboard/src/app/api/scan/route.ts`

### Phase 2: CSP Hardening
- [ ] C1: Remove `unsafe-inline` and `unsafe-eval` from `script-src` in `next.config.ts`
- [ ] C1: Implement nonce-based CSP compatible with Next.js 16 (middleware generates nonce, layout injects it)
- [ ] H4: Restrict `img-src` — remove `http:`, allow only `self`, `data:`, and specific trusted HTTPS domains

### Phase 3: API & Auth Hardening
- [ ] H5: Increase `public_id` entropy — change from `crypto.randomBytes(4)` (8 hex) to `crypto.randomBytes(16)` (32 hex) in share route
- [ ] M5: Webhook POST response — use explicit column select, return `secret` as separate one-time field
- [ ] M7: Change cron scheduled-scans from `GET` to `POST` handler + update Vercel cron config
- [ ] L5: Sanitize error logging in scan route — log `e.message` instead of full error object

### Phase 4: Database Migration
- [ ] L3: Add `WITH CHECK (auth.uid() = user_id)` to scans UPDATE RLS policy
- [ ] Apply migration to live DB

### Phase 5: Verification
- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Commit all changes
- [ ] Push to main

## Notes & Findings
- 2026-02-22: Initialized. Previous commit (34cd1a2) shipped 8 immediate security fixes.
- CSP nonce: Next.js 16 supports middleware-based nonce injection. Need to verify Turbopack compat.
