# Project Prompt

## Goal
Fix all remaining security findings from the 6-agent security audit. The immediate/critical items (PAT masking, CSRF, rate limiting, timing-safe secrets, renderer default-secret, badge IDOR, handle_new_user defaults) were already shipped. This pass addresses every remaining CRITICAL, HIGH, and MEDIUM finding.

## Requirements
- [x] C1: Tighten CSP — removed `unsafe-eval` from script-src, restricted img-src (nonce-based deferred)
- [x] H1: Fix CI pipeline — removed `|| true` from test/audit steps
- [x] H4: Restrict `img-src` CSP — removed `http:`, restricted to known domains
- [x] H5: Increase shared report `public_id` entropy from 4 bytes to 16 bytes
- [x] H6: Pin GitHub Actions to commit SHAs
- [x] M1: Fail fast if `SCANNER_SECRET_KEY` is empty
- [x] M2: Move `@types/three` from dependencies to devDependencies
- [x] M5: Webhook POST response — explicit column select, secret as separate one-time field
- [x] M7: Cron stays GET (Vercel limitation) — documented with comment
- [x] L3: Add `WITH CHECK` clause to scans UPDATE RLS policy
- [x] L5: Sanitize error logging — use `e.message` in scan route

## Constraints
- Must not break existing functionality or the Vercel deployment
- No new external libraries without good reason
- All SQL changes must be applied to live DB via `supabase db push` or Management API
- CSP nonce approach must work with Next.js 16 App Router

## Success Criteria
- [x] All requirements above are implemented
- [x] `npx tsc --noEmit` passes cleanly
- [x] Changes committed and pushed to main (b4b2961)
