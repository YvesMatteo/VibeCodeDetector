# CheckVibe Launch Audit Report
**Date:** 2026-02-09 | **Audited by:** 9-agent parallel audit fleet

---

## LAUNCH VERDICT: CONDITIONAL GO

The app is ~85-90% launch-ready. The build succeeds, core functionality works, security foundations are solid. **But there are 5 blockers and ~20 important items to address.**

---

## BLOCKERS (Must fix before launch)

### 1. LIVE STRIPE SECRET KEY IN ROOT .env
**Severity: CRITICAL**
- `/VibeCode/.env` line 43 contains `sk_live_51Svh93...` (live Stripe key)
- This file is redundant (dashboard reads from `dashboard/.env.local`)
- **Action:** Delete root `.env`, rotate the Stripe key in Stripe Dashboard immediately

### 2. No `invoice.payment_failed` Webhook Handler
**Severity: CRITICAL**
- `dashboard/src/app/api/stripe/webhook/route.ts` handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, `customer.subscription.updated`
- **Missing:** `invoice.payment_failed` - users keep access after failed payments
- **Missing:** `charge.failed` - no dunning/retry strategy
- **Action:** Add handler to downgrade or flag users with failed payments

### 3. API Keys Exposed in URL Query Strings (Edge Functions)
**Severity: CRITICAL**
- `supabase/functions/threat-scanner/index.ts` lines 213, 253, 259: Google Safe Browsing, Shodan, and other API keys passed as URL query params
- `supabase/functions/vibe-scanner/index.ts` line 65: Gemini API key in URL
- `supabase/functions/legal-scanner/index.ts` line 78: Gemini API key in URL
- URL params get logged in server logs, proxy logs, referrer headers
- **Action:** Move all API keys to request headers

### 4. Missing Database Indexes
**Severity: HIGH (performance)**
- No index on `scans.user_id` (every dashboard page queries this)
- No index on `scans.created_at` (sorted on every list view)
- No index on `profiles.stripe_customer_id` (webhook lookups)
- No index on `profiles.stripe_subscription_id` (webhook lookups)
- **Action:** Run migration:
  ```sql
  CREATE INDEX idx_scans_user_id ON public.scans(user_id);
  CREATE INDEX idx_scans_created_at ON public.scans(created_at);
  CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
  CREATE INDEX idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);
  ```

### 5. Verify Security Migration Applied to Production
- `supabase/migrations/20260209_security_fixes.sql` exists and is committed
- Contains: RLS trigger, atomic functions, idempotency table
- **Action:** Confirm this migration was run on production Supabase instance

---

## HIGH PRIORITY (Fix within first week)

### Security

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 6 | Missing POST method validation | `threat-scanner/index.ts:31-42` | Unlike other scanners, doesn't reject non-POST requests |
| 7 | Unhandled promise rejections | `threat-scanner/index.ts:65,81,97,131,147` | `.catch()` only logs, doesn't handle failure state |
| 8 | No content size limits on fetches | `api-key-scanner/index.ts:242` | HTML fetch has no size cap - DoS risk |
| 9 | Unvalidated JSON.parse calls | `vibe-scanner:93`, `legal-scanner:106` | Gemini responses parsed without try-catch |
| 10 | ReDoS vulnerability in regex | `api-key-scanner/index.ts:13` | AWS secret key pattern has catastrophic backtracking potential |
| 11 | No fetch timeout in security-headers | `security-headers-scanner/index.ts:70` | Missing AbortController (other scanners have it) |
| 12 | CSP uses unsafe-eval/unsafe-inline | `dashboard/next.config.ts:23` | Required by Framer Motion but should be documented |
| 13 | No rate limiting on edge functions | All scanner functions | No per-user/per-IP throttling |
| 14 | TypeScript build errors suppressed | `next.config.ts:5` | `ignoreBuildErrors: true` hides real issues |

### Stripe

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 15 | Webhook failure not recoverable | `webhook/route.ts` | If handler crashes after idempotency mark, event is lost forever |
| 16 | No subscription sync job | N/A | DB can drift from Stripe reality with no reconciliation |
| 17 | Metadata fallback in checkout | `webhook/route.ts:96-104` | Falls back to untrusted metadata if price lookup fails |
| 18 | No unique constraints | `profiles` table | `stripe_customer_id` and `stripe_subscription_id` have no UNIQUE index |

### Database

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 19 | `plan` column is TEXT not ENUM | `profiles` table | No validation prevents invalid plan values |
| 20 | `scans.status` has no CHECK constraint | `scans` table | Any string can be stored as status |
| 21 | Missing `updated_at` on scans table | `scans` table | Can't track when scans were last modified |

---

## MEDIUM PRIORITY (Fix within first month)

### Frontend / UX

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 22 | Dashboard/auth pages lack SEO metadata | `/login`, `/signup`, `/dashboard/*` | No `metadata` exports on 5+ pages |
| 23 | `@ts-ignore` in scan results page | `scans/[id]/page.tsx:285` | Should define proper TypeScript interface |
| 24 | `@ts-ignore` for SEO scanner import | `api/scan/route.ts:3` | Module import bypasses type safety |
| 25 | Client-side console.error calls | `credits/page.tsx`, `manage-subscription-button.tsx` | Should use error tracking service |
| 26 | Email addresses hardcoded | `page.tsx:571`, `credits/page.tsx:278` | `hello@checkvibe.dev` should be env var |
| 27 | Misleading CSS class names | `globals.css:404,410` | `.orb-purple` renders blue, `.orb-pink` renders cyan |
| 28 | "Coming soon" buttons in scan details | `scans/[id]/page.tsx:203,207` | PDF Export and Rescan buttons are disabled placeholders |
| 29 | Table accessibility | `scans/page.tsx:139` | Table headers lack scope attributes |
| 30 | Favicon uses `<img>` not `<Image>` | `scans/new/page.tsx:154` | Google favicon API bypasses Next.js image optimization |

### Auth

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 31 | No email verification required | Auth flow | Users can access dashboard immediately after signup |
| 32 | Account deletion not implemented | `settings/page.tsx:201` | "Contact Support" button is disabled with no actual flow |

### Deployment

| # | Issue | Location | Details |
|---|-------|----------|---------|
| 33 | Middleware deprecation warning | `middleware.ts` | Next.js 16 deprecated middleware in favor of `proxy` |
| 34 | Multiple lockfiles | Root + dashboard | Build warning about workspace root inference |
| 35 | No test coverage at all | Entire project | Zero test files, no test runner configured |
| 36 | Root `.env.local` file | `.env.local` | Contains Vercel OIDC token, redundant |

---

## WHAT'S WORKING WELL

### Security (Grade: B+)
- RLS properly enforced on all tables
- `prevent_billing_field_updates` trigger blocks client-side plan manipulation
- Atomic functions (`increment_scan_usage`, `register_scan_domain`) prevent race conditions
- Webhook idempotency via `processed_webhook_events` table
- Webhook signature verification with `stripe.webhooks.constructEvent`
- SSRF protection blocks all RFC 1918 ranges, loopback, link-local
- CORS restricted to `ALLOWED_ORIGIN` (not wildcard)
- Edge function auth via `x-scanner-key` header (fail-closed)
- Host-based CSRF validation on API routes
- Security headers: HSTS, X-Frame-Options DENY, nosniff, CSP, Permissions-Policy

### Frontend (Grade: B+)
- All forms have proper validation (login, signup, password reset, URL input)
- Error boundaries at global and dashboard level
- Proper `'use client'` directives where needed
- Clean code - no dead code, no unused imports
- Responsive design with mobile sidebar drawer
- All navigation links work, no dead-end pages
- Logout flow works properly
- Loading states on buttons and forms

### Architecture (Grade: A-)
- Clean separation: dashboard (Next.js) + edge functions (Deno) + Supabase
- Server Components used where appropriate
- Service role key restricted to webhook handler only
- Anon key properly scoped with RLS enforcement
- Proper cookie-based auth with session refresh

### Build (Grade: A)
- Build succeeds (`next build` completes in 3.5s)
- 18 routes properly mapped (mix of static and dynamic)
- All env vars properly gitignored
- No secrets in source code
- No hardcoded production data

---

## SUMMARY BY SEVERITY

| Severity | Count | Categories |
|----------|-------|------------|
| BLOCKER | 5 | Stripe key exposure, missing webhook handler, API keys in URLs, missing indexes, migration verification |
| HIGH | 14 | Method validation, error handling, size limits, JSON parsing, ReDoS, rate limiting, TS errors suppressed |
| MEDIUM | 15 | SEO metadata, type safety, CSS naming, accessibility, email verification, test coverage |
| LOW | ~8 | Error messages, CSS comments, hash collisions, documentation |

**Total issues found: ~42**

---

## RECOMMENDED LAUNCH SEQUENCE

1. **Rotate Stripe key** and delete root `.env`
2. **Add `invoice.payment_failed` handler** to webhook
3. **Move API keys to headers** in edge functions
4. **Run database indexes migration**
5. **Verify security migration** on production Supabase
6. **Deploy** -- you're live
7. First week: Fix remaining HIGH items
8. First month: Address MEDIUM items, add tests
