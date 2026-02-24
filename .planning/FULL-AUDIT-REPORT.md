# VibeCode Full Application Audit Report
**Date**: 2026-02-24
**Scope**: Every feature, scanner, button, page, API route, and integration
**Methodology**: 6 parallel audit agents covering all application areas

---

## Executive Summary

| Area | Findings | Critical | High | Medium | Low |
|------|----------|----------|------|--------|-----|
| Landing & Public Pages | 35 | 0 | 3 | 13 | 14 |
| Dashboard Pages | 24 | 3 | 6 | 7 | 8 |
| API Routes & Backend | 50 | 1 | 5 | 12 | 17 |
| Scanner Suite | 20 | 2 | 3 | 5 | 10 |
| Stripe Billing | 27 | 1 | 5 | 8 | 11 |
| UI/UX Quality | 25 | 0 | 3 | 8 | 12 |
| **TOTAL** | **181** | **7** | **26** | **53** | **72** |

---

## CRITICAL FINDINGS (Fix Immediately)

### C1. New scanners (graphql, jwt_audit, ai_llm) not wired in audit-data.ts
- **Area**: Scanner Suite
- **File**: `dashboard/src/lib/audit-data.ts`
- **Impact**: These scanners exist in the scan route but have no category/description mapping, meaning results are silently dropped from reports
- **Fix**: Add entries to `SCAN_CATEGORIES` and `SCAN_DESCRIPTIONS` in audit-data.ts

### C2. New scanners receive no input data — always return score 100
- **Area**: Scanner Suite
- **File**: `dashboard/src/app/api/scan/route.ts` (scanner dispatch section)
- **Impact**: graphql, jwt_audit, ai_llm scanners are called but their edge functions receive empty/wrong payloads, so they always pass. Effectively non-functional.
- **Fix**: Map correct input data for each scanner in the dispatch logic

### C3. Missing history/[scanId]/page.tsx — historical scan clicks produce 404
- **Area**: Dashboard
- **File**: `dashboard/src/app/dashboard/[id]/history/` (missing file)
- **Impact**: Clicking any historical scan in the History tab leads to a 404 page
- **Fix**: Create the scan detail page or link to the existing report view

### C4. Hardcoded "AWS" text on ALL project cards
- **Area**: Dashboard
- **File**: `dashboard/src/components/dashboard/ProjectCard.tsx`
- **Impact**: Every project card displays "AWS" as the hosting provider regardless of actual backend
- **Fix**: Use the project's `backend_type` field or detected hosting info

### C5. Project card score/issues props computed but never rendered
- **Area**: Dashboard
- **File**: `dashboard/src/components/dashboard/ProjectCard.tsx`
- **Impact**: Score and issues data is fetched but not displayed on cards, making the dashboard less useful
- **Fix**: Add score badge and issue count to the card UI

### C6. Cron auth header injection enables user impersonation
- **Area**: API Routes
- **File**: `dashboard/src/app/api/` (cron-related routes)
- **Impact**: The `x-cron-secret` header allows bypassing auth and specifying an arbitrary user ID, enabling impersonation
- **Fix**: Validate cron secret against env var AND remove user-supplied ID injection; use a dedicated service account

### C7. Free tier scan limit not enforced — unlimited scans for free users
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/scan/route.ts:208-218`
- **Impact**: Free users have `plan_scans_limit = 0` in DB. `increment_scan_usage()` returns `success: false` (0 >= 0), then `hasNoPlan = (plan_scans_limit === 0)` evaluates to `true`, and the code **skips** the limit check entirely. Free users get unlimited scans despite advertised "3 scans/month" limit.
- **Fix**: Set free user `plan_scans_limit = 3` via migration and remove the `hasNoPlan` bypass logic

---

## HIGH FINDINGS (Fix Soon)

### H1. Checkout uses `price_data` instead of Stripe catalog price IDs
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/stripe/checkout/route.ts:77`
- **Impact**: Every checkout creates an ad-hoc price, webhook price-ID verification is completely bypassed (dead code), plan determined solely by metadata
- **Fix**: Use catalog price IDs: `price: PRICE_IDS[plan:interval]`

### H2. Webhook price ID lookup always fails (consequence of H1)
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/stripe/webhook/route.ts:72`
- **Impact**: `resolvePlanByPriceId()` never matches for new subscriptions; security verification is dead code
- **Fix**: Fix H1 first, then this resolves automatically

### H3. Subscription deleted/updated errors silently ignored; event marked as processed
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/stripe/webhook/route.ts:201-301`
- **Impact**: If DB update fails during subscription deletion, the event is still marked processed. User keeps their plan forever. Stripe won't retry.
- **Fix**: Return 500 on DB errors in `subscription.deleted` and `subscription.updated` handlers

### H4. Open redirect via unvalidated Origin header
- **Area**: API Routes
- **File**: `dashboard/src/app/api/auth/signup/route.ts`, `reset-password/route.ts`
- **Impact**: Attacker can set Origin header to redirect users to malicious sites after signup/reset
- **Fix**: Validate origin against allowlist before using in redirect URLs

### H5. Favicon route SSRF vulnerability
- **Area**: API Routes
- **File**: `dashboard/src/app/api/favicon/route.ts`
- **Impact**: Server-side request to user-supplied URL without adequate SSRF protections
- **Fix**: Validate URL against private IP ranges and restrict to known favicon services

### H6. Threat scanner missing fetch timeouts on 5 external APIs
- **Area**: Scanner Suite
- **File**: `supabase/functions/threat-scanner/index.ts`
- **Impact**: External API calls can hang indefinitely, consuming edge function resources
- **Fix**: Add 10-15s timeout to all fetch calls

### H7. GitHub scanner global mutable apiCallCount (concurrent request race)
- **Area**: Scanner Suite
- **File**: `supabase/functions/github-scanner/index.ts`
- **Impact**: Global counter shared across concurrent requests leads to incorrect rate limiting
- **Fix**: Move counter to request scope

### H8. Scanner weights sum to 1.25 instead of 1.0
- **Area**: Scanner Suite
- **File**: `dashboard/src/app/api/scan/route.ts` (SCANNER_WEIGHTS)
- **Impact**: While self-correcting in calculation, relative importance of scanners is skewed
- **Fix**: Renormalize weights to sum to 1.0

### H9. Silent error swallowing in monitoring and integrations pages
- **Area**: Dashboard
- **Files**: `dashboard/src/app/dashboard/[id]/monitoring/page.tsx`, `integrations/page.tsx`
- **Impact**: Fetch failures silently swallowed; user sees empty state with no indication of errors
- **Fix**: Add error states with retry buttons

### H10. Dead 3-dot menu button on project cards
- **Area**: Dashboard
- **File**: `dashboard/src/components/dashboard/ProjectCard.tsx`
- **Impact**: MoreVertical button exists but has no onClick handler or dropdown menu
- **Fix**: Wire up dropdown with Edit/Delete/View options, or remove the button

### H11. Login page says "26 scanners" while rest of site says "30+"
- **Area**: Landing Pages
- **Files**: `dashboard/src/app/login/page.tsx` vs `dashboard/src/app/page.tsx`
- **Impact**: Inconsistent marketing numbers undermine credibility
- **Fix**: Update to consistent "31 scanners" across all pages

### H12. Landing page feature roadmap items link to non-existent pages
- **Area**: Landing Pages
- **File**: `dashboard/src/components/ui/feature-roadmap.tsx`
- **Impact**: "Learn more" links go to 404 pages
- **Fix**: Remove links or create destination pages

### H13. No check for existing subscription before checkout — duplicate subscriptions possible
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/stripe/checkout/route.ts:42-60`
- **Impact**: A user with an active Starter subscription can checkout for Pro without canceling first, creating TWO simultaneous subscriptions and being double-billed
- **Fix**: Check `stripe_subscription_id` before creating checkout; redirect to portal for plan changes

### H14. API key limits hardcoded to 10 instead of per-plan enforcement
- **Area**: Stripe Billing
- **File**: `dashboard/src/app/api/keys/route.ts:15`
- **Impact**: `MAX_KEYS_PER_USER = 10` ignores plan limits (Starter=1, Pro=5, Max=20). Starter users can create 10 keys instead of 1.
- **Fix**: Fetch user plan and use `PLAN_LIMITS[plan].apiKeys` instead of hardcoded 10

### H15. Blog posts are hardcoded static data, not from CMS
- **Area**: Landing Pages
- **File**: `dashboard/src/app/blog/page.tsx`
- **Impact**: Blog can't be updated without code deploys; not scalable
- **Fix**: Connect to a CMS (low priority unless frequent updates needed)

---

## MEDIUM FINDINGS (Plan to Fix)

### M1. Same cent amount charged in all currencies (no FX conversion)
- **File**: `checkout/route.ts:49,78` — $19 = 19 EUR = 19 CHF
- **Fix**: Intentional? Document or use per-currency prices

### M2. `invoice.paid` doesn't verify subscription status before resetting scans
- **File**: `webhook/route.ts:126`
- **Fix**: Also restore `plan_scans_limit` in invoice.paid handler

### M3. Portal fallback origin can be `undefined`
- **File**: `portal/route.ts:53`
- **Fix**: Return 403 when no valid origin is found

### M4. Signup `?plan=` parameter not consumed; no auto-redirect to checkout
- **File**: `page.tsx:530`
- **Fix**: Capture plan param and redirect to checkout post-signup

### M5. Portal-initiated plan changes may not have metadata; limits not restored
- **File**: `webhook/route.ts:278`
- **Fix**: Derive plan from price ID (after H1 fix) as fallback

### M6. Duplicate free-user project limit logic in DB function and API route
- **Files**: Migrations (Feb 16 vs 17) + `projects/route.ts`
- **Fix**: Remove API-level override, let DB function be single source of truth

### M7. Dead code path for `plan_scans_limit === 0` users
- **File**: `scan/route.ts:208`
- **Fix**: Clean up after confirming no users have limit=0

### M8. Free tier scan limit has unreachable `hasNoPlan` branch
- **File**: `scan/route.ts:208-218`
- **Fix**: Remove dead code path

### M9. Missing loading states on several dashboard pages
- **Files**: Various dashboard components
- **Fix**: Add skeleton loaders

### M10. No toast/notification system for async operations
- **Files**: Dashboard-wide
- **Fix**: Add toast library (sonner) for success/error feedback

### M11. Report export produces basic HTML without styling
- **File**: `dashboard/src/components/dashboard/AuditReport.tsx`
- **Fix**: Add CSS to exported HTML

### M12. Share report link copies URL but no public route exists
- **File**: `dashboard/src/components/dashboard/AuditReport.tsx`
- **Fix**: Create public report route or clarify sharing requires auth

### M13. Monitoring page scheduled scans show form but don't reflect running status
- **File**: `dashboard/src/app/dashboard/[id]/monitoring/page.tsx`
- **Fix**: Add active schedule indicator and next-run time

### M14. Scanner category descriptions inconsistent between frontend and backend
- **Files**: `audit-data.ts` vs edge function names
- **Fix**: Align naming conventions

### M15. Several scan types have mismatched IDs between frontend/backend
- **Files**: `audit-data.ts` vs `scan/route.ts`
- **Fix**: Use consistent IDs (e.g., `vibe_match` not `ai_detection`)

### M16. Cookie banner not implemented despite CSP header presence
- **Files**: Landing pages
- **Fix**: Add cookie consent banner for GDPR compliance

### M17. Mobile navigation has z-index issues with SilkBackground
- **File**: `dashboard/src/components/ui/SilkBackground.tsx`
- **Fix**: Adjust z-index layering

### M18. Credits page pricing values hardcoded separately from landing page
- **Files**: `credits/page.tsx` vs `page.tsx`
- **Fix**: Create shared PLAN_CONFIG constant

### M19. Webhook dispatch for project integrations has no retry logic
- **File**: `dashboard/src/app/api/scan/route.ts` (webhook dispatch)
- **Fix**: Add exponential backoff retry or queue failed dispatches

### M20. No rate limiting on public pages (landing, blog, legal)
- **Files**: Public routes
- **Fix**: Add edge middleware rate limiting

---

## LOW FINDINGS (Nice-to-Have / Quick Wins)

<details>
<summary>Click to expand 72 low-severity findings</summary>

### Stripe/Billing
- L1. `payment_method_types: ['card']` blocks Apple/Google Pay — remove to auto-detect
- L2. Success URL `?success=true` not handled — add success toast in dashboard
- L3. Possible duplicate Stripe customers on rapid double-checkout
- L4. No `checkout.session.expired` handling for analytics
- L5. Portal return URL always goes to settings, not calling page
- L6. Annual pricing doesn't show total yearly cost
- L7. Pricing values duplicated in 3 files with no shared constant
- L8. Downgrade doesn't reset `plan_scans_used`
- L9. Downgrade doesn't trim excess `allowed_domains`
- L10. No plan-level gating on API key creation (Starter shouldn't get API access)
- L11. Scanner weights sum > 1.0 (cosmetic; self-correcting)

### Landing Pages
- L12. Accessibility: Missing alt texts on several images
- L13. SEO: Missing structured data (JSON-LD)
- L14. Performance: SilkBackground Three.js loads on every page load
- L15. Footer links to social media profiles that don't exist
- L16. "Trusted by" section has placeholder/stock logos
- L17. Contact form on support page has no spam protection
- L18. Legal pages (Terms, Privacy) reference generic company name
- L19. Changelog page is empty/placeholder
- L20. Comparison table on landing page has inconsistent check/x marks
- L21. Hero section CTA text differs between desktop and mobile
- L22. Blog post dates are hardcoded in the future
- L23. Meta descriptions missing on several pages
- L24. Favicon not set for all sizes (missing apple-touch-icon)
- L25. No 404 custom page

### Dashboard
- L26. Settings form doesn't validate URL format
- L27. Project deletion has no "type project name to confirm" safety
- L28. Empty state illustrations missing on history and integrations
- L29. Tab badges (issue counts) not populated
- L30. Breadcrumb navigation missing
- L31. Keyboard shortcuts not implemented
- L32. Dark mode is the only mode — no light mode toggle
- L33. Table sorting not implemented on scan results

### API Routes
- L34. No OpenAPI/Swagger documentation
- L35. Error responses inconsistent format across routes
- L36. No health check endpoint
- L37. Scan route returns mixed content types (JSON and NDJSON)
- L38. API key usage logs not queryable by date range
- L39. No pagination on scan history API
- L40. Missing `Cache-Control` headers on static API responses
- L41. Rate limit headers (X-RateLimit-*) not returned in responses
- L42. No API versioning scheme
- L43. CORS config doesn't include staging domain
- L44. Auth routes use 302 instead of 307 for POST redirects
- L45. Missing request ID for log correlation
- L46. No webhook retry status endpoint
- L47. Scan cancel endpoint missing (long-running scans can't be stopped)
- L48. No bulk operations (delete multiple projects, scans)
- L49. API key revocation doesn't invalidate in-flight requests
- L50. No audit log for admin actions

### Scanners
- L51. Several scanners have console.log statements in production
- L52. Scanner timeout (45s) too aggressive for slow targets
- L53. No scanner health/status endpoint
- L54. Scanner error messages expose internal implementation details
- L55. WHOISXML_API_KEY env var empty, unused by any scanner
- L56. DNS scanner doesn't check DNSSEC
- L57. SSL scanner doesn't check certificate transparency logs
- L58. Cookie scanner doesn't detect SameSite=None without Secure
- L59. Auth scanner doesn't check for account lockout mechanisms
- L60. CORS scanner doesn't test preflight with credentials

### UI/UX
- L61. Inconsistent button sizes across pages
- L62. Form validation messages appear below fold on mobile
- L63. No progress indicator during scan (only streaming results)
- L64. Chart tooltips cut off on small screens
- L65. Dropdown menus close on scroll (mobile)
- L66. No skeleton loaders — pages flash empty then populated
- L67. Text truncation inconsistent (some ellipsis, some clip)
- L68. Focus ring styles missing on some interactive elements
- L69. Color contrast issues on muted text (WCAG AA fail)
- L70. No animation reduced-motion media query respect
- L71. Modal dialogs don't trap focus
- L72. Success/error feedback relies on color alone (accessibility)

</details>

---

## Top 10 Quick Wins (High Impact, Low Effort)

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| 1 | Fix hardcoded "AWS" on project cards (C4) | 5 min | High — every user sees this |
| 2 | Render score/issues on project cards (C5) | 15 min | High — core dashboard value |
| 3 | Wire up 3-dot menu on project cards (H10) | 20 min | High — dead button visible to all |
| 4 | Update "26 scanners" to "31" on login page (H11) | 2 min | Med — brand consistency |
| 5 | Add success toast after Stripe checkout (L2) | 10 min | Med — reduces support tickets |
| 6 | Remove `payment_method_types: ['card']` (L1) | 1 min | Med — enables Apple/Google Pay |
| 7 | Add error states to monitoring/integrations (H9) | 15 min | Med — better error UX |
| 8 | Wire new scanners in audit-data.ts (C1) | 15 min | High — 3 scanners broken |
| 9 | Fix cron auth header injection (C6) | 20 min | Critical — security vulnerability |
| 10 | Switch checkout to catalog price IDs (H1) | 30 min | High — fixes webhook verification |

---

## Recommended Fix Order

### Phase 1: Critical Security & Functionality (Day 1)
1. **C6** — Cron auth header injection (security)
2. **C7** — Free tier unlimited scans (revenue leak)
3. **H4** — Open redirect via Origin header (security)
4. **H5** — Favicon SSRF (security)
5. **H1 + H2** — Switch to catalog price IDs (fixes webhook verification)
6. **H3** — Webhook error handling (subscription lifecycle)
7. **H13** — Block duplicate subscriptions

### Phase 2: Core UX & Broken Features (Day 2)
6. **C1 + C2** — Wire new scanners with correct data
7. **C3** — Create scan detail page for history tab
8. **C4** — Fix hardcoded "AWS" text
9. **C5** — Render score/issues on project cards
10. **H10** — Wire up 3-dot menu or remove it
11. **H11** — Consistent scanner count across pages

### Phase 3: Billing & Plan Logic (Day 3)
12. **M4** — Consume `?plan=` parameter after signup
13. **M5** — Fix portal plan change metadata issue
14. **M6** — Deduplicate project limit logic
15. **M7 + M8** — Clean up dead code paths
16. **L10** — Gate API key creation by plan
17. **M18** — Shared pricing config

### Phase 4: Polish & UX (Day 4+)
18. **H9** — Error states on dashboard pages
19. **M9** — Loading states / skeleton loaders
20. **M10** — Toast notification system
21. Quick wins from the low-severity list
22. Accessibility fixes (L69, L70, L71, L72)

---

*Report generated by 6 parallel audit agents. Total findings: 181.*
