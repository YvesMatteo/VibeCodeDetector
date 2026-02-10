# CheckVibe — Subscription Pricing Rework Session Summary

## What Was Done

### 1. Subscription Pricing Migration (Credits → Monthly Plans)

Converted the entire payment system from one-time credit purchases to recurring monthly subscriptions with 4 tiers:

| Tier | Price/mo | Domains | Scans/mo | Stripe Mode |
|------|----------|---------|----------|-------------|
| Starter | $19 | 1 | 5 | subscription |
| Pro | $39 | 3 | 20 | subscription |
| Enterprise | $89 | 10 | 75 | subscription |
| Max | Custom | Custom | Custom | Contact form |

### 2. Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260210000000_subscription_plans.sql` | Adds subscription columns to `profiles` table |
| `dashboard/src/app/api/stripe/portal/route.ts` | Stripe billing portal API for subscription management |
| `dashboard/src/app/dashboard/settings/manage-subscription-button.tsx` | Client component for portal redirect |

### 3. Files Modified

| File | Changes |
|------|---------|
| `dashboard/src/app/api/stripe/checkout/route.ts` | `mode: 'subscription'`, 3 plan tiers, `subscription_data.metadata` |
| `dashboard/src/app/api/stripe/webhook/route.ts` | 4 lifecycle events, `PLANS_BY_AMOUNT` fallback |
| `dashboard/src/app/api/scan/route.ts` | Subscription enforcement, domain limits, SSRF protection |
| `dashboard/src/app/dashboard/credits/page.tsx` | 4 tier cards, current plan banner, manage subscription |
| `dashboard/src/app/page.tsx` | 4-column pricing grid, removed upsell dialog, mobile nav |
| `dashboard/src/app/dashboard/page.tsx` | Plan/scans/domains stats instead of credits |
| `dashboard/src/app/dashboard/settings/page.tsx` | Subscription card, domain list, portal button |
| `dashboard/src/app/dashboard/scans/new/page.tsx` | Error codes: PLAN_REQUIRED, SCAN_LIMIT_REACHED, DOMAIN_LIMIT_REACHED |
| `dashboard/.env.local` | Added `STRIPE_WEBHOOK_SECRET` |

### 4. Database Migration

New columns added to `profiles`:
- `plan` (text, default `'none'`)
- `plan_domains` (int, default 0)
- `plan_scans_limit` (int, default 0)
- `plan_scans_used` (int, default 0)
- `plan_period_start` (timestamptz)
- `stripe_subscription_id` (text)
- `allowed_domains` (text[], default `'{}'`)

### 5. Stripe Webhook Events Handled

- `checkout.session.completed` — Activate plan, set limits, reset usage
- `invoice.paid` — Monthly reset: `plan_scans_used = 0`
- `customer.subscription.deleted` — Deactivate plan, zero out everything
- `customer.subscription.updated` — Handle upgrades/downgrades (metadata or price fallback)

### 6. Payment Flow Audit & Fixes

- Created Stripe webhook endpoint (`we_1SyxY4LRbxIsl4HL0vk5cv7e`) pointing to `https://checkvibe.dev/api/stripe/webhook`
- Added `STRIPE_WEBHOOK_SECRET` to `.env.local` and Vercel production env
- Added `subscription_data.metadata` to checkout (fixes subscription.updated handler)
- Added `PLANS_BY_AMOUNT` price-based fallback in webhook for edge cases

### 7. Edge Function Updates

- Deployed `LEAKIX_API_KEY` to Supabase edge function secrets
- Redeployed `threat-scanner` edge function

### 8. Skills Installed

Stripe, Supabase, NextJS, security (secrets-scanner, env-secrets-manager, owasp-security-check, git-safety, security-auditor), React patterns, Tailwind, TypeScript, Vercel deployment, ralph-loop, gsd.

### 9. MCP Servers Configured

- Supabase (HTTP transport)
- Stripe (HTTP transport)
- GitHub (HTTP transport)

---

## Bugs Fixed During Session

| Bug | Fix |
|-----|-----|
| Stripe `Invoice` type missing `subscription` property (SDK v2026) | Cast to `(invoice as any).subscription` |
| Old migration already applied but not tracked by CLI | `supabase migration repair --status applied` |
| Webhook completely non-functional (no secret configured) | Created endpoint in Stripe, added secret to env |
| `subscription.updated` couldn't resolve plan (no metadata on subscription) | Added `subscription_data.metadata` to checkout + `PLANS_BY_AMOUNT` fallback |

---

## Uncommitted Changes

The following files have additional linter/responsive improvements that are staged but not yet committed:

- SSRF protection in scan route (`isPrivateOrReservedIP`)
- Input validation for scan types
- Mobile-responsive layouts across all pages
- Origin allowlist validation in checkout/portal
- Error state in manage-subscription-button
- Mobile hamburger menu on landing page

---

## Improvement Ideas (Not Yet Implemented)

### Revenue & Retention
- Free trial (7-day Pro)
- Annual billing discount (20% off)
- Scheduled recurring scans
- Scan history comparison / trend charts
- PDF/white-label reports
- Slack/email alerts on score drops
- Team/org accounts with role-based access

### Product Differentiation
- Competitor benchmarking ("your site vs. competitor.com")
- Lighthouse/Core Web Vitals integration
- Accessibility scanner (WCAG compliance)
- Uptime monitoring
- Custom scan profiles (pick which scanners to run)
- API access for CI/CD integration
- Browser extension for instant scans

### Quick Wins
- Scan progress real-time (SSE/polling)
- Share scan results via public link
- Domain verification (TXT record)
- Scan badges/embeds ("Secured by CheckVibe")
- Remediation guides per finding

### Technical Debt
- Atomic scan credit updates (Supabase RPC)
- Rate limiting on scan API
- Scan queue (background jobs) instead of synchronous
- E2E tests for payment flow
- Error monitoring (Sentry)
