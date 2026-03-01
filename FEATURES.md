# CheckVibe — Complete Feature Guide

> Every feature explained. How it works, what it does, and why it matters.

---

## Table of Contents

1. [One-Click Security Scanning](#1-one-click-security-scanning)
2. [31+ Security Scanners](#2-31-security-scanners)
3. [Threat Detection & Intelligence](#3-threat-detection--intelligence)
4. [API Key & Secret Leak Detection](#4-api-key--secret-leak-detection)
5. [AI-Powered Fix Suggestions](#5-ai-powered-fix-suggestions)
6. [Vibe Detection (AI Code Detector)](#6-vibe-detection-ai-code-detector)
7. [Project Management System](#7-project-management-system)
8. [Security Score & Grading](#8-security-score--grading)
9. [Scan History & Trend Tracking](#9-scan-history--trend-tracking)
10. [Report Export & Sharing](#10-report-export--sharing)
11. [Finding Dismissals](#11-finding-dismissals)
12. [Scheduled Scans (Monitoring)](#12-scheduled-scans-monitoring)
13. [Alert Rules & Notifications](#13-alert-rules--notifications)
14. [Webhook Integrations](#14-webhook-integrations)
15. [CI/CD Integration (GitHub Actions)](#15-cicd-integration-github-actions)
16. [Security Badge](#16-security-badge)
17. [API Key Management (Developer API)](#17-api-key-management-developer-api)
18. [Backend-Aware Scanning](#18-backend-aware-scanning)
19. [GitHub Repository Scanning](#19-github-repository-scanning)
20. [Hosting Platform Detection](#20-hosting-platform-detection)
21. [Authentication & Google OAuth](#21-authentication--google-oauth)
22. [Stripe Billing & Subscriptions](#22-stripe-billing--subscriptions)
23. [Free Tier & Conversion Funnel](#23-free-tier--conversion-funnel)
24. [MCP Server (AI Agent Integration)](#24-mcp-server-ai-agent-integration)
25. [Outreach Email Generator](#25-outreach-email-generator)
26. [Landing Page & Blog](#26-landing-page--blog)

---

## 1. One-Click Security Scanning

### What It Does
Enter any public URL and get a full security audit in under 60 seconds. No setup, no configuration — just paste a URL and click **"Run Audit"**.

### How It Works
1. You enter a target URL (e.g. `https://your-app.com`)
2. The system validates the URL and performs **SSRF protection** (blocks private IP ranges like `10.x`, `192.168.x`, `127.0.0.1`)
3. Checks your plan's scan quota and domain limits
4. Atomically increments your scan counter (prevents race conditions)
5. Fires **all 31+ scanners in parallel** as Supabase Edge Functions
6. Each scanner has a **45-second timeout** and returns independently
7. Progress updates every 5 scanner completions (real-time progress bar)
8. Results are merged, weighted score is calculated, and the report is saved

### Key Details
- **Endpoint**: `POST /api/scan`
- **Authentication**: Session cookie (dashboard) or API key (`Bearer cvd_live_...`)
- **SSRF Protection**: Blocks scanning of internal/private networks
- **Progress Tracking**: `scanners_completed` field updates in real-time

---

## 2. 31+ Security Scanners

Every scan runs **31+ specialized scanners simultaneously**. Each scanner is a standalone Deno Edge Function deployed on Supabase.

### Security Core (Always Run)

| Scanner | What It Checks |
|---------|---------------|
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy |
| **API Key Detection** | 100+ patterns: AWS, Stripe, OpenAI, GitHub, Supabase, Firebase, SendGrid, Twilio, etc. |
| **SSL/TLS** | Certificate chain validity, protocol versions, cipher suites, expiration dates |
| **SQL Injection** | URL parameter injection, form input analysis, error-based detection |
| **XSS (Cross-Site Scripting)** | Reflected XSS, DOM-based XSS, stored XSS patterns in forms/URLs |
| **CORS** | Wildcard origins, credential leakage, preflight misconfiguration |
| **CSRF** | Token presence, SameSite cookie attributes, form protection |
| **Cookie Security** | HttpOnly, Secure, SameSite attributes, session cookie hardening |
| **Authentication Audit** | Login form analysis, password policies, MFA indicators, session management |
| **Open Redirect** | Unvalidated redirect parameters, URL manipulation vectors |
| **DNS & Email Security** | SPF, DKIM, DMARC records, MX validation, DNSSEC |
| **Tech Stack Detection** | Framework detection, library versions, server software identification |
| **Legal Compliance** | Privacy policy, terms of service, cookie policy, GDPR compliance indicators |
| **Threat Intelligence** | Domain reputation, blocklist presence, malware association |

### Infrastructure & Hosting Scanners

| Scanner | What It Checks |
|---------|---------------|
| **DDoS Protection** | WAF presence, CDN detection, rate limiting headers |
| **File Upload Security** | Upload form security, file type validation, size limits |
| **Audit Logging** | Monitoring infrastructure, logging endpoints, observability |
| **Mobile API** | Mobile API rate limiting, authentication patterns |
| **Domain Hijacking** | RDAP registration, nameserver integrity/diversity, typosquatting, zone exposure |
| **Debug Endpoints** | Exposed debug routes, development tools left in production |

### Hosting Platform Scanners

| Scanner | What It Checks |
|---------|---------------|
| **Vercel** | Vercel-specific security headers, deployment configuration |
| **Netlify** | Netlify hosting indicators, redirect rules |
| **Cloudflare** | Cloudflare WAF, DDoS protection, SSL settings |
| **Railway** | Railway hosting detection, configuration analysis |

### Backend Service Scanners (Conditional)

| Scanner | When It Runs | What It Checks |
|---------|-------------|---------------|
| **Supabase** | Always (auto-detects via headers/scripts) | RLS policies, exposed service keys, auth config |
| **Supabase Management API** | When PAT + URL configured | Project security settings via management API |
| **Firebase** | When backend type set to Firebase | Firestore rules, auth config, storage rules |
| **Convex** | When backend type set to Convex | Convex-specific security patterns |

### Advanced Scanners

| Scanner | What It Checks |
|---------|---------------|
| **GraphQL** | Introspection exposure, query depth limits, rate limiting |
| **JWT Audit** | Token structure, algorithm validation, expiration policies |
| **AI/LLM Vulnerability** | Prompt injection risks, AI-specific attack surfaces |

### How Each Scanner Works
Every scanner follows the same pattern:
1. Receives target URL + configuration via authenticated request (`x-scanner-key` header)
2. Fetches the target page and analyzes response headers, HTML, JS bundles, and network behavior
3. Starts with a score of **100** and deducts points for each finding
4. Returns findings with **severity** (critical/high/medium/low/info), title, description, and recommendation
5. 45-second timeout — if a scanner fails, it's excluded from the score calculation

---

## 3. Threat Detection & Intelligence

### What It Does
Checks if the target domain has been flagged by security databases, is on any blocklists, or has malware associations.

### How It Works
- Queries domain reputation databases and threat intelligence feeds
- Checks blocklist presence across multiple providers
- Analyzes domain age, registration patterns, and hosting anomalies
- Results are displayed in a **Threat Intelligence dashboard** with:
  - **Threat Stats Cards** — counts of critical, high, medium threats
  - **Threat Timeline Chart** — visual timeline of threat events
  - **Threat Event Table** — detailed list of all detected threats

### Dashboard View
The threat data is displayed via dedicated components:
- `threat-stats-cards.tsx` — Summary cards showing threat counts by severity
- `threat-timeline-chart.tsx` — Recharts-based timeline visualization
- `threat-event-table.tsx` — Sortable/filterable table of all events

### API Endpoint
`GET /api/threats` — Retrieve threat data for a project with timeline, stats, and event details.

---

## 4. API Key & Secret Leak Detection

### What It Does
Scans client-side code for **100+ patterns** of accidentally exposed API keys, secrets, tokens, and credentials.

### What It Detects

| Category | Examples |
|----------|---------|
| **Cloud Providers** | AWS Access Keys, Google Cloud API Keys, Azure Connection Strings, DigitalOcean Tokens |
| **Payments** | Stripe Secret Keys, PayPal Client IDs, Square Access Tokens |
| **Backend Services** | Supabase Service Role Keys, Firebase Admin SDKs, MongoDB Connection Strings |
| **AI Services** | OpenAI API Keys, Anthropic Keys, Google Gemini Keys |
| **Communication** | Twilio SID & Auth Tokens, SendGrid API Keys, Mailchimp Keys |
| **Auth** | JWT Secrets, OAuth Client Secrets, Private Keys (RSA, SSH) |

### Where It Scans
- HTML source code
- JavaScript bundles (including minified)
- Source maps (if exposed)
- Inline `<script>` tags
- Meta tags
- localStorage/sessionStorage patterns
- Network request patterns

### How It Works
Uses **regex pattern matching** and **entropy analysis** to detect secrets. Each finding includes:
- The type of key detected (e.g., "Stripe Secret Key")
- The severity level (Critical for secret keys, High for publishable keys)
- The exact location in the code
- Remediation steps and links to the provider's key rotation page

---

## 5. AI Fix Prompt Generator

### What It Does
Generates a detailed, structured **remediation prompt** from your scan findings that you can copy-paste directly into your AI coding assistant (Cursor, Windsurf, Claude, etc.) to fix all security issues automatically.

### How It Works
1. In the audit report, click **"Generate AI Fix Prompt"**
2. CheckVibe builds a formatted markdown prompt that includes:
   - All critical, high, and lower-severity findings organized by priority
   - Framework-specific fix guidance (auto-detected from your tech stack scan)
   - Step-by-step instructions for the AI to follow
3. Click **"Copy Prompt"** to copy it to your clipboard
4. Paste it into your AI coding tool — it will fix the issues in your codebase

### Framework Detection
The prompt automatically detects your tech stack and tailors the guidance. Supported frameworks:
- **Next.js** — `next.config.js` headers, middleware CSRF, env variable handling
- **Express.js** — Helmet, rate limiting, csurf middleware
- **Django** — CSRF middleware, secure cookies, HSTS settings
- **Laravel** — Blade `@csrf`, Sanctum, CORS config
- **Rails** — `protect_from_forgery`, `rack-cors`, credentials
- **Flask** — Talisman, flask-wtf, flask-cors
- **Vue/Nuxt** — Nuxt route rules, cookie auth, env variables
- **React (SPA)** — Hosting-level headers, CSP meta tags, API proxying

### Key Details
- **No API key needed** — no external AI calls are made; the prompt is generated locally
- **Plan Requirement**: Starter plan and above (locked for free users)
- **Component**: `ai-fix-prompt.tsx` — builds the prompt and handles copy-to-clipboard
- The prompt is context-aware — it pulls in detected technologies, severity levels, and framework-specific best practices

---

## 6. Vibe Detection (AI Code Detector)

### What It Does
Uses **Google Gemini AI** to analyze whether a website was built using AI coding tools ("vibecoded"). Detects telltale patterns of AI-generated code and design.

### What It Analyzes
- **Code Patterns**: Boilerplate from AI tools, comment styles typical of AI generation, over-engineered solutions, unused imports
- **Design Elements**: AI-typical layouts (Tailwind defaults, shadcn/ui patterns), generic hero sections, overuse of gradients/glassmorphism
- **Content Indicators**: AI-generated copy patterns, placeholder text, generic meta descriptions
- **Structure**: Template-like architecture, naming conventions typical of AI generation

### How It Works
1. Fetches the target page's HTML and JavaScript
2. Sends the code to **Google Gemini API** for analysis
3. Gemini evaluates multiple signals and returns a confidence score
4. Results include:
   - **Vibe Score** (0-100) — probability the site was AI-generated
   - Individual confidence ratings for code, design, content, and structure
5. 30-second timeout for the Gemini API call

### Edge Function
`vibe-scanner` — Weight: 0.02 in the overall score

---

## 7. Project Management System

### What It Does
Organize all your scanned websites into **projects**. Each project is a container for a URL with optional configuration for deeper scanning.

### Features
- **Create projects** with a name, URL, and optional configurations
- **Link GitHub repositories** for code-level scanning
- **Set backend type** (Supabase, Firebase, Convex) for service-specific scanning
- **Add Supabase PAT** for management API scanning
- **Tabbed project view** with Overview, Report, History, Monitoring, Integrations, and Settings

### Project Limits by Plan

| Plan | Max Projects |
|------|-------------|
| Free | 1 |
| Starter | 1 |
| Pro | 3 |
| Max | 10 |

### How Projects Connect to Scans
- When you scan from a project, all project configuration (GitHub repo, backend type, PAT) is automatically merged into the scan
- All scan history is tracked per-project with a score trend chart
- Project cards on the dashboard show latest score, issue count, and severity breakdown

### Dashboard Components
- `project-card.tsx` — Rich card showing project status, score, and issue breakdown
- `project-settings-form.tsx` — Configuration form for URL, GitHub, backend type
- `project-tab-nav.tsx` — Horizontal tab navigation for project detail views
- `project-search.tsx` — Search/filter projects on the dashboard

---

## 8. Security Score & Grading

### What It Does
Every scan produces a single **weighted security score** from 0-100, broken down into severity tiers.

### How the Score Is Calculated

```
final_score = Σ(scanner_score × scanner_weight) / Σ(active_scanner_weights)
```

**Key concept — Dynamic Denominator**: Scanners that are skipped (e.g., no GitHub repo configured, no Supabase PAT) are excluded from the total weight. This means missing configurations don't drag down your score.

### Score Tiers

| Score | Grade | Color |
|-------|-------|-------|
| 80-100 | Excellent | 🟢 Green |
| 60-79 | Fair | 🟡 Amber |
| 40-59 | Needs Work | 🟠 Orange |
| 0-39 | Critical | 🔴 Red |

### Weight Distribution
- **Critical (0.07-0.08)**: Security Headers, SQL Injection, XSS — ~22% of total
- **High (0.06)**: SSL/TLS, API Key Detection — ~12%  
- **Medium (0.04)**: CORS, CSRF, Cookies, Auth, Backend Scanners, DDoS — ~28%
- **Standard (0.03)**: File Upload, Mobile API, Domain Hijacking, GitHub, etc. — ~24%
- **Low (0.02)**: Audit Logging, Hosting Scanners, Scorecard, Vibe — ~12%
- **Minimal (0.01)**: Legal Compliance — ~1%

### Dashboard Display
- `score-chart.tsx` — Large circular score visualization with color-coded tier
- `scanner-accordion.tsx` — Expandable accordion showing each scanner's individual results, score, and findings

---

## 9. Scan History & Trend Tracking

### What It Does
Track how your security score changes over time. Every scan is recorded, and the History tab shows a visual score timeline.

### Features
- **Score-over-time chart** — Recharts area chart showing score progression
- **Scan timeline** — Chronological list of all past scans with status, score, and issue counts
- **Compare scans** — See what changed between two scans
- **Full scan archive** — Access to every scan ever run for a project

### Plan Requirements

| Plan | Scan History |
|------|-------------|
| Free | Last scan only |
| Starter+ | Full history |

### How It Works
Every scan creates a row in the `scans` table with:
- Timestamp, score, status, full results (JSONB), scanner progress
- Linked to project via `project_id` foreign key
- Score trend data is aggregated and rendered via Recharts

---

## 10. Report Export & Sharing

### What It Does
Export full audit reports as **PDF** or generate **shareable links** so others can view your results.

### PDF Export
- Click the **Export** button on any completed scan
- Generates a downloadable PDF with all findings, scores, and recommendations
- Rate limited: 10 exports per minute
- **Component**: `export-button.tsx`

### Report Sharing
- Generate a **public share link** for any scan
- Anyone with the link can view the read-only report (no login required)
- Each shared report gets a unique `public_id`
- **Component**: `share-button.tsx`
- **Route**: `/report/[publicId]`
- **Plan requirement**: Pro and above

### API Endpoints
- `POST /api/scan/[id]/export` — Generate PDF
- `GET /api/scan/[id]/share` — Get or create public share link

---

## 11. Finding Dismissals

### What It Does
Dismiss specific findings as **false positives** or **accepted risks** so they don't clutter future reports.

### How It Works
1. In the audit report, click **"Dismiss"** on any finding
2. Select a reason: `false_positive`, `accepted_risk`, `mitigated`, `not_applicable`
3. Optionally add a note explaining why
4. The finding is grayed out in future scans for the same project
5. Dismissals are scoped to a project — they persist across scans

### Key Details
- **Fingerprint-based**: Each finding has a unique fingerprint. Dismissals match on this fingerprint, so even if you re-scan, the same finding stays dismissed
- **Undismissable**: Click to un-dismiss if the situation changes
- **Rate limited**: 30 dismissals per minute
- **Component**: `audit-report-with-dismissals.tsx`
- **API**: `POST /api/dismissals` (create), `DELETE /api/dismissals/[id]` (undo)

---

## 12. Scheduled Scans (Monitoring)

### What It Does
Set up **automated recurring scans** so your projects are continuously monitored without manual intervention.

### Frequencies

| Schedule | When It Runs |
|----------|-------------|
| **Daily** | Every day at the specified UTC hour |
| **Weekly** | Every week on the specified day at the specified hour |
| **Monthly** | On the 1st of each month at the specified hour |

### How It Works
1. Go to a project's **Monitoring** tab
2. Set scanning frequency and preferred time
3. The system calculates `next_run_at` automatically
4. A cron job (`/api/cron/scheduled-scans`) processes due scans
5. Results appear in the project's scan history like any manual scan

### Plan Requirement
Pro plan and above.

---

## 13. Alert Rules & Notifications

### What It Does
Get **email notifications** when something important changes in your security posture.

### Alert Types

| Alert | Trigger | Example |
|-------|---------|---------|
| **Score Drop** | Score decreases by N points | "Alert when score drops by 10+ points" |
| **New Critical Finding** | A new critical-severity finding appears | "Alert on any new critical finding" |
| **Score Below Threshold** | Score falls below a set value | "Alert when score goes below 60" |

### How It Works
1. Go to a project's **Monitoring** tab
2. Create alert rules with custom thresholds
3. After each scan, the system evaluates all alert rules
4. If triggered, an email is sent to your registered email via **Resend**
5. Each alert rule can be enabled/disabled independently

### Email Delivery
- Provider: **Resend**
- From address: `support@checkvibe.dev`

---

## 14. Webhook Integrations

### What It Does
Send real-time HTTP POST notifications to your own servers or services whenever scan events occur.

### Supported Events
| Event | When It Fires |
|-------|-------------|
| `scan.started` | A new scan begins |
| `scan.completed` | A scan finishes |
| `score.changed` | Score differs from previous scan |

### How It Works
1. Go to a project's **Integrations** tab
2. Add a webhook URL (e.g., `https://hooks.slack.com/...`)
3. Select which events to subscribe to
4. Each webhook gets a unique **signing secret** (`whsec_*`)
5. Every delivery includes an **HMAC-SHA256 signature** for verification
6. Track `last_triggered_at` and `last_status` for each webhook

### Security Features
- **HMAC-SHA256 signing** — Verify webhook authenticity in your receiver
- **SSRF protection** — Private IP addresses are blocked as webhook targets
- **Rate limiting** — 10 webhook creates/deletes per minute
- **Idempotency** — Duplicate events are prevented

---

## 15. CI/CD Integration (GitHub Actions)

### What It Does
Run CheckVibe scans automatically in your **CI/CD pipeline** on every push or pull request.

### How It Works
The Integrations tab provides a **copy-paste GitHub Actions workflow**:

```yaml
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

### What You Need
- A CheckVibe **API key** with `scan:write` scope
- Store the key as a GitHub repository secret (`CHECKVIBE_API_KEY`)
- Starter plan or above (free plan doesn't include API access)

---

## 16. Security Badge

### What It Does
Embed a **live security score badge** on your website or README that auto-updates with every scan.

### How It Works
1. Go to a project's **Integrations** tab
2. Copy the badge embed code (HTML or Markdown)
3. The badge is a dynamically generated **SVG** from `/api/badge?projectId=YOUR_ID`
4. Color matches the score tier:
   - 🟢 Green (80-100)
   - 🟡 Amber (60-79)
   - 🟠 Orange (40-59)
   - 🔴 Red (0-39)

### Embed Formats
```html
<!-- HTML -->
<img src="https://checkvibe.dev/api/badge?projectId=YOUR_ID" alt="CheckVibe Score" />
```
```markdown
<!-- Markdown -->
![CheckVibe Score](https://checkvibe.dev/api/badge?projectId=YOUR_ID)
```

---

## 17. API Key Management (Developer API)

### What It Does
Create and manage **API keys** for programmatic access to CheckVibe. Trigger scans, read results, and integrate with your workflow — all via API.

### Key Format
- Pattern: `cvd_live_<32-hex-chars>`
- **Stored as SHA-256 hash** — the full key is shown only once at creation
- Display: prefix only (`cvd_live_a1b2c3d4...`)
- Max 10 keys per user
- Default expiry: 90 days (configurable 1-365 days)

### Scopes

| Scope | Permission |
|-------|-----------|
| `scan:read` | Read scan results and history |
| `scan:write` | Trigger new scans |
| `keys:read` | List API keys and usage |
| `keys:manage` | Create, update, and revoke keys |

### Security Features
- **Domain allowlist** — Restrict keys to specific domains
- **IP/CIDR allowlist** — Restrict keys to specific IP addresses
- **Privilege escalation prevention** — Child keys can't have broader scopes than the parent
- **Usage logging** — All requests logged with endpoint, method, IP, status code
- **Auto-cleanup** — Usage logs deleted after 90 days

### Rate Limits

| Plan | Requests/Minute |
|------|----------------|
| Starter | 10 |
| Pro | 30 |
| Max | 100 |

Uses a **sliding window algorithm** for fair rate limiting.

---

## 18. Backend-Aware Scanning

### What It Does
Specialized scanning for popular backend services. CheckVibe knows how to audit **Supabase**, **Firebase**, and **Convex** backends.

### Supabase Scanning
- **Auto-detection**: Supabase is detected automatically via response headers and script references
- **What it checks**: RLS policies, exposed service role keys, auth configuration, storage rules
- **Management API scanning** (optional): When you provide a **Supabase Personal Access Token (PAT)** and project URL, CheckVibe uses the Supabase Management API to perform a deeper audit of your project settings

### Firebase Scanning
- **Triggered when**: Backend type is set to "Firebase" in project settings
- **What it checks**: Firestore security rules, Firebase Auth configuration, Cloud Storage rules

### Convex Scanning
- **Triggered when**: Backend type set to "Convex" with a backend URL
- **What it checks**: Convex-specific security patterns and endpoint exposure

---

## 19. GitHub Repository Scanning

### What It Does
When a GitHub repository is linked to your project, CheckVibe performs **4 additional code-level scans**.

### Scanners

| Scanner | What It Checks |
|---------|---------------|
| **GitHub Secrets** | Exposed credentials in repository code and commit history |
| **GitHub Security** | Dependabot alerts, code scanning status, secret scanning alerts |
| **OpenSSF Scorecard** | OpenSSF security assessment including CI practices, code review, dependency management |
| **Dependencies** | Known CVEs in your dependency tree (npm, pip, etc.) |

### How to Set Up
1. Go to project **Settings**
2. Enter your GitHub repository in `owner/repo` format
3. Scans automatically include all 4 GitHub scanners on next run

### Requirements
- A `GITHUB_TOKEN` with `security_events` scope
- Public or private repositories (with appropriate token permissions)

---

## 20. Hosting Platform Detection

### What It Does
Automatically detects which hosting platform your site uses and runs **platform-specific security checks**.

### Supported Platforms

| Platform | How It's Detected | What It Checks |
|----------|------------------|---------------|
| **Vercel** | Response headers, DNS records | Deployment config, security headers, edge function exposure |
| **Netlify** | Response headers, `_redirects` file | Redirect rules, header policies, build configuration |
| **Cloudflare** | CF-Ray header, SSL cert | WAF settings, DDoS protection level, SSL configuration |
| **Railway** | Response headers, DNS | Service exposure, configuration security |

---

## 21. Authentication & Google OAuth

### What It Does
Secure authentication system supporting **email/password** and **Google OAuth** sign-in.

### Auth Methods
- **Email & Password** — Standard registration with password validation
- **Google OAuth** — One-click sign-in via Google
- **Password Reset** — Email-based password recovery via `/reset-password`

### How It Works
- Built on **Supabase Auth**
- JWT tokens stored in **HTTP-only cookies** (not accessible to JavaScript)
- Chunked cookies for large tokens: `sb-{ref}-auth-token.{0,1,...}`
- SSR-compatible via `@supabase/ssr`
- `middleware.ts` handles session refresh on every request

### Security
- **Row Level Security (RLS)** on every table — users can only access their own data
- **Billing field protection** — A database trigger prevents users from modifying their own plan data
- **CSRF protection** — Origin header validation on all mutating requests
- **Error sanitization** — Generic auth errors prevent account enumeration

---

## 22. Stripe Billing & Subscriptions

### What It Does
Full subscription management with 4 plan tiers, monthly and annual billing, and automatic plan enforcement.

### Plans

| Feature | Free | Starter ($19/mo) | Pro ($39/mo) | Max ($79/mo) |
|---------|------|-----------------|-------------|-------------|
| Projects | 1 | 1 | 3 | 10 |
| Scans/month | 3 | 5 | 20 | 75 |
| Full scan results | Blurred | ✅ | ✅ | ✅ |
| AI fix suggestions | ❌ | ✅ | ✅ | ✅ |
| Report export | ❌ | ✅ | ✅ | ✅ |
| Scheduled scans | ❌ | ❌ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ✅ | ✅ | ✅ |

**Annual pricing**: 30% discount on all plans.

### How It Works
1. **Checkout**: User selects a plan → Stripe Checkout Session → payment on Stripe's hosted page
2. **Activation**: Stripe sends `checkout.session.completed` webhook → profile updated with plan, limits, and Stripe IDs
3. **Monthly Reset**: Stripe sends `invoice.paid` → scan counter reset to 0
4. **Cancellation**: Stripe sends `customer.subscription.deleted` → downgrade to free plan
5. **Portal**: Users can manage their subscription via Stripe Customer Portal

### Security
- Webhook signatures verified before processing
- Idempotency via `processed_webhook_events` table
- Metadata validation prevents plan escalation attacks
- Rate limiting: 5 checkout/portal requests per minute

---

## 23. Free Tier & Conversion Funnel

### What It Does
The free tier lets users experience CheckVibe's power while strategically encouraging upgrades.

### The Funnel
1. **Allow scanning** — 3 scans/month, 1 project
2. **Show value** — Display overall score, issue counts, and severity breakdown
3. **Gate details** — Finding descriptions and recommendations are **blurred/locked**
4. **Upsell** — "Upgrade to unlock details" CTAs throughout the report
5. **Restrict features** — No export, no sharing, no API access, no monitoring

### What Free Users See vs. Paid

| Feature | Free | Paid |
|---------|------|------|
| Overall score | ✅ Visible | ✅ Visible |
| Issue count & severity | ✅ Visible | ✅ Visible |
| Finding titles | 🔒 Blurred | ✅ Visible |
| Finding descriptions | 🔒 Blurred | ✅ Visible |
| Recommendations | 🔒 Blurred | ✅ Visible |
| AI fix suggestions | 🔒 Locked | ✅ Available |
| PDF export | 🔒 Locked | ✅ Available |
| Share link | 🔒 Locked | ✅ Pro+ |
| Scan history | Last scan only | Full history |

---

## 24. MCP Server (AI Agent Integration)

### What It Does
A **Model Context Protocol (MCP) server** that allows AI coding agents (Cursor, Cline, Claude, etc.) to trigger CheckVibe scans and read results directly within their workflow.

### How It Works
- The MCP server (`mcp-server/`) exposes CheckVibe functionality as MCP tools
- AI agents can:
  - Trigger scans on any URL
  - Read scan results and findings
  - Get recommendations for fixes
- Agents use CheckVibe API keys for authentication

### Use Case
Developers using AI coding tools can have their agent automatically scan the site they're building and fix security issues — all without leaving their editor.

---

## 25. Outreach Email Generator

### What It Does
Generate **personalized outreach emails** to website owners based on their scan results, notifying them of security issues found on their site.

### How It Works
1. After scanning a site, click the **outreach email** option
2. The system generates a professional email based on the scan findings
3. The email highlights key vulnerabilities and offers CheckVibe as a solution
4. Customizable templates with dynamic data from scan results

### Component
`outreach-email-modal.tsx` — Full email composer with template system and preview.

---

## 26. Landing Page & Blog

### Landing Page
A high-impact, animated landing page at `/` featuring:
- **Three.js 3D globe** — Interactive animated globe in the hero section
- **Feature Bento grid** — Interactive micro-UIs demonstrating each scanner
- **Scanner list** — Full list of all 31+ scanners with descriptions
- **Pricing table** — Side-by-side plan comparison with annual toggle
- **Integration logos** — Tool integrations (Supabase, Firebase, Vercel, etc.)
- **CTAs** — Sign-up and demo buttons throughout
- **Framer Motion animations** — Smooth scroll-based animations and transitions

### Blog
A content marketing system built with MDX:
- Located at `/blog`
- Static content in `dashboard/content/`
- SEO-optimized with OG images, meta descriptions, and sitemap
- RSS feed at `/feed.xml`

### SEO
- Dynamic `robots.ts` and `sitemap.ts`
- OpenGraph and Twitter image generation (`opengraph-image.tsx`, `twitter-image.tsx`)
- Structured metadata on every page

---

## Architecture Summary

```
┌─────────────────────────────────────────────┐
│           Vercel (Next.js 16)               │
│                                             │
│  Landing Page  │  Dashboard  │  API Routes  │
│  (3D Globe,    │  (Projects, │  (/api/scan  │
│   Animations)  │   Reports)  │   /api/keys) │
└────────────────┼────────────┼──────────────┘
                 │            │
    ┌────────────▼──┐    ┌───▼──────────────┐
    │   Supabase    │    │  31+ Deno Edge   │
    │   Database    │    │  Functions       │
    │   + Auth      │    │  (Scanners)      │
    └───────────────┘    └─────────────────┘
                 │
    ┌────────────▼──┐    ┌─────────────────┐
    │   Stripe      │    │   External APIs  │
    │   Billing     │    │   (Gemini, Claude │
    └───────────────┘    │    GitHub, Resend)│
                         └─────────────────┘
```

---

*Last updated: March 2026*
*CheckVibe — 31+ scanners, one click.*
