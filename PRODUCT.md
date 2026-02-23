# CheckVibe — Complete Product Documentation

> **The #1 Fullstack Security Scanner for Vibecoded Websites**
> 30 security scanners. One click. Exposed API keys, SQL injection, XSS, and more.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Pricing & Plans](#4-pricing--plans)
5. [Scanner Suite (31 Scanners)](#5-scanner-suite-31-scanners)
6. [Scoring Methodology](#6-scoring-methodology)
7. [Scan Execution Flow](#7-scan-execution-flow)
8. [Project System](#8-project-system)
9. [Dashboard Pages](#9-dashboard-pages)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [API Keys System](#11-api-keys-system)
12. [Monitoring & Alerts](#12-monitoring--alerts)
13. [Integrations](#13-integrations)
14. [API Reference](#14-api-reference)
15. [Database Schema](#15-database-schema)
16. [Security Hardening](#16-security-hardening)
17. [Edge Functions](#17-edge-functions)
18. [Billing & Stripe Integration](#18-billing--stripe-integration)
19. [Free Tier Monetization](#19-free-tier-monetization)
20. [Deployment & Infrastructure](#20-deployment--infrastructure)
21. [Environment Variables](#21-environment-variables)
22. [Known Issues & Limitations](#22-known-issues--limitations)
23. [Future Roadmap](#23-future-roadmap)

---

## 1. Product Overview

**CheckVibe** is a full-stack security scanning platform that performs automated security audits on web applications. It runs 31 security scanners in parallel against any public URL, detecting vulnerabilities ranging from exposed API keys and SQL injection to misconfigured CORS, weak SSL/TLS, and domain hijacking risks.

### Core Value Proposition

- **One-click security audit** — Enter a URL, get a comprehensive security report
- **31 parallel scanners** — All run simultaneously with a 45-second timeout
- **Backend-aware** — Native scanning for Supabase, Firebase, and Convex backends
- **GitHub integration** — Scan repositories for exposed secrets, dependency vulnerabilities, and OpenSSF Scorecard
- **AI-powered fixes** — Claude AI generates remediation suggestions for each finding
- **Continuous monitoring** — Scheduled scans with alerting on score drops and new critical findings

### Target Users

- Solo makers shipping "vibecoded" projects
- Growing startups needing security validation
- Teams wanting automated security in their CI/CD pipeline
- Agencies auditing client projects

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Framer Motion (animations) |
| **UI Components** | Radix UI primitives, Lucide React icons, Sonner (toasts) |
| **Charts** | Recharts (score trends, history) |
| **3D Effects** | Three.js (landing page globe) |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Payments** | Stripe (subscriptions, checkout, webhooks) |
| **Serverless** | Deno Edge Functions (31 scanner functions) |
| **Email** | Resend (from: support@checkvibe.dev) |
| **AI** | Claude API (fix suggestions), Google Gemini (vibe scanner) |
| **Validation** | Zod (schema validation), React Hook Form |
| **HTML Parsing** | Cheerio (in scanner edge functions) |
| **Hosting** | Vercel (Next.js app), Supabase (DB + edge functions) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Next.js 16)               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Landing   │  │ Dashboard│  │ API Routes        │  │
│  │ Page      │  │ (Auth)   │  │ /api/scan         │  │
│  │           │  │          │  │ /api/projects     │  │
│  │           │  │          │  │ /api/keys         │  │
│  │           │  │          │  │ /api/monitoring   │  │
│  │           │  │          │  │ /api/stripe       │  │
│  └──────────┘  └──────────┘  └────────┬──────────┘  │
└───────────────────────────────────────┼──────────────┘
                                        │
                    ┌───────────────────┼──────────────────┐
                    │                   │                   │
              ┌─────▼─────┐   ┌────────▼────────┐   ┌─────▼─────┐
              │  Supabase  │   │ 31 Deno Edge    │   │  Stripe   │
              │  Database  │   │ Functions        │   │  Billing  │
              │  + Auth    │   │ (Scanners)       │   │           │
              └────────────┘   └─────────────────┘   └───────────┘
```

### Key Directories

```
VibeCode/
├── dashboard/                    # Next.js 16 application
│   ├── src/
│   │   ├── app/                  # App Router pages & API routes
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/            # Auth pages
│   │   │   ├── signup/
│   │   │   ├── dashboard/        # Authenticated dashboard
│   │   │   │   ├── page.tsx      # Projects grid
│   │   │   │   ├── [id]/         # Project detail (tabbed)
│   │   │   │   ├── api-keys/     # API key management
│   │   │   │   └── scans/        # Scan views
│   │   │   └── api/              # API routes
│   │   │       ├── scan/         # Scan CRUD + trigger
│   │   │       ├── projects/     # Project CRUD
│   │   │       ├── keys/         # API key management
│   │   │       ├── monitoring/   # Scheduled scans & alerts
│   │   │       ├── integrations/ # Webhooks
│   │   │       ├── stripe/       # Webhook handler
│   │   │       ├── dismissals/   # Finding dismissals
│   │   │       ├── badge/        # Embeddable badge
│   │   │       └── cron/         # Scheduled scan processor
│   │   ├── components/           # React components
│   │   └── lib/                  # Shared utilities
│   │       ├── supabase/         # DB client helpers
│   │       ├── api-keys.ts       # Key generation/hashing
│   │       ├── rate-limit.ts     # Sliding window limiter
│   │       └── api-auth.ts       # Unified auth resolver
│   └── .env.local                # Dashboard env vars (separate from root)
├── supabase/
│   ├── functions/                # 31 Deno edge functions
│   │   ├── security-headers-scanner/
│   │   ├── api-key-scanner/
│   │   ├── ssl-scanner/
│   │   ├── ... (28 more)
│   │   └── _shared/              # Shared utilities (CORS, security)
│   └── migrations/               # SQL migration files
└── package.json
```

---

## 4. Pricing & Plans

### Plan Comparison

| Feature | Free | Starter ($19/mo) | Pro ($39/mo) | Max ($79/mo) |
|---------|------|-------------------|--------------|--------------|
| Projects | 1 | 1 | 3 | 10 |
| Scans/month | 3 | 5 | 20 | 75 |
| Full scan suite | Blurred | Yes | Yes | Yes |
| Scan history | No | Yes | Yes | Yes |
| AI fix suggestions | No | Yes | Yes | Yes |
| Report export | No | Yes | Yes | Yes |
| Report sharing | No | No | Yes | Yes |
| API access | No | Yes | Yes | Yes |
| Scheduled scans | No | No | Yes | Yes |
| Webhook integrations | No | No | Yes | Yes |
| API rate limit | — | 10/min | 30/min | 100/min |
| Support | Community | Email | Priority | Dedicated |

### Annual Pricing (30% discount)

| Plan | Monthly | Annual (per month) | Annual Total |
|------|---------|-------------------|--------------|
| Starter | $19 | $13.30 | $159.60/yr |
| Pro | $39 | $27.30 | $327.60/yr |
| Max | $79 | $55.30 | $663.60/yr |

### Stripe Product IDs

| Plan | Product ID | Monthly Price ID | Annual Price ID |
|------|-----------|-----------------|----------------|
| Starter | `prod_Tww4QtoLP4LGh4` | `price_1Sz2CgLRbxIsl4HLE7jp6ecZ` | `price_1T1G35LRbxIsl4HLq1Geq4Ov` |
| Pro | `prod_Tww4j1OR1ONDTJ` | `price_1Sz2CjLRbxIsl4HLbs2LEaw0` | `price_1T1G36LRbxIsl4HLcxaSjnej` |
| Max | `prod_Tww4oXvwj9PmsN` | `price_1T1G99LRbxIsl4HLzT5TNktI` | `price_1T1G99LRbxIsl4HLfsEV74xC` |

---

## 5. Scanner Suite (31 Scanners)

All scanners are deployed as Supabase Deno Edge Functions and execute in parallel with a 45-second timeout.

### Security Core (Always Run)

| # | Scanner | Edge Function | Weight | What It Checks |
|---|---------|--------------|--------|---------------|
| 1 | **Security Headers** | `security-headers-scanner` | 0.08 | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy |
| 2 | **API Key Detection** | `api-key-scanner` | 0.06 | 100+ patterns: AWS, Stripe, OpenAI, GitHub, Supabase, Firebase, SendGrid, Twilio, etc. |
| 3 | **SSL/TLS** | `ssl-scanner` | 0.06 | Certificate chain validity, protocol versions, cipher suites, expiration |
| 4 | **SQL Injection** | `sqli-scanner` | 0.07 | URL parameter injection, form input analysis, error-based detection |
| 5 | **XSS** | `xss-scanner` | 0.07 | Reflected XSS, DOM-based XSS, stored XSS patterns in forms/URLs |
| 6 | **CORS** | `cors-scanner` | 0.04 | Wildcard origins, credential leakage, preflight configuration |
| 7 | **CSRF** | `csrf-scanner` | 0.04 | Token presence, SameSite cookie attribute, form protection |
| 8 | **Cookie Security** | `cookie-scanner` | 0.04 | HttpOnly, Secure, SameSite attributes, session cookie hardening |
| 9 | **Authentication** | `auth-scanner` | 0.04 | Login form analysis, password policies, MFA indicators, session management |
| 10 | **Open Redirect** | `redirect-scanner` | 0.03 | Unvalidated redirect parameters, URL manipulation vectors |
| 11 | **DNS & Email** | `dns-scanner` | 0.03 | SPF, DKIM, DMARC records, MX validation, DNSSEC |
| 12 | **Tech Stack** | `tech-scanner` | 0.03 | Framework detection, library versions, server software identification |
| 13 | **Legal Compliance** | `legal-scanner` | 0.01 | Privacy policy, terms of service, cookie policy, GDPR compliance indicators |
| 14 | **Threat Intelligence** | `threat-scanner` | 0.03 | Domain reputation, blocklist presence, malware association |

### Infrastructure & Hosting (Always Run, Auto-Detect)

| # | Scanner | Edge Function | Weight | What It Checks |
|---|---------|--------------|--------|---------------|
| 15 | **DDoS Protection** | `ddos-scanner` | 0.04 | WAF presence, CDN detection, rate limiting headers |
| 16 | **File Upload** | `upload-scanner` | 0.03 | Upload form security, file type validation, size limits |
| 17 | **Audit Logging** | `audit-scanner` | 0.02 | Monitoring infrastructure, logging endpoints, observability |
| 18 | **Mobile API** | `mobile-scanner` | 0.03 | Mobile API rate limiting, authentication patterns |
| 19 | **Domain Hijacking** | `domain-hijacking-scanner` | 0.03 | RDAP registration, NS integrity/diversity, typosquatting, zone exposure |
| 20 | **Vercel** | `vercel-scanner` | 0.02 | Vercel-specific headers, deployment configuration |
| 21 | **Netlify** | `netlify-scanner` | 0.02 | Netlify hosting indicators, redirect rules |
| 22 | **Cloudflare** | `cloudflare-scanner` | 0.02 | Cloudflare WAF, DDoS protection, SSL settings |
| 23 | **Railway** | `railway-scanner` | 0.02 | Railway hosting detection, configuration analysis |

### Backend Services (Conditional)

| # | Scanner | Edge Function | Weight | Condition |
|---|---------|--------------|--------|-----------|
| 24 | **Supabase Backend** | `supabase-scanner` | 0.04 | Always runs (detects Supabase via headers/scripts) |
| 25 | **Supabase Mgmt API** | `supabase-mgmt-scanner` | 0.04 | Requires `supabasePAT` + `supabaseUrl` in project config |
| 26 | **Firebase** | `firebase-scanner` | 0.04 | Requires `backendType === 'firebase'` |
| 27 | **Convex** | `convex-scanner` | 0.04 | Requires `backendType === 'convex'` |

### GitHub Integration (Requires GitHub Repo)

| # | Scanner | Edge Function | Weight | What It Checks |
|---|---------|--------------|--------|---------------|
| 28 | **GitHub Secrets** | `github-scanner` | 0.03 | Exposed credentials in repository code/history |
| 29 | **GitHub Security** | `github-security-scanner` | 0.03 | Dependabot alerts, code scanning, secret scanning status |
| 30 | **OpenSSF Scorecard** | `scorecard-scanner` | 0.02 | OpenSSF Scorecard security assessment (CI, review, deps) |
| 31 | **Dependencies** | `deps-scanner` | 0.03 | Known vulnerabilities in dependency tree |

### AI-Powered

| # | Scanner | Edge Function | Weight | What It Checks |
|---|---------|--------------|--------|---------------|
| — | **Vibe Scanner** | `vibe-scanner` | 0.02 | Google Gemini-powered analysis of code patterns and AI indicators |

---

## 6. Scoring Methodology

### Score Calculation

Each scanner returns a score from 0-100. The final score is a **weighted average** with a **dynamic denominator**:

```
final_score = Σ(scanner_score × scanner_weight) / Σ(active_scanner_weights)
```

**Dynamic denominator** means scanners that are skipped (due to missing configuration like no GitHub repo or no Supabase PAT) are excluded from the total weight, so they don't count as 0 and drag down the score.

### Score Tiers

| Score Range | Grade | Color |
|-------------|-------|-------|
| 80-100 | Excellent | Green/Emerald |
| 60-79 | Fair | Amber/Yellow |
| 40-59 | Needs Work | Orange |
| 0-39 | Critical | Red |

### Weight Distribution

| Category | Combined Weight | Scanners |
|----------|----------------|----------|
| **Critical** (0.07-0.08) | ~22% | Security headers, SQL injection, XSS |
| **High** (0.06) | ~12% | SSL/TLS, API key detection |
| **Medium** (0.04) | ~28% | CORS, CSRF, Cookies, Auth, Supabase, Firebase, Convex, DDoS |
| **Standard** (0.03) | ~24% | File upload, Mobile API, Domain hijacking, GitHub, Redirect, Deps, DNS, Threat, Tech |
| **Low** (0.02) | ~12% | Audit logging, Hosting scanners, Scorecard, Vibe |
| **Minimal** (0.01) | ~1% | Legal compliance |

---

## 7. Scan Execution Flow

```
User clicks "Run Audit"
        │
        ▼
┌──────────────────┐
│ POST /api/scan   │
│ (Next.js route)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ 1. Validate target URL       │  ← SSRF protection (block private IPs)
│ 2. Authenticate user         │  ← Session or API key
│ 3. Check scan limits         │  ← Plan quota enforcement
│ 4. Check domain limits       │  ← Per-plan domain count
│ 5. Merge project config      │  ← GitHub repo, backend type, etc.
│ 6. increment_scan_usage()    │  ← Atomic counter (no race conditions)
│ 7. register_scan_domain()    │  ← Atomic domain registration
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ INSERT scan (status=running) │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│ Call all 31 edge functions IN PARALLEL                │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Security │ │ API Key  │ │ SSL/TLS  │ │  ...   │  │
│  │ Headers  │ │ Scanner  │ │ Scanner  │ │ (×28)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │
│       │             │            │            │       │
│       ▼             ▼            ▼            ▼       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Each scanner authenticated via x-scanner-key    │ │
│  │ 45-second timeout per scanner                   │ │
│  │ Returns: { score, findings[], status, details } │ │
│  └─────────────────────────────────────────────────┘ │
└────────┬─────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Every 5 completions:                 │
│   UPDATE scans.scanners_completed    │  ← Real-time progress
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ All scanners complete:               │
│ 1. Merge all results → JSONB        │
│ 2. Calculate weighted score          │
│ 3. SET status='completed'            │
│ 4. SET overall_score                 │
│ 5. SET completed_at                  │
│ 6. Trigger webhooks (if configured)  │
│ 7. Evaluate alert rules              │
└──────────────────────────────────────┘
```

---

## 8. Project System

Projects are the core organizational unit. Each project links a URL with optional configuration for deeper scanning.

### Project Fields

| Field | Type | Description |
|-------|------|------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (FK to auth.users) |
| `name` | string | Display name (max 100 chars) |
| `url` | string | Target URL for scanning |
| `github_repo` | string | Optional GitHub repo (owner/repo format) |
| `backend_type` | enum | `none`, `supabase`, `firebase`, `convex` |
| `backend_url` | string | Backend URL (for Convex) |
| `supabase_pat` | string | Supabase Personal Access Token (for mgmt API scanner) |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update time |

### Project Limits by Plan

| Plan | Max Projects |
|------|-------------|
| Free | 1 |
| Starter | 1 |
| Pro | 3 |
| Max | 10 |

### How Projects Connect to Scans

- `scans.project_id` is a foreign key to `projects.id` (ON DELETE SET NULL)
- When scanning via a project, the project's config (GitHub repo, backend type, PAT) is merged into the scan request
- Scans triggered from a project skip domain registration (project already tracks the domain)
- All scans for a project appear in the project's History tab

---

## 9. Dashboard Pages

### Public Pages

| Route | Description |
|-------|------------|
| `/` | Landing page — hero section, feature highlights, scanner list, pricing table, CTAs |
| `/login` | Email/password login + Google OAuth |
| `/signup` | Registration with password validation |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |

### Authenticated Dashboard

| Route | Description |
|-------|------------|
| `/dashboard` | **Projects grid** — all projects with latest score, issue count, severity breakdown |
| `/dashboard/projects/new` | Create a new project |
| `/dashboard/api-keys` | API key management (create, list, revoke, view usage) |
| `/dashboard/docs` | API documentation |
| `/dashboard/credits` | Billing & plan upgrade |
| `/dashboard/changelog` | Feature update log |

### Project Detail (Tabbed Layout)

Each project has a shared header with favicon, project name, plan badge, and "Run Audit" button, plus horizontal tab navigation:

| Tab | Route | Description |
|-----|-------|------------|
| **Overview** | `/dashboard/[id]` | Status cards (score, last scan, issues, coverage), score trend chart, project config, top findings |
| **Report** | `/dashboard/[id]/report` | Full audit report with all findings, dismissals, AI fix suggestions, export to PDF, share link |
| **History** | `/dashboard/[id]/history` | Score-over-time chart (Recharts area chart), scan timeline with all past scans |
| **Monitoring** | `/dashboard/[id]/monitoring` | Scheduled scans (daily/weekly/monthly) + alert rules configuration |
| **Integrations** | `/dashboard/[id]/integrations` | Webhooks, GitHub Actions CI/CD snippet, security badge embed, Slack/Discord (coming soon) |
| **Settings** | `/dashboard/[id]/settings` | Project configuration form (URL, GitHub repo, backend type, Supabase PAT) |

### Legacy Routes (Still Functional)

| Route | Description |
|-------|------------|
| `/dashboard/scans` | All scans across projects (unlinked from nav) |
| `/dashboard/scans/new` | One-off scan entry |
| `/dashboard/scans/demo` | Pre-generated demo scan |
| `/dashboard/scans/[id]` | Individual scan detail |

---

## 10. Authentication & Authorization

### Auth Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Email/Pass   │     │ Google OAuth │     │ Password     │
│ Login/Signup │     │ (one-click)  │     │ Reset        │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────┐
│              Supabase Auth                           │
│  - JWT tokens in HTTP-only cookies                   │
│  - Chunked cookies: sb-{ref}-auth-token.{0,1,...}    │
│  - URL-encoded JSON values                           │
│  - SSR compatible via @supabase/ssr                  │
└──────────────────────────────────────────────────────┘
```

### Row Level Security (RLS)

All database tables enforce RLS so users can only access their own data:

- **profiles**: Users can read/update only their own profile
- **projects**: Users can CRUD only their own projects
- **scans**: Users can read/delete only their own scans
- **api_keys**: Users can manage only their own keys
- **dismissed_findings**: Users can manage only their own dismissals
- **scheduled_scans**: Users can manage only their own schedules
- **alert_rules**: Users can manage only their own alerts
- **project_webhooks**: Users can manage only their own webhooks

### Billing Protection

A database trigger (`prevent_billing_field_updates`) blocks any authenticated user from updating billing columns on the `profiles` table:
- `plan`, `plan_domains`, `plan_scans_limit`, `plan_scans_used`
- `plan_period_start`, `stripe_customer_id`, `stripe_subscription_id`
- Only `service_role` (server-side) can modify these fields

### CSRF Protection

- Origin header check on all POST/PUT/DELETE requests
- API key auth (`Bearer cvd_live_...`) bypasses CSRF check
- Localhost bypass requires `NODE_ENV=development` + exact match

---

## 11. API Keys System

### Key Format & Security

| Property | Value |
|----------|-------|
| **Format** | `cvd_live_<32-hex-chars>` |
| **Storage** | SHA-256 hash only (full key shown once at creation) |
| **Display** | Prefix only (`cvd_live_a1b2c3d4...`) |
| **Max keys per user** | 10 |
| **Default expiry** | 90 days (configurable: 1-365 days) |

### Scopes

| Scope | Permission |
|-------|-----------|
| `scan:read` | Read scan results and history |
| `scan:write` | Trigger new scans |
| `keys:read` | List API keys and usage |
| `keys:manage` | Create, update, and revoke keys |

### Rate Limits (Per Key)

| Plan | Requests/Minute |
|------|----------------|
| Starter | 10 |
| Pro | 30 |
| Max | 100 |

Uses a **sliding window** algorithm via the `rate_limit_windows` table.

### Restrictions

- **Domain allowlist**: Keys can be restricted to specific domains (inherit from plan or set custom)
- **IP/CIDR allowlist**: Optional IP address restrictions
- **Privilege escalation prevention**: Child keys cannot have broader scopes or domains than the parent

### Usage Tracking

All API key usage is logged to `api_key_usage_log`:
- Endpoint, HTTP method, status code
- IP address, timestamp
- Auto-cleanup after 90 days

---

## 12. Monitoring & Alerts

### Scheduled Scans

| Frequency | Description |
|-----------|------------|
| **Daily** | Runs every day at the specified UTC hour |
| **Weekly** | Runs every week on the specified day at the specified UTC hour |
| **Monthly** | Runs on the 1st of each month at the specified UTC hour |

- Requires Pro plan or above
- Processed by `/api/cron/scheduled-scans` (internal cron endpoint)
- Each scheduled scan has `next_run_at` calculated automatically

### Alert Rules

| Alert Type | Trigger | Example |
|------------|---------|---------|
| `score_drop` | Score decreases by N points from previous scan | "Alert me if score drops by 10+ points" |
| `new_critical` | A new critical-severity finding appears | "Alert me on any new critical finding" |
| `score_below` | Score falls below threshold | "Alert me if score goes below 60" |

- Notification delivery: Email to the user's registered email
- Each alert rule is per-project with enable/disable toggle
- Threshold is configurable per rule

---

## 13. Integrations

### Webhooks

- **Events**: `scan.completed`, `scan.started`, `score.changed`
- **Delivery**: HTTP POST to configured URL
- **Authentication**: HMAC-SHA256 signature using webhook-specific secret (`whsec_*`)
- **SSRF protection**: Private IP addresses blocked as webhook targets
- **Tracking**: `last_triggered_at` and `last_status` recorded per webhook
- **Rate limit**: 10 webhook creates/deletes per minute

### GitHub Actions CI/CD

The Integrations tab provides a copy-paste GitHub Actions workflow snippet:

```yaml
# Example: Run CheckVibe scan on every push
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run CheckVibe Audit
        run: |
          curl -X POST https://checkvibe.dev/api/scan \
            -H "Authorization: Bearer ${{ secrets.CHECKVIBE_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"url": "https://your-app.com", "projectId": "your-project-id"}'
```

### Security Badge

Embeddable HTML/Markdown badge showing current security score:

```html
<img src="https://checkvibe.dev/api/badge?projectId=YOUR_PROJECT_ID" alt="CheckVibe Security Score" />
```

- Auto-updates from latest scan
- Color matches score tier (green/amber/orange/red)

### Slack / Discord (Coming Soon)

- Direct channel notifications for scan results
- Alert rule integration planned

---

## 14. API Reference

### Authentication

All authenticated endpoints accept either:
1. **Session cookie** — Supabase Auth JWT (for dashboard usage)
2. **API key** — `Authorization: Bearer cvd_live_...` (for programmatic access)

### Scan Endpoints

#### `POST /api/scan` — Trigger a New Scan

```json
{
  "url": "https://example.com",
  "projectId": "uuid",          // optional, uses project config
  "githubRepo": "owner/repo",   // optional
  "backendType": "supabase",    // optional: none|supabase|firebase|convex
  "supabasePAT": "sbp_...",     // optional
  "supabaseUrl": "https://...", // optional
  "scanTypes": ["security_headers", "api_keys"]  // optional, default: all
}
```

**Response**: `{ id, status: "running", url, created_at }`

#### `GET /api/scan` — List Scans

Query params: `status`, `projectId`, `page`, `limit`

#### `GET /api/scan/[id]` — Get Scan Details

Returns full scan with all scanner results, score, findings.

#### `DELETE /api/scan/[id]` — Delete a Scan

#### `GET /api/scan/[id]/share` — Get/Create Public Share Link

#### `POST /api/scan/[id]/export` — Export Report to PDF

### Project Endpoints

#### `POST /api/projects` — Create Project

```json
{
  "name": "My App",
  "url": "https://myapp.com",
  "githubRepo": "owner/repo",
  "backendType": "supabase",
  "supabasePat": "sbp_..."
}
```

#### `GET /api/projects` — List All Projects

#### `GET /api/projects/[id]` — Get Project Details

#### `PATCH /api/projects/[id]` — Update Project

#### `DELETE /api/projects/[id]` — Delete Project

### API Key Endpoints

#### `POST /api/keys` — Create API Key

```json
{
  "name": "CI/CD Key",
  "scopes": ["scan:read", "scan:write"],
  "allowedDomains": ["myapp.com"],
  "allowedIps": ["1.2.3.4/32"],
  "expiresInDays": 90
}
```

**Response includes the full key only once** — store it securely.

#### `GET /api/keys` — List Keys (metadata only, no secrets)

#### `PATCH /api/keys/[id]` — Update Key (name, expiry, restrictions)

#### `DELETE /api/keys/[id]` — Revoke Key

#### `GET /api/keys/[id]/usage` — Get Key Usage Stats

#### `GET /api/keys/activity` — Total API Activity

### Monitoring Endpoints

#### `GET /api/monitoring?projectId=` — List Schedules & Alert Rules

#### `POST /api/monitoring` — Create/Update Schedule or Alert

```json
{
  "type": "schedule",
  "projectId": "uuid",
  "frequency": "daily",
  "hourUtc": 9
}
```

```json
{
  "type": "alert",
  "projectId": "uuid",
  "alertType": "score_drop",
  "threshold": 10,
  "notifyEmail": "user@example.com"
}
```

#### `DELETE /api/monitoring?id=&type=` — Delete Schedule or Alert

### Integration Endpoints

#### `GET /api/integrations/webhooks?projectId=` — List Webhooks

#### `POST /api/integrations/webhooks` — Create Webhook

```json
{
  "projectId": "uuid",
  "url": "https://hooks.example.com/checkvibe",
  "events": ["scan.completed"]
}
```

#### `DELETE /api/integrations/webhooks?id=` — Delete Webhook

### Dismissal Endpoints

#### `GET /api/dismissals` — List Dismissed Findings

#### `POST /api/dismissals` — Dismiss a Finding

```json
{
  "scanId": "uuid",
  "projectId": "uuid",
  "fingerprint": "finding-unique-id",
  "reason": "false_positive",
  "note": "This is expected behavior"
}
```

#### `DELETE /api/dismissals/[id]` — Un-dismiss a Finding

### Badge Endpoint

#### `GET /api/badge?projectId=` — Generate Security Score Badge (SVG)

### Stripe Webhook

#### `POST /api/stripe/webhook` — Stripe Event Handler

Processes:
- `checkout.session.completed` → Activate subscription plan
- `invoice.paid` → Reset monthly scan counter
- `customer.subscription.deleted` → Downgrade to free

---

## 15. Database Schema

### Core Tables

```sql
-- User profiles (billing & plan data)
profiles (
  id              UUID PRIMARY KEY (FK auth.users),
  plan            TEXT DEFAULT 'none',    -- none|starter|pro|max
  plan_domains    INT DEFAULT 1,
  plan_scans_limit INT DEFAULT 3,
  plan_scans_used  INT DEFAULT 0,
  plan_period_start TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  allowed_domains TEXT[],
  credits         INT DEFAULT 0,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)

-- Projects
projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL (FK auth.users),
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  github_repo     TEXT,
  backend_type    TEXT DEFAULT 'none',
  backend_url     TEXT,
  supabase_pat    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Security scan results
scans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL (FK auth.users),
  project_id        UUID (FK projects.id ON DELETE SET NULL),
  url               TEXT NOT NULL,
  status            TEXT DEFAULT 'pending',  -- pending|running|completed|failed
  overall_score     INT,
  results           JSONB,                   -- All scanner outputs
  scanners_completed INT DEFAULT 0,          -- Progress tracking
  public_id         TEXT,                    -- For sharing
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
)

-- Finding dismissals
dismissed_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  project_id      UUID,
  scan_id         UUID,
  fingerprint     TEXT NOT NULL,
  reason          TEXT,
  note            TEXT,
  scope           TEXT DEFAULT 'project',
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### Monitoring Tables

```sql
-- Scheduled scans
scheduled_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL (FK projects.id),
  user_id         UUID NOT NULL,
  frequency       TEXT NOT NULL,     -- daily|weekly|monthly
  hour_utc        INT DEFAULT 0,
  day_of_week     INT,               -- 0-6 for weekly
  enabled         BOOLEAN DEFAULT true,
  next_run_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Alert rules
alert_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL (FK projects.id),
  user_id         UUID NOT NULL,
  type            TEXT NOT NULL,     -- score_drop|new_critical|score_below
  threshold       INT,
  notify_email    TEXT,
  enabled         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Webhook integrations
project_webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL (FK projects.id),
  user_id         UUID NOT NULL,
  url             TEXT NOT NULL,
  events          TEXT[],
  secret          TEXT,              -- HMAC signing key
  enabled         BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status     INT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### API Keys Tables

```sql
-- API keys
api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,    -- SHA-256 of full key
  key_prefix      TEXT NOT NULL,           -- First 8 chars for display
  name            TEXT NOT NULL,
  scopes          TEXT[] NOT NULL,
  allowed_domains TEXT[],
  allowed_ips     TEXT[],
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Usage audit log
api_key_usage_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id          UUID NOT NULL,
  user_id         UUID NOT NULL,
  endpoint        TEXT,
  method          TEXT,
  ip_address      TEXT,
  status_code     INT,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Sliding window rate limiting
rate_limit_windows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier      TEXT NOT NULL,    -- key:<id>, user:<id>, ip:<addr>
  window_start    TIMESTAMPTZ NOT NULL,
  request_count   INT DEFAULT 1,
  UNIQUE(identifier, window_start)
)
```

### System Tables

```sql
-- Webhook idempotency
processed_webhook_events (
  event_id        TEXT PRIMARY KEY,
  processed_at    TIMESTAMPTZ DEFAULT now()
)
```

### Key Database Functions (RPC)

| Function | Purpose |
|----------|---------|
| `increment_scan_usage(p_user_id)` | Atomically increment scan counter (prevents race conditions) |
| `register_scan_domain(p_user_id, p_domain)` | Atomically register domain to user's allowed list |
| `check_project_limit(p_user_id)` | Returns `{allowed, current_count, project_limit}` |
| `check_rate_limit(p_identifier, p_limit)` | Sliding window rate limit check |
| `validate_api_key(p_key_hash)` | Validate key hash, check expiry/revocation |
| `cleanup_rate_limit_windows()` | Remove expired rate limit entries |
| `cleanup_usage_logs()` | Remove API key usage logs older than 90 days |
| `cleanup_processed_events()` | Remove old webhook event records |

---

## 16. Security Hardening

### Application Security

| Protection | Implementation |
|-----------|---------------|
| **SSRF Prevention** | `_shared/security.ts` validates URLs against private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1) |
| **CSRF Protection** | Origin header validation on mutating requests; API key auth bypasses CSRF |
| **Content Security Policy** | `script-src 'self' 'unsafe-inline' 'unsafe-eval'`; connect-src to Supabase + Stripe; `frame-ancestors 'none'` |
| **HSTS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| **Input Validation** | Zod schemas on all API inputs; project names max 100 chars; backend type allowlist |
| **Error Sanitization** | Generic error messages for auth (prevents account enumeration); error boundary hides `error.message` |
| **Cookie Signing** | `COOKIE_SIGNING_SECRET` env var (fails closed to empty string) |

### Database Security

| Protection | Implementation |
|-----------|---------------|
| **Row Level Security** | Every table has RLS policies scoped to `auth.uid()` |
| **Billing Trigger** | `prevent_billing_field_updates` blocks client-side plan manipulation |
| **Atomic Operations** | `increment_scan_usage()` and `register_scan_domain()` prevent TOCTOU races |
| **Function Privileges** | SECURITY DEFINER functions have EXECUTE revoked from `authenticated`/`anon` roles |
| **Search Path** | Security-critical functions use explicit `SET search_path = public` |
| **Policy WITH CHECK** | Dismissed findings policy includes INSERT check clause |

### Edge Function Security

| Protection | Implementation |
|-----------|---------------|
| **Authentication** | `x-scanner-key` header required (shared secret in `SCANNER_SECRET_KEY`) |
| **CORS** | `ALLOWED_ORIGIN` env var (default: checkvibe.dev), not wildcard `*` |
| **Timeouts** | 15s for page fetch, 30s for Gemini API calls, 45s overall per scanner |
| **JWT verification** | Deployed with `--no-verify-jwt` (authenticated via scanner key instead) |

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Stripe checkout | 5/min |
| Stripe portal | 5/min |
| Scan export | 10/min |
| Dismissals | 30/min |
| Webhook CRUD | 10/min |
| API key endpoints | Per-plan (10/30/100 per min) |

### Webhook Security

| Protection | Implementation |
|-----------|---------------|
| **Idempotency** | `processed_webhook_events` table (event marked processed AFTER business logic succeeds) |
| **Signature Validation** | Stripe webhook signature verified before processing |
| **Metadata Validation** | Webhook metadata validated against known plan names/limits (prevents plan escalation) |

---

## 17. Edge Functions

All 31 scanner edge functions live in `supabase/functions/` and share common utilities from `_shared/`.

### Shared Utilities (`_shared/`)

| File | Purpose |
|------|---------|
| `cors.ts` | CORS header management using `ALLOWED_ORIGIN` env var |
| `security.ts` | SSRF protection — `isPrivateHostname()` blocks private IP ranges |

### Edge Function Structure

Each scanner follows this pattern:

```typescript
import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate via scanner key
  const scannerKey = req.headers.get("x-scanner-key");
  if (scannerKey !== Deno.env.get("SCANNER_SECRET_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { url, ...config } = await req.json();

  // Scanner-specific logic...
  const findings = [];
  let score = 100;

  // Deduct points for each finding
  findings.push({
    severity: "high",
    title: "Missing CSP Header",
    description: "...",
    recommendation: "..."
  });
  score -= 15;

  return new Response(
    JSON.stringify({ score, findings, status: "completed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
```

### Deployment

```bash
# Deploy all functions
supabase functions deploy --no-verify-jwt

# Deploy single function
supabase functions deploy security-headers-scanner --no-verify-jwt
```

---

## 18. Billing & Stripe Integration

### Checkout Flow

```
User selects plan on pricing page
        │
        ▼
POST /api/stripe/checkout
  → Creates Stripe Checkout Session
  → Metadata: { userId, plan, priceId }
  → Redirects to Stripe hosted checkout
        │
        ▼
User completes payment on Stripe
        │
        ▼
Stripe sends webhook: checkout.session.completed
        │
        ▼
POST /api/stripe/webhook
  → Verify signature
  → Check idempotency (processed_webhook_events)
  → Validate metadata against known plans
  → UPDATE profiles SET plan, plan_domains, plan_scans_limit, stripe_*
  → Mark event as processed
```

### Monthly Reset Flow

```
Stripe sends webhook: invoice.paid
        │
        ▼
POST /api/stripe/webhook
  → Verify signature
  → Check idempotency
  → UPDATE profiles SET plan_scans_used = 0, plan_period_start = now()
```

### Cancellation Flow

```
Stripe sends webhook: customer.subscription.deleted
        │
        ▼
POST /api/stripe/webhook
  → UPDATE profiles SET plan = 'none', reset limits to free tier
```

---

## 19. Free Tier Monetization

### Strategy

The free tier is designed as a conversion funnel:

1. **Allow scanning** — 3 scans/month, 1 project
2. **Show value** — Display issue counts and severity distribution
3. **Gate details** — Finding descriptions and recommendations are blurred
4. **Upsell** — "Upgrade to see details" CTAs throughout the report
5. **Restrict features** — No export, no sharing, no API keys, no monitoring

### What Free Users See vs. Paid Users

| Feature | Free | Paid |
|---------|------|------|
| Overall score | Visible | Visible |
| Issue count | Visible | Visible |
| Severity breakdown | Visible | Visible |
| Finding titles | Blurred | Visible |
| Finding descriptions | Blurred | Visible |
| Recommendations | Blurred | Visible |
| AI fix suggestions | Locked | Available |
| Export to PDF | Locked | Available |
| Share report link | Locked | Available (Pro+) |
| Scan history | Last scan only | Full history |

---

## 20. Deployment & Infrastructure

### Production Environment

| Service | Provider | URL |
|---------|----------|-----|
| Web App | Vercel | checkvibe.dev |
| Database | Supabase | vlffoepzknlbyxhkmwmn.supabase.co |
| Edge Functions | Supabase | vlffoepzknlbyxhkmwmn.supabase.co/functions/v1/* |
| Email | Resend | support@checkvibe.dev |
| Payments | Stripe | Live keys |
| AI (Vibe) | Google Gemini | Gemini API |
| AI (Fixes) | Anthropic | Claude API |

### Dashboard Configuration

The dashboard (`/dashboard`) runs as a Next.js 16 app with its own `.env.local` file (separate from root `.env`). It does NOT read environment variables from the repository root.

---

## 21. Environment Variables

### Dashboard `.env.local`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `SCANNER_KEY` | Authenticates requests to edge functions |
| `COOKIE_SIGNING_SECRET` | Signs cookies for integrity |
| `OPENAI_API_KEY` | AI fix suggestions |
| `GITHUB_TOKEN` | GitHub API access (needs `security_events` scope) |
| `NEXT_PUBLIC_APP_URL` | Application base URL |

### Supabase Edge Function Secrets

| Variable | Purpose |
|----------|---------|
| `SCANNER_SECRET_KEY` | Validates `x-scanner-key` header |
| `ALLOWED_ORIGIN` | CORS origin whitelist (default: checkvibe.dev) |
| `GEMINI_API_KEY` | Google Gemini API for vibe-scanner |
| `GITHUB_TOKEN` | GitHub API access for repo scanners |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI authentication |

---

## 22. Known Issues & Limitations

### Active Issues

| Issue | Impact | Status |
|-------|--------|--------|
| `GITHUB_TOKEN` missing `security_events` scope | GitHub Security scanner returns degraded results | Needs token update |
| `supabase_pat` stored in plaintext | Sensitive PATs visible in DB | Should encrypt at app layer |
| DNS rebinding not mitigated | SSRF checks validate hostname strings, not resolved IPs | Architecture limitation |
| `WHOISXML_API_KEY` empty | Unused by any scanner | Low priority |
| SEO scanner not deployed | Local code only, not wired as edge function | Deferred |
| Edge functions use `--no-verify-jwt` | Auth via scanner key instead of JWT | By design |
| Webhook system not e2e tested | Using live Stripe keys | Needs test coverage |

### Technical Gotchas

- Shell has trouble with long JWT strings in curl headers — use Python urllib instead
- Next.js `middleware.ts` deprecated in v16 in favor of `proxy`, but still works
- When dev server port 3000 is in use, Next.js tries 3001 — kill old process first
- `dashboard/src/app/page.tsx` requires `'use client'` directive (uses `useMotionValue`)
- Supabase typed client doesn't know custom tables — use `.from('table' as any)` and cast RPC results

---

## 23. Future Roadmap

### Planned Features

| Feature | Status |
|---------|--------|
| Slack notifications | Coming soon |
| Discord webhooks | Coming soon |
| Team collaboration & RBAC | Planned |
| Custom scan scheduling (beyond daily/weekly/monthly) | Planned |
| Bulk domain scanning | Planned |
| SLA monitoring | Planned |
| Advanced reporting & PDF customization | Planned |
| SEO scanner deployment | Deferred |
| Machine learning anomaly detection | Planned |
| Custom security policy validation | Planned |
| Supabase PAT encryption at rest | Planned |

### Scanner Enhancements

- Extended API key pattern library (200+ patterns)
- GraphQL introspection depth scanning
- WebSocket security analysis
- Server-Sent Events (SSE) security
- Third-party service integration checks
- Custom regex-based secret scanning

---

*Last updated: 2026-02-23*
*CheckVibe v8 — 31 scanners deployed*
