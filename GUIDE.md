# CheckVibe — Complete Project Guide

> You built this with AI. This guide explains how everything actually works under the hood.

---

## Table of Contents

1. [What Is CheckVibe?](#1-what-is-checkvibe)
2. [Architecture Overview](#2-architecture-overview)
3. [How a Scan Works (End-to-End)](#3-how-a-scan-works-end-to-end)
4. [The 35 Edge Function Scanners](#4-the-35-edge-function-scanners)
5. [Scoring Algorithm](#5-scoring-algorithm)
6. [Threat Detection System](#6-threat-detection-system)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Billing & Stripe Integration](#8-billing--stripe-integration)
9. [API Key System](#9-api-key-system)
10. [Monitoring & Scheduled Scans](#10-monitoring--scheduled-scans)
11. [Alerts & Webhooks](#11-alerts--webhooks)
12. [CI/CD Integrations (Vercel & Netlify)](#12-cicd-integrations-vercel--netlify)
13. [Database Schema](#13-database-schema)
14. [Security Hardening](#14-security-hardening)
15. [Project Structure Map](#15-project-structure-map)
16. [Known Issues & Gotchas](#16-known-issues--gotchas)

---

## 1. What Is CheckVibe?

CheckVibe is a **web security auditing platform**. Users create "projects" (each representing a website), and CheckVibe runs 35 parallel security scanners against them, producing a score from 0-100 and actionable findings.

**Core features:**
- One-click security audits (35 scanners, ~45 seconds)
- Real-time threat detection via embedded JavaScript snippet
- Scheduled scans (daily/weekly/monthly)
- Alert rules (score drops, new critical findings)
- CI/CD hooks (scan on every Vercel/Netlify deploy)
- API keys for programmatic access
- Shareable public reports with security badges

**Business model:** Freemium SaaS with Starter ($19/mo), Pro ($39/mo), and Max ($79/mo) plans.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                                                               │
│   Next.js 16 (Turbopack) + React 19 + Tailwind CSS 4       │
│   Hosted on Vercel at checkvibe.dev                          │
│                                                               │
│   Landing page → /                                           │
│   Dashboard    → /dashboard/**                               │
│   API routes   → /api/**                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
            ┌────────────┼────────────────┐
            │            │                │
            ▼            ▼                ▼
   ┌─────────────┐ ┌──────────┐  ┌──────────────┐
   │  Supabase   │ │  Stripe  │  │ 35 Deno Edge │
   │  (Postgres  │ │  (Billing │  │  Functions   │
   │   + Auth    │ │   + Sub  │  │  (Scanners)  │
   │   + RLS)    │ │  mgmt)   │  │              │
   └─────────────┘ └──────────┘  └──────────────┘
                                        │
                              ┌─────────┼─────────┐
                              ▼         ▼         ▼
                        Google Safe  Gemini   GitHub
                        Browsing     API      API ...
```

**Key directories:**
- `dashboard/` — The entire Next.js app (pages, API routes, components, lib)
- `supabase/functions/` — 35+ Deno edge functions (the scanners)
- `supabase/migrations/` — SQL migrations that define the database schema

---

## 3. How a Scan Works (End-to-End)

This is the core of the product. Here's what happens when you click "Run Audit":

### Step 1: Request Arrives
`POST /api/scan` with `{ url, projectId, scanTypes }`

### Step 2: Authentication
The `resolveAuth()` function checks three auth methods in priority order:
1. **Cron secret** — Internal scheduled scans use `x-cron-secret` header
2. **API key** — External integrations use `Bearer cvd_live_...` token
3. **Session cookie** — Browser users use Supabase SSR cookies

### Step 3: SSRF Protection
Before scanning any URL, the system validates it:
- Must be http/https only
- No credentials in URL (`user:pass@host`)
- Hostname is checked against private IP ranges (127.x, 10.x, 192.168.x, etc.)
- DNS resolution validates the actual resolved IP isn't private (prevents DNS rebinding)

### Step 4: Quota Enforcement (Atomic)
Two Postgres RPC functions run **inside a transaction** to prevent race conditions:
- `register_scan_domain(user_id, domain)` — Checks if user has domain slots left
- `increment_scan_usage(user_id)` — Atomically increments scan counter and checks plan limit

This means two simultaneous requests can't both sneak past the limit.

### Step 5: Parallel Scanner Execution
All 35 scanners launch **simultaneously** as HTTP requests to Supabase Edge Functions:

```
                    POST /api/scan
                         │
            ┌────────────┼────────────────────────┐
            │            │            │            │
            ▼            ▼            ▼            ▼
     security-      threat-      sqli-       xss-
     headers-       scanner      scanner     scanner
     scanner                                        ... (x35)
            │            │            │            │
            └────────────┼────────────────────────┘
                         │
                    Aggregate Results
                         │
                    Compute Score
                         │
                    Store in DB
```

Each scanner:
- Receives the target URL + config via POST
- Authenticates via `x-scanner-key` shared secret (constant-time comparison)
- Has a 45-second timeout (AbortController kills it if too slow)
- Returns `{ scannerType, score, findings[], checksRun }`

### Step 6: Response Streaming (NDJSON)
The scan route uses **newline-delimited JSON** streaming so the client gets feedback immediately:

```
Line 1 (instant):  {"type":"started","scanId":"abc-123","totalScanners":32}
Line 2 (after ~45s): {"type":"result","overallScore":75,"results":{...}}
```

The client shows a progress bar while scanners complete in the background.

### Step 7: Post-Scan Hooks (Fire-and-Forget)
After results are stored, these run without blocking the response:
- Update project stats (finding counts, last score)
- Fetch project favicon
- Dispatch webhooks to user-configured endpoints
- Check alert rules (score drop? new critical? below threshold?)
- Link scan to Vercel/Netlify deployment if triggered by CI/CD

---

## 4. The 35 Edge Function Scanners

Each scanner is a standalone Deno function in `supabase/functions/`. Here's what each does:

### Always-Run Scanners (27)

| Scanner | What It Checks |
|---------|---------------|
| `security-headers` | CSP, HSTS, X-Frame-Options, cookie flags, CORS probe, info disclosure |
| `api-key` | Exposed secrets in HTML/JS (AWS keys, GitHub tokens, Stripe keys, etc.) |
| `legal` | Privacy policy, terms of service, cookie consent, GDPR compliance |
| `threat` | Google Safe Browsing |
| `sqli` | SQL injection patterns in URL params and forms |
| `xss` | Cross-site scripting patterns in inputs and reflected content |
| `ssl` | Certificate validity, expiry, chain trust, protocol version |
| `dns` | SPF, DKIM, DMARC email authentication records |
| `cors` | Misconfigured CORS (wildcard + credentials, origin reflection) |
| `csrf` | CSRF token presence in forms |
| `cookie` | Secure/HttpOnly/SameSite flags on cookies |
| `auth` | Authentication mechanism detection and weaknesses |
| `tech` | Technology stack detection (like Wappalyzer) |
| `redirect` | Open redirect vulnerabilities |
| `ddos` | WAF/CDN presence, rate limiting detection |
| `upload` | File upload form security |
| `audit` | Monitoring/logging endpoint detection |
| `mobile` | Mobile API rate limiting |
| `domain-hijacking` | RDAP registration, NS integrity, typosquatting detection |
| `debug-endpoints` | Debug/admin endpoint exposure |
| `graphql` | GraphQL introspection enabled, security config |
| `jwt-audit` | JWT validation, algorithm confusion, expiry |
| `ai-llm` | LLM/AI endpoint detection and security |
| `vercel` | Vercel hosting auto-detection |
| `netlify` | Netlify hosting auto-detection |
| `cloudflare` | Cloudflare CDN auto-detection |
| `railway` | Railway hosting auto-detection |

### Conditional Scanners (8)

| Scanner | Requires |
|---------|----------|
| `github-scanner` | GitHub repo URL in project config |
| `github-security` | GitHub repo + GITHUB_TOKEN with `security_events` scope |
| `deps` | GitHub repo (reads dependency files) |
| `scorecard` | GitHub repo (OpenSSF Scorecard) |
| `supabase` | Backend type = "supabase" (or auto-detected) |
| `supabase-mgmt` | Supabase PAT token + Supabase URL |
| `firebase` | Backend type = "firebase" |
| `convex` | Backend type = "convex" |

### Deep Dive: How Threat Detection Scanner Works

The `threat-scanner` queries Google Safe Browsing for threat intelligence:

**1. Google Safe Browsing**
- Checks if URL is flagged for malware, phishing, or unwanted software
- If flagged: -50 points, severity "critical"

### Deep Dive: How Security Headers Scanner Works

The `security-headers-scanner` does much more than just check if headers exist:

**Header checklist** (with weights):
- Content-Security-Policy: 15 points
- Strict-Transport-Security: 20 points
- X-Frame-Options: 10 points
- X-Content-Type-Options: 10 points
- Referrer-Policy: 5 points
- Permissions-Policy: 5 points

**CORS probe**: Sends a request with `Origin: https://evil.com` to detect:
- Wildcard + Credentials = critical (attacker can steal data)
- Origin Reflection = critical/high (server mirrors any origin)

**CSP deep analysis**: Checks for:
- `unsafe-inline` without nonce → medium
- `unsafe-eval` → medium
- Wildcard `*` source → high
- `data:` or `blob:` in script-src → high

**Cookie analysis**: For every Set-Cookie header, checks Secure, HttpOnly, SameSite flags.

**Information disclosure**: Flags server version strings, debug tokens, runtime headers.

**HTTPS redirect**: Tests if http:// properly redirects to https://.

### SPA Catch-All Detection

A clever trick in the shared security module: SPAs (single-page apps) return 200 for every path, even `/backup.sql` or `/admin`. The scanner detects this by:
1. Fetching the homepage and recording its response length
2. Fetching a random nonsense path (like `/aB3x9Qz7`)
3. If both return 200 with HTML and similar lengths (within 5%) → it's a SPA catch-all
4. Subsequent path probes that match this fingerprint are ignored (prevents false positives)

---

## 5. Scoring Algorithm

The final score uses **exponential decay**, not simple addition:

```
penalty_points = sum of:
  each critical finding  × 15
  each high finding      × 8
  each medium finding    × 4
  each low finding       × 1.5
  each info finding      × 0

score = 100 × e^(-penalty_points / 120)
```

**Why exponential decay?**
- First few issues hit hard (going from 100 → 85 is easy)
- Additional issues have diminishing impact (going from 20 → 15 is hard)
- Score never reaches exactly 0 (asymptotic)
- A site with ~55 penalty points scores ~50
- A site with ~185 penalty points scores ~10

Each scanner also returns its own 0-100 score, but the overall score is computed from all findings globally.

---

## 6. Threat Detection System

This is a separate system from the audit scanners. It monitors your site for **real-time attacks** from visitors.

### How It Works

```
┌──────────────────────────────────────────────────────────────┐
│ YOUR WEBSITE (Customer's site)                                │
│                                                                │
│  <script src="checkvibe.dev/sdk/cv-threat.min.js"            │
│          data-token="cvt_xxx_yyy" async defer></script>       │
│                                                                │
│  The snippet silently monitors for:                           │
│  1. XSS attempts in URL params (19 regex patterns)           │
│  2. SQL injection in URL params (17 patterns)                │
│  3. Path traversal (../etc/passwd, 6 patterns)               │
│  4. Bot/headless browser detection (4 signals)               │
│  5. Brute force (>5 login attempts in 60s)                   │
│  6. CSRF (cross-domain form POST without token)              │
│                                                                │
│  Events queued → batched every 5s → POST to edge function    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION: threat-ingest                                  │
│                                                                │
│  1. Validate snippet token (lookup in threat_settings table) │
│  2. Rate limit: 500 events/min per token                     │
│  3. Extract source IP from server headers (not client data)  │
│  4. Sanitize: truncate payloads to 500 chars, paths to 2048 │
│  5. Insert into threat_events table                          │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ DATABASE: threat_events                                       │
│                                                                │
│  project_id, event_type, severity, source_ip,                │
│  user_agent, request_path, payload_snippet, metadata         │
│                                                                │
│  TTL by plan: Starter=24h, Pro=7d, Max=30d                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│ DASHBOARD                 │ CRON: threat-alerts   │
│                           │ (every 5 min)         │
│ Stats cards (totals)      │                       │
│ Timeline chart (hourly)   │ Check cooldown        │
│ Event table (paginated)   │ Count new events      │
│ Top IPs table             │ Send email via Resend │
└──────────────────────┘    └──────────────────────┘
```

### Setting It Up
1. User goes to `/dashboard/projects/[id]/threats`
2. Toggles "Enable Threat Detection" (requires paid plan)
3. System generates a unique token: `cvt_<projectId>_<random>`
4. User copies the `<script>` tag and pastes it into their site's HTML
5. Events start flowing in within seconds

### What Gets Detected

**XSS (19 patterns):** `<script>`, `javascript:`, `onerror=`, `eval()`, `innerHTML=`, entity encoding, etc.

**SQL Injection (17 patterns):** `UNION SELECT`, `OR 1=1`, `DROP TABLE`, `SLEEP()`, stacked queries, comment syntax (`--`, `/**/`)

**Path Traversal (6 patterns):** `../`, `..%2f`, `/etc/passwd`, `/proc/self`, Windows paths (`C:\`)

**Bot Detection (4 signals):** `navigator.webdriver`, phantom Chrome properties, Nightmare browser, missing `navigator.languages`. Only triggers if 2+ signals match.

**Brute Force:** Monitors form submissions containing password fields. Flags if >5 attempts in 60 seconds.

**CSRF:** Detects cross-domain POST form submissions (to a different domain) without CSRF token fields. Exempts known safe domains (Stripe, PayPal, Google, GitHub, etc.)

### Security of the Ingestion Pipeline
- **Server-authoritative IPs**: The source IP comes from server headers, not the client payload (prevents spoofing)
- **Rate limiting**: 500 events/minute per token prevents flooding
- **Fail-closed**: If rate limit DB check fails, request is denied (429)
- **CORS is open**: Intentionally `Access-Control-Allow-Origin: *` because the snippet runs on customer domains

---

## 7. Authentication & Authorization

Three layers protect the app:

### Layer 1: Next.js Middleware (`middleware.ts`)
Runs on every request (except static files):
- **Domain redirect**: 301 from `checkvibe.online` → `checkvibe.dev`
- **Session refresh**: Calls Supabase `updateSession()` to keep cookies fresh
- **Auth guard**: Protected routes (`/dashboard/*`) redirect to `/login` if no session
- **Reverse guard**: Auth pages (`/login`, `/signup`) redirect to `/dashboard` if already logged in

### Layer 2: Supabase SSR Auth
Uses chunked cookies because JWTs are too large for a single cookie (>4KB):
- Cookies named `sb-{ref}-auth-token.0`, `sb-{ref}-auth-token.1`, etc.
- URL-encoded JSON, split across multiple cookies
- `supabase.auth.getUser()` reassembles them server-side

### Layer 3: API Route Auth (`resolveAuth()`)
Every API route calls `resolveAuth()` which tries these in order:

```
1. x-cron-secret header? → Cron service auth
   - Timing-safe compare against CRON_SECRET env var
   - Looks up user from project's owner (NOT from header — prevents impersonation)

2. Authorization: Bearer cvd_live_...? → API key auth
   - SHA-256 hash the key
   - Look up in api_keys table
   - Check IP allowlist, domain restrictions
   - Apply per-key/per-user/per-IP rate limits
   - Log usage for audit trail

3. Neither? → Session cookie auth
   - supabase.auth.getUser() from cookies
   - Fetch profile for plan info
   - Apply per-user/per-IP rate limits
```

### CSRF Protection
All mutation endpoints (POST, DELETE, PATCH) require a valid CSRF token.
- Exceptions: API key auth (already validated), cron secret (server-to-server), localhost in dev mode
- The token is validated by comparing the request `Origin` header against allowed origins

---

## 8. Billing & Stripe Integration

### Plan Tiers (from `plan-config.ts`)

| Feature | Free | Starter ($19/mo) | Pro ($39/mo) | Max ($79/mo) |
|---------|------|-------------------|--------------|--------------|
| Scans/month | 4 | 30 | 155 | 3,000 |
| Domains | 1 | 1 | 3 | 10 |
| Projects | 1 | 1 | 5 | 25 |
| API keys | 0 | 1 | 5 | 20 |
| Monitoring | Weekly | Daily | Every 6h | Every 6h |
| Threat detection | No | Yes (24h) | Yes (7d) | Yes (30d) |
| Annual discount | — | 30% off | 30% off | 30% off |

### Checkout Flow
1. User clicks upgrade → `POST /api/stripe/checkout`
2. Validates: CSRF, rate limit (5/min), plan exists, no existing subscription (409 if already subscribed)
3. Creates Stripe Checkout Session with **catalog price IDs** (not inline pricing)
4. Enables Apple Pay, Google Pay, promo codes
5. Redirects user to Stripe-hosted checkout page

### Webhook Handler (`/api/stripe/webhook`)
Stripe sends events to this endpoint. It's the **source of truth** for billing state:

| Stripe Event | What Happens |
|-------------|-------------|
| `checkout.session.completed` | Activates plan: sets `plan`, `plan_scans_limit`, `plan_domains`, stores `stripe_customer_id` and `stripe_subscription_id` |
| `invoice.paid` | Monthly renewal: resets `plan_scans_used` to 0 |
| `invoice.payment_failed` | Restricts access: sets `plan_scans_limit` to 0 |
| `customer.subscription.updated` | Syncs plan changes, handles downgrades/pauses |
| `customer.subscription.deleted` | Downgrades to free: clears all limits |

**Security measures:**
- Verifies webhook signature (`stripe.webhooks.constructEvent()`)
- **Idempotency**: Stores processed event IDs in `processed_webhook_events` table (prevents duplicate processing)
- Events marked processed AFTER business logic succeeds (so Stripe retries on failure)
- Plan name validated against allowlist (prevents escalation attacks)
- Returns 500 on DB errors → Stripe automatically retries

### How Plan Limits Are Enforced
The `profiles` table stores: `plan`, `plan_scans_used`, `plan_scans_limit`, `plan_domains`, `allowed_domains[]`

The Postgres function `increment_scan_usage()` runs atomically:
```sql
-- Pseudocode
UPDATE profiles
SET plan_scans_used = plan_scans_used + 1
WHERE id = user_id
  AND plan_scans_used < plan_scans_limit
RETURNING plan_scans_used, plan_scans_limit;
```
If the update affects 0 rows → limit reached → scan denied.

A RLS trigger (`prevent_billing_field_updates`) ensures these fields can only be updated by `service_role`, not by the client SDK.

---

## 9. API Key System

Users can create API keys for programmatic access (e.g., CI/CD pipelines, custom integrations).

### Key Format
`cvd_live_<32 hex characters>` — 128 bits of entropy from `crypto.randomBytes(16)`

### How Keys Are Stored
- The key is shown to the user exactly **once** (on creation)
- It's hashed with SHA-256 before storage
- Only the first 8 chars (`key_prefix`) are stored for display: `cvd_live_a1b2...`

### Scopes
| Scope | Allows |
|-------|--------|
| `scan:read` | Read scan results and history |
| `scan:write` | Trigger new scans |
| `keys:read` | List your API keys |
| `keys:manage` | Create, revoke, modify keys |

### Rate Limits (per 60 seconds)

| Plan | Per Key | Per User | Per IP |
|------|---------|----------|--------|
| Free | 5 | 10 | 20 |
| Starter | 10 | 20 | 20 |
| Pro | 30 | 60 | 20 |
| Max | 100 | 200 | 20 |

Rate limiting uses a **sliding window** algorithm stored in the `rate_limit_windows` table. All three limits (key + user + IP) are checked in parallel; the most restrictive one wins.

### Key Restrictions
- **Domain allowlist**: Key only works for scanning specific domains
- **IP allowlist**: Key only works from specific IP addresses/CIDR ranges
- **Plan-based limits**: Free=0 keys, Starter=1, Pro=5, Max=20

---

## 10. Monitoring & Scheduled Scans

### How Scheduled Scans Work

1. **User configures** schedule in `/dashboard/projects/[id]/monitoring`
   - Frequency: every 6h, daily, weekly, or monthly
   - Time of day (UTC)
   - Day of week (if weekly)

2. **Stored** in `scheduled_scans` table with computed `next_run_at`

3. **Vercel Cron** calls `GET /api/cron/scheduled-scans` periodically
   - Authenticates with `CRON_SECRET`
   - Queries: `WHERE next_run_at <= now() AND enabled = true` (limit 10)
   - For each due schedule:
     - Checks scan quota via `increment_scan_usage()` (respects plan limits)
     - Fetches project config (URL, GitHub repo, backend type)
     - Triggers scan via internal `POST /api/scan` with cron auth
     - Updates `next_run_at` for the next cycle

4. **Next run** is computed based on frequency:
   - `every_6h` → Next boundary at 0, 6, 12, or 18 UTC
   - `daily` → Same hour tomorrow
   - `weekly` → Same day next week
   - `monthly` → First day of next month

---

## 11. Alerts & Webhooks

### Alert Rules
Users configure rules in the monitoring page. Three types:

| Rule Type | Triggers When | Default Threshold |
|-----------|-------------|------------------|
| `score_drop` | Score drops by X+ points from previous scan | 10 points |
| `new_critical` | Any critical-severity finding appears | N/A |
| `score_below` | Score falls below X | 50 |

All alerts are **throttled to once per 24 hours** per rule to prevent spam.

When triggered, an email is sent via Resend with a branded template showing:
- Project name and URL
- What triggered the alert (score change, critical finding, etc.)
- Link to the dashboard

### Outbound Webhooks
Users can register webhook URLs to receive scan events:

**Events:** `scan.completed`, `scan.started`, `score.changed`, `threat.detected`

**Payload:**
```json
{
  "event": "scan.completed",
  "project_id": "...",
  "scan_id": "...",
  "url": "https://mysite.com",
  "overall_score": 85,
  "issues": { "critical": 0, "high": 2, "medium": 5, "low": 3 },
  "timestamp": "2026-03-01T00:00:00Z"
}
```

**Security:**
- Webhook URLs are SSRF-validated (no private IPs, DNS rebinding check)
- Requests are signed with HMAC-SHA256 via `X-CheckVibe-Signature` header
- Secret format: `whsec_<24-byte random hex>` (shown once on creation)
- 10-second timeout per delivery

---

## 12. CI/CD Integrations (Vercel & Netlify)

### How Vercel Integration Works

1. **Setup**: User connects Vercel project in `/dashboard/projects/[id]/integrations`
   - CheckVibe generates a webhook URL and signing secret
   - User adds the webhook URL in Vercel project settings

2. **On Deploy**: Vercel sends a POST to `/api/integrations/vercel/webhook`
   - CheckVibe verifies HMAC-SHA1 signature
   - Checks idempotency (has this deployment ID been processed?)
   - Extracts deployment URL, git branch, commit SHA

3. **Scan Triggered**: Same as a cron scan — internal `POST /api/scan`
   - Scan runs against the deployment URL
   - Result score stored in `vercel_deployments` table
   - User sees deploy history with scores in the integrations tab

Netlify works the same way with its own webhook format.

---

## 13. Database Schema

The key tables and their relationships:

```
auth.users (Supabase Auth)
    │
    ├──→ profiles (plan, scan limits, stripe IDs)
    │
    ├──→ projects (name, url, github_repo, backend_type)
    │       │
    │       ├──→ scans (url, status, results JSONB, overall_score)
    │       │       │
    │       │       └──→ dismissed_findings (per-finding dismissals)
    │       │
    │       ├──→ scheduled_scans (frequency, next_run_at)
    │       ├──→ alert_rules (score_drop, new_critical, score_below)
    │       ├──→ project_webhooks (url, events, signing secret)
    │       ├──→ threat_settings (enabled, token, alert frequency)
    │       └──→ threat_events (type, severity, source_ip, payload)
    │
    ├──→ api_keys (name, key_hash, scopes, rate limits)
    │       │
    │       ├──→ api_key_usage_log (endpoint, method, status, ip)
    │       └──→ rate_limit_windows (sliding window counters)
    │
    └──→ processed_webhook_events (Stripe idempotency)
```

### Row-Level Security (RLS)
Every table has RLS policies. Users can only:
- Read/write their own projects, scans, settings, keys
- The `profiles` billing fields (plan, limits) can only be updated by `service_role` (not the user's client SDK)
- `threat_events` inserts are service-role only (edge function uses service key)

---

## 14. Security Hardening

A summary of all security measures in the codebase:

### Input Validation
- **URL validation** with SSRF protection (private IP + DNS rebinding checks)
- **Project name**: Max 100 chars, backend type validated against allowlist
- **Generic error messages**: Login/signup show generic errors (prevents account enumeration)

### Authentication
- **Constant-time comparison** for scanner key and cron secret (prevents timing attacks)
- **Cron auth**: User ID derived from DB lookup, not from request headers (prevents impersonation)
- **CSRF**: Required on all mutations, bypassed only for API key auth and cron
- **Cookie signing**: Uses `COOKIE_SIGNING_SECRET` env var (fails closed if missing)

### Database
- **RLS on all tables**: Users can only access their own data
- **Billing field trigger**: `prevent_billing_field_updates` blocks client-side plan manipulation
- **Atomic functions**: `increment_scan_usage()` and `register_scan_domain()` prevent race conditions
- **Search path fixed**: All SECURITY DEFINER functions use explicit `search_path = public`

### HTTP Security Headers (set in `next.config.ts`)
- `Content-Security-Policy` with strict default-src
- `Strict-Transport-Security` with `preload` (31536000s)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy`: camera, microphone, geolocation disabled

### Stripe
- **Webhook signature verification** on every event
- **Idempotency**: Processed events tracked in DB (prevents duplicate billing changes)
- **Plan validation**: Metadata validated against known plans (prevents escalation)
- **Duplicate subscription check**: Returns 409 if user already subscribed

### Edge Functions
- **CORS restricted**: Only allows requests from `checkvibe.dev` (except threat-ingest which allows `*`)
- **Scanner auth**: `x-scanner-key` shared secret required
- **Timeouts**: 45s per scanner, 15s for external fetches

### Known Gaps
- `supabase_pat` stored in plaintext (should be encrypted)
- DNS rebinding not fully mitigated (hostname checks don't revalidate resolved IPs)
- Edge functions deployed with `--no-verify-jwt` (custom auth used instead)
- `GITHUB_TOKEN` missing `security_events` scope

---

## 15. Project Structure Map

```
VibeCode/
├── dashboard/                          # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Landing page (Framer Motion)
│   │   │   ├── login/                 # Auth pages
│   │   │   ├── signup/
│   │   │   ├── dashboard/             # Protected dashboard
│   │   │   │   ├── page.tsx           # Project grid
│   │   │   │   ├── projects/
│   │   │   │   │   ├── new/           # Create project
│   │   │   │   │   └── [id]/          # Project detail (tabbed)
│   │   │   │   │       ├── page.tsx           # Overview tab
│   │   │   │   │       ├── report/            # Audit report tab
│   │   │   │   │       ├── history/           # Scan history tab
│   │   │   │   │       ├── monitoring/        # Scheduled scans tab
│   │   │   │   │       ├── integrations/      # Webhooks/CI tab
│   │   │   │   │       ├── threats/           # Threat detection tab
│   │   │   │   │       └── settings/          # Project config tab
│   │   │   │   ├── api-keys/          # API key management
│   │   │   │   ├── credits/           # Subscription page
│   │   │   │   └── settings/          # User settings
│   │   │   ├── api/
│   │   │   │   ├── scan/              # Core scan API
│   │   │   │   ├── projects/          # Project CRUD
│   │   │   │   ├── stripe/            # Checkout, portal, webhook
│   │   │   │   ├── threats/           # Threat events, settings, stats
│   │   │   │   ├── monitoring/        # Scheduled scans, alerts
│   │   │   │   ├── integrations/      # Webhooks, Vercel, Netlify
│   │   │   │   ├── keys/             # API key management
│   │   │   │   ├── cron/             # Scheduled scan + threat alert cron
│   │   │   │   └── health/           # Health check endpoint
│   │   │   └── report/[publicId]/     # Public shareable reports
│   │   │
│   │   ├── lib/
│   │   │   ├── plan-config.ts         # Plan definitions (source of truth)
│   │   │   ├── api-auth.ts            # Unified auth resolver
│   │   │   ├── api-keys.ts            # Key generation/hashing
│   │   │   ├── rate-limit.ts          # Sliding window rate limiting
│   │   │   ├── url-validation.ts      # SSRF protection
│   │   │   ├── csrf.ts               # CSRF token validation
│   │   │   ├── audit-data.ts          # Scanner registry + data processing
│   │   │   ├── plain-english.ts       # Finding descriptions (OWASP, CWE)
│   │   │   ├── webhook-dispatch.ts    # Outbound webhook delivery
│   │   │   ├── alert-dispatch.ts      # Email alert delivery
│   │   │   ├── email-templates.ts     # Branded email HTML templates
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts          # Browser Supabase client
│   │   │   │   ├── server.ts          # Server Supabase client
│   │   │   │   ├── admin.ts           # Admin Supabase client (service role)
│   │   │   │   └── middleware.ts      # SSR cookie session handler
│   │   │   └── hooks/
│   │   │       ├── use-projects.ts    # SWR hook for projects
│   │   │       ├── use-scans.ts       # SWR hook for scans
│   │   │       └── use-scan-progress.ts # Realtime scan progress
│   │   │
│   │   └── components/
│   │       ├── ui/                    # Shadcn/Radix primitives
│   │       ├── dashboard/             # Dashboard-specific components
│   │       │   ├── audit-report.tsx
│   │       │   ├── project-card.tsx
│   │       │   ├── score-chart.tsx
│   │       │   ├── threat-event-table.tsx
│   │       │   ├── threat-stats-cards.tsx
│   │       │   └── threat-timeline-chart.tsx
│   │       ├── landing/               # Landing page sections
│   │       └── blog/                  # Blog components
│   │
│   ├── public/
│   │   └── sdk/cv-threat.min.js       # Compiled threat detection snippet
│   │
│   ├── middleware.ts                  # Route protection + domain redirect
│   └── next.config.ts                 # Security headers, CSP, HSTS
│
├── supabase/
│   ├── functions/                     # 35+ Deno edge functions
│   │   ├── _shared/security.ts        # SSRF protection, auth, CORS
│   │   ├── security-headers-scanner/
│   │   ├── threat-scanner/
│   │   ├── sqli-scanner/
│   │   ├── xss-scanner/
│   │   ├── threat-ingest/             # Threat event ingestion
│   │   └── ... (32 more scanners)
│   │
│   └── migrations/                    # 35+ SQL migration files
│       ├── 20260131_create_scans.sql
│       ├── 20260209_security_fixes.sql
│       ├── 20260213_projects.sql
│       ├── 20260228_threat_detection.sql
│       └── ...
│
└── .github/                           # GitHub Actions workflows
```

---

## 16. Known Issues & Gotchas

### Things to Be Aware Of

1. **`dashboard/.env.local` is the only env file that matters** — the dashboard does NOT read the root `.env`

2. **Scan type IDs must match between frontend and backend** — use `vibe_match` and `threat_intelligence`, NOT `ai_detection` or `competitor`

3. **The landing page requires `'use client'`** — it uses Framer Motion's `useMotionValue`

4. **Supabase typed client doesn't know custom tables** — use `.from('table' as any)` and cast RPC results

5. **Shell has trouble with long JWT strings** — use Python urllib instead of curl for testing

6. **Dev server port conflicts** — when port 3000 is in use, Next.js tries 3001. Kill old processes first.

7. **API key auth bypasses CSRF** — by design, since API keys are already a form of authentication

8. **Edge functions use `--no-verify-jwt`** — custom auth via `x-scanner-key` header instead

9. **Webhook not tested end-to-end** — using live Stripe keys, no staging/test mode

10. **`COOKIE_SIGNING_SECRET` must be set** — falls back to empty string (fail-closed), needed for waitlist bypass

### Environment Variables Needed

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Scanner Auth
SCANNER_SECRET_KEY=<shared secret for edge functions>

# External APIs (for threat scanner)
GOOGLE_SAFE_BROWSING_API_KEY=...

# Other
CRON_SECRET=<bearer token for Vercel Cron>
COOKIE_SIGNING_SECRET=<for waitlist bypass>
ENCRYPTION_KEY=<64 hex chars for AES-256-GCM>
GITHUB_TOKEN=<needs security_events scope>
GEMINI_API_KEY=<for vibe scanner AI detection>
```
