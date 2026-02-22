# Project Prompt

## Goal
Fix all remaining security findings from the 6-agent security audit. The immediate/critical items (PAT masking, CSRF, rate limiting, timing-safe secrets, renderer default-secret, badge IDOR, handle_new_user defaults) were already shipped. This pass addresses every remaining CRITICAL, HIGH, and MEDIUM finding.

## Requirements
- [ ] C1: Tighten CSP — remove `unsafe-inline`/`unsafe-eval`, use nonce-based script-src
- [ ] H1: Fix CI pipeline — remove `|| true` from test/audit steps so failures are visible
- [ ] H4: Restrict `img-src` CSP — remove `http:`, restrict `https:` to known domains
- [ ] H5: Increase shared report `public_id` entropy from 4 bytes to 16 bytes
- [ ] H6: Pin GitHub Actions to commit SHAs instead of mutable version tags
- [ ] M1: Fail fast if `SCANNER_SECRET_KEY` is empty (no empty-string fallback)
- [ ] M2: Move `@types/three` from dependencies to devDependencies
- [ ] M5: Webhook POST response — explicitly select columns, exclude `secret` from response after creation (keep show-once pattern via separate field)
- [ ] M7: Change cron scheduled-scans endpoint from GET to POST
- [ ] L3: Add `WITH CHECK` clause to scans UPDATE RLS policy
- [ ] L5: Sanitize error logging — use `e.message` instead of full error objects in scan route

## Constraints
- Must not break existing functionality or the Vercel deployment
- No new external libraries without good reason
- All SQL changes must be applied to live DB via `supabase db push` or Management API
- CSP nonce approach must work with Next.js 16 App Router

## Success Criteria
- [ ] All requirements above are implemented
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] Changes committed and pushed to main
