# CheckVibe Scanner Suite — Full Analysis & Improvement Roadmap

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Scanner-by-Scanner Breakdown](#scanner-by-scanner-breakdown)
3. [Current Gaps & Weaknesses](#current-gaps--weaknesses)
4. [Improvement Proposals](#improvement-proposals)
   - [A. GitHub Deep Secrets Scanner (Rebuild)](#a-github-deep-secrets-scanner-rebuild)
   - [B. Backend Infrastructure Scanner (New)](#b-backend-infrastructure-scanner-new)
   - [C. Existing Scanner Enhancements](#c-existing-scanner-enhancements)

---

## Architecture Overview

**12 scanners** run in parallel as Supabase Deno Edge Functions (+ 1 local SEO scanner). The main `/api/scan` route orchestrates them with a 45-second timeout per scanner.

```
User → POST /api/scan { url, githubRepo? }
         ├─→ security-headers-scanner  (weight: 15%)
         ├─→ sqli-scanner              (weight: 12%)
         ├─→ cors-scanner              (weight: 10%)
         ├─→ csrf-scanner              (weight: 10%)
         ├─→ cookie-scanner            (weight: 10%)
         ├─→ auth-scanner              (weight: 10%)
         ├─→ api-key-scanner           (weight: 10%)
         ├─→ threat-scanner            (weight: 8%)
         ├─→ github-scanner            (weight: 6%)  ← only if githubRepo provided
         ├─→ tech-scanner              (weight: 4%)
         ├─→ seo-scanner (local)       (weight: 4%)
         └─→ legal-scanner             (weight: 1%)
```

**Auth flow**: Session cookie OR `Bearer cvd_live_*` API key → CSRF check → scope check → rate limit → atomic usage increment → run scanners → weighted score → save to `scans` table.

---

## Scanner-by-Scanner Breakdown

### 1. Security Headers Scanner (`security-headers`)
**Weight: 15% | Edge Function**

**What it does:**
- Sends a HEAD request to the target URL
- Checks 6 core security headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- Deep CSP analysis: detects `unsafe-inline`, `unsafe-eval`, wildcard sources, missing `default-src`, `http:` scheme usage
- Cookie attribute analysis: `Secure`, `HttpOnly`, `SameSite`, `Path`, `Domain` (capped at -15 total deduction)
- CORS misconfiguration probe: sends a parallel request with `Origin: https://evil.com` header, checks for wildcard + credentials, origin reflection, null origin
- Information disclosure: looks for `Server` version, `X-Powered-By`, `X-AspNet-Version`, `X-Debug-Token`, `X-Runtime` headers
- Rate-limiting header presence check
- HTTPS redirect detection (follows HTTP → HTTPS 301/307/308)

**Score logic:** Starts at 100, deducts per finding. Missing CSP = -15, weak HSTS = -5, CORS violations = -5 to -20.

**Limitations:**
- Only checks response headers (not response body)
- CORS probe has 5s timeout — may miss slow servers
- Can't detect runtime CSP violations
- Overlaps with the dedicated CORS scanner (both check CORS headers)

---

### 2. API Key / Credential Leak Scanner (`api-key-leak`)
**Weight: 10% | Edge Function**

**What it does:**
- Fetches the target page HTML
- Extracts all `<script src="">` tags, resolves relative URLs
- Downloads up to 15 non-CDN JS files (50KB cap each, 5s timeout)
- Attempts to discover and download `.js.map` source maps, extracts `sourcesContent`
- Scans HTML + all JS + source maps for **40+ credential patterns**:
  - Cloud: AWS (`AKIA...`), Azure, GCP service accounts
  - Payment: Stripe `sk_live_*`, `pk_live_*`
  - AI: OpenAI `sk-...`, Anthropic `sk-ant-...`
  - Chat: Slack `xoxb-*`, Discord tokens
  - VCS: GitHub PATs `ghp_*`, `github_pat_*`
  - Database: MongoDB/PostgreSQL/MySQL/Redis connection strings
  - Crypto: RSA/EC/DSA private keys, JWT secrets
  - Generic: `api_key=`, `secret=`, `password=` in URLs/strings
- Probes common infrastructure paths: `.env`, `.git/HEAD`, `.git/config`, `phpinfo.php`, `swagger.json`, `/api-docs`, `wp-config.php.bak`, `/.DS_Store`, `/debug`, `/graphql`
- Probes database admin UIs: phpMyAdmin, Adminer, CouchDB Fauxton, Mongo Express
- Tests unprotected API endpoints: `/api/users`, `/api/v1/users`, `/api/admin`
- Firebase RTDB world-readable check

**Score logic:** Starts at 100. Critical find = -30, High = -20, Medium = -10, Low = -5.

**Limitations:**
- Only scans publicly accessible JS/HTML — cannot see server-side code
- CDN skip list may miss secrets bundled into popular library filenames
- 50KB cap means large bundles get truncated
- Pattern-based — can miss encoded/obfuscated secrets
- Cannot access private repos or server-side environment variables

---

### 3. Vibe Scanner / AI Detection (`vibe-match`)
**Weight: included in overall but small | Edge Function**

**What it does:**
- Fetches the target page HTML (truncated to 30,000 chars)
- Sends to **Google Gemini 2.5 Flash** with a prompt asking to detect AI-generated code patterns
- Looks for: v0-generated comments, Cursor agent metadata, template boilerplate, placeholder text, excessive Tailwind utility spam
- Does NOT penalize: professional Tailwind/shadcn use, clean HTML, modern design patterns

**Score logic:** Gemini returns `aiLikelihood` 0-100. Quality score = `100 - aiLikelihood`. Findings only reported if > 30%.

**Limitations:**
- Subjective — Gemini's interpretation varies
- Costs money per scan (Gemini API)
- May false-positive on well-structured framework code

---

### 4. Threat Intelligence Scanner (`threat-intelligence`)
**Weight: 8% | Edge Function**

**What it does — queries 5 external APIs in parallel:**

| API | What it checks | Deduction |
|-----|---------------|-----------|
| **Google Safe Browsing** | Malware, social engineering, unwanted software | -50 per match |
| **VirusTotal** | 70+ antivirus engines scan the URL | -10 per malicious engine |
| **Shodan** | Resolves IP, checks for exposed ports (FTP, RDP, VNC, MySQL, PostgreSQL, MongoDB, Redis, etc.) | -20 (remote access), -30 (database) |
| **URLScan.io** | Historical URL verdict (malicious/clean) | -30 if malicious |
| **LeakIX** | Known data breaches for the domain | up to -40 |

**Score logic:** Starts at 100, aggregates deductions from all APIs.

**Limitations:**
- All 5 API keys are optional — gracefully skips missing ones
- Shodan relies on historical data, may not reflect current state
- VirusTotal may have stale data for new domains
- Each API has rate limits
- Can produce false positives (legitimate sites sometimes flagged)

---

### 5. SQL Injection Scanner (`sqli`)
**Weight: 12% | Edge Function**

**What it does:**
- Fetches the target page, extracts all `<form>` elements and URL query parameters
- Tests up to 10 injectable points with 3 probe types:
  1. **Error-based**: Injects `'` (single quote), checks response for SQL error strings (MySQL, PostgreSQL, SQLite, MSSQL, Oracle patterns)
  2. **Blind boolean-based**: Sends `1 AND 1=1` vs `1 AND 1=2`, compares response length (>5% difference + 50+ bytes = potential SQLi)
  3. **Tautology-based**: Injects `1 OR 1=1--`, checks for >20% response growth
- Also scans for information disclosure: stack traces, Python tracebacks, DB config exposure

**Score logic:** Critical (SQL errors) = -30, High (blind) = -20, Medium (info disclosure) = -10.

**Limitations:**
- Non-destructive only — does NOT attempt INSERT/UPDATE/DELETE
- Limited to 10 parameters
- False positives possible if response length naturally varies (dynamic content)
- Cannot detect out-of-band SQLi (DNS exfiltration, time-based)
- 5s timeout per probe — slow servers may not respond

---

### 6. Technology Stack Scanner (`tech-stack`)
**Weight: 4% | Edge Function**

**What it does:**
- Detects technologies from headers (`Server`, `X-Powered-By`, `X-Generator`), cookies (`PHPSESSID`, `ASP.NET_SessionId`, etc.), HTML meta tags, and framework indicators (`/_next`, `/_nuxt`, `data-reactroot`, `ng-version`)
- Probes common CMS paths: `/wp-login.php`, `/wp-json/wp/v2/`, `/administrator/`
- Cross-references detected versions against **100+ hardcoded CVEs** for WordPress, jQuery, Angular, PHP, nginx, Apache, Express, Next.js, React, Bootstrap, Drupal, Joomla, IIS, Vue.js
- Detects debug mode: `X-Debug-Token`, `debug=true`, Laravel Debugbar, Symfony debug bar

**Score logic:** CVE severity-based: Critical = -30, High = -20, Medium = -10, Low = -5. Server version disclosure = -5, debug mode = -20.

**Limitations:**
- CVE database is hardcoded (not updated dynamically) — will become stale
- Version detection depends on headers/meta tags (easily suppressed)
- Doesn't verify if a CVE actually applies (just version matching)
- Cannot detect technologies that don't expose themselves

---

### 7. Legal Compliance Scanner (`legal-scanner`)
**Weight: 1% | Edge Function**

**What it does:**
- Fetches HTML, strips tags, truncates to 30,000 chars
- Sends to **Gemini 2.5 Flash** to audit for: misleading claims, false promises, unsubstantiated health/financial claims, missing Privacy Policy or Terms of Service links

**Score logic:** Gemini returns 0-100 score + reasoning.

**Limitations:** Subjective, costs money, only analyzes visible text.

---

### 8. GitHub Secrets Scanner (`github_secrets`)
**Weight: 6% | Edge Function | Only runs if `githubRepo` is provided**

**What it does (5 checks):**
1. Checks if `.env` files currently exist in repo root — reads content, looks for real secrets vs placeholders
2. Checks git history for past `.env` commits via GitHub commits API
3. Verifies `.gitignore` excludes `.env` patterns
4. Uses GitHub search API to find `.env` files anywhere in the repo
5. Searches source code for hardcoded secrets (`PRIVATE_KEY`, `SECRET_KEY`, `API_KEY`, `PASSWORD`)
6. Searches for private key files (`.pem`, `.key`, `id_rsa`)

**Score logic:** Real secrets in .env = -30, potential creds = -20, .env exists but no secrets = -5, history = -20, missing .gitignore = -10, private keys = -25 each.

**Limitations:**
- Requires `GITHUB_TOKEN` with repo scope
- Only searches first 10 results per query
- Can't access private repos unless token has access
- GitHub search API has limitations (no regex, limited file content search)
- Rate-limited: 30 search requests/minute for authenticated users
- 500ms artificial delay between search requests
- Only searches for a small set of hardcoded keywords
- **Cannot scan git history deeply** (only checks if .env was ever committed, not all secrets across all commits)

---

### 9. CORS Scanner (`cors`)
**Weight: 10% | Edge Function**

**What it does:**
- Tests 9 different `Origin` header values against the target:
  - `https://evil.com`, `null`, `https://attacker.{domain}`, `https://{domain}.evil.com`, `http://{domain}`, `http://localhost`, `http://127.0.0.1`, `http://192.168.1.1`
- Checks preflight (OPTIONS) response
- Analyzes `Access-Control-Allow-Methods` for dangerous methods (PUT, DELETE, PATCH)
- Checks `Access-Control-Max-Age` (too long >86400s or too short <60s)

**Score logic:** Reflected origin + credentials = -30 (critical), wildcard + credentials = -25, reflected origin = -15, null origin = -15, subdomain bypass = -10, etc.

**Limitations:** Tests only 9 specific origins, may miss other bypass techniques, 8s timeout.

---

### 10. CSRF Scanner (`csrf`)
**Weight: 10% | Edge Function**

**What it does:**
- Extracts all `<form>` elements from the page
- Checks for CSRF token hidden inputs (csrf, xsrf, _token, authenticity_token, etc.)
- Detects meta tag CSRF tokens (Django, Rails, Laravel patterns)
- Flags state-changing GET forms (action URL contains delete, remove, update, etc.)
- Analyzes cookie `SameSite` attributes
- Checks clickjacking protection (`X-Frame-Options` or CSP `frame-ancestors`)

**Score logic:** Forms without tokens = -15 each, state-changing GET = -10, missing SameSite = -8, no clickjacking protection = -5.

**Limitations:** Can't verify tokens are actually validated server-side, regex-based form extraction may miss dynamic/JS-rendered forms.

---

### 11. Cookie/Session Scanner (`cookies`)
**Weight: 10% | Edge Function**

**What it does:**
- Collects all `Set-Cookie` headers from initial page load
- Checks each cookie for: `Secure`, `HttpOnly`, `SameSite`, `Path`, `Domain`, `Max-Age`/`Expires`
- Detects JWT tokens in cookie values
- Warns about persistent sessions >30 days
- Flags cookies with sensitive data in names (email, username, password, phone, credit card, SSN patterns)
- Warns about excessive cookies (>15) or total size >4KB
- Checks `__Secure-` and `__Host-` prefix compliance

**Score logic:** Missing Secure on HTTPS = -12, missing HttpOnly on session cookies = -10, missing SameSite = -5, etc.

**Limitations:** Only checks initial page load cookies — misses cookies set by JS or subsequent requests.

---

### 12. Auth Flow Scanner (`auth`)
**Weight: 10% | Edge Function**

**What it does:**
- Probes 11 common auth paths: `/login`, `/signin`, `/signup`, `/register`, `/forgot-password`, `/reset-password`, `/api/auth/*`, etc.
- Flags auth pages served over HTTP
- Analyzes password fields: `autocomplete`, `minlength`, `pattern` attributes
- Detects OAuth/SSO providers: Google, GitHub, Facebook, Microsoft, Apple, Auth0, Okta, Supabase, Firebase, Clerk
- Checks for rate-limiting headers on auth endpoints
- Flags cacheable auth pages (missing `Cache-Control: no-store`)
- Scans for hardcoded credentials in auth page HTML
- Detects dangerous client-side auth patterns: `if (password === "...")`, localStorage token storage, JS cookie-based auth

**Score logic:** HTTP auth = -20, hardcoded creds = -15, client-side auth = -12, no rate limiting = -8, etc.

**Limitations:** Only checks common paths, can't verify actual rate-limiting enforcement, doesn't test full auth flow.

---

### 13. SEO Scanner (Local — runs in Next.js)
**Weight: 4% | Local lib**

**What it does:** Basic SEO checks (meta tags, title, description, headings, etc.). Runs locally, not as an Edge Function.

---

## Current Gaps & Weaknesses

### Critical Gaps

| Gap | Impact | Current State |
|-----|--------|--------------|
| **No deep git history scanning** | Secrets committed and then deleted remain in git history forever. The current GitHub scanner only checks if .env was *ever committed*, not for secrets in all files across all commits. | GitHub search API is too limited for this. |
| **No backend infrastructure scanning** | Can't detect misconfigured Supabase RLS, open Firebase rules, exposed database ports, overly permissive cloud IAM, etc. | Not implemented. |
| **No dependency vulnerability scanning** | npm/yarn/pip/composer dependencies with known CVEs are invisible. | Tech scanner has 100 hardcoded CVEs but doesn't check dependency files. |
| **No subdomain enumeration** | Forgotten staging/dev subdomains often have weaker security. | Not implemented. |
| **No JavaScript DAST** | Many modern apps are SPAs — forms and inputs rendered by JS are invisible to our regex-based parsers. | All scanners use raw HTML, no headless browser. |
| **Stale CVE database** | The tech scanner's CVE list is hardcoded and will become outdated. | Manual updates only. |

### Medium Gaps

| Gap | Impact |
|-----|--------|
| **No email security scanning** | SPF, DKIM, DMARC misconfigurations are common and exploitable. |
| **No DNS misconfiguration scanning** | Dangling CNAMEs (subdomain takeover), open DNS resolvers, zone transfer. |
| **No SSL/TLS deep analysis** | Certificate expiry, weak cipher suites, protocol downgrade (TLS 1.0/1.1). |
| **No rate limit testing** | We check for rate-limit headers but don't actually test if limits are enforced. |
| **No open redirect scanning** | `?redirect=https://evil.com` is a common vulnerability. |
| **No XSS scanning** | We check CSP headers but don't probe for reflected/stored XSS. |
| **Scanner overlap** | Security headers scanner and CORS scanner both check CORS. Cookie scanner and CSRF scanner both check SameSite. |

---

## Improvement Proposals

### A. GitHub Deep Secrets Scanner (Rebuild)

**Problem:** The current scanner uses GitHub's search API, which:
- Has severe rate limits (30 searches/min)
- Can't search git history (only current default branch)
- Returns limited results (max 10 per query)
- Can't use regex patterns
- Misses secrets in non-default branches

**Proposed Solution: Use `git clone --bare` + TruffleHog/Gitleaks patterns**

The scanner should clone the repo (bare, shallow if needed) and run pattern matching against the full git history including all branches and deleted files.

#### Option 1: GitHub API + git log simulation (no clone needed)
Use the GitHub API more aggressively:
```
GET /repos/{owner}/{repo}/git/refs          → list all branches
GET /repos/{owner}/{repo}/commits?sha={branch}&per_page=100
GET /repos/{owner}/{repo}/git/commits/{sha} → get tree
GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1  → full file list
GET /repos/{owner}/{repo}/git/blobs/{sha}   → file content (base64)
```

Advantages: No clone needed, works in Edge Functions.
Disadvantages: Very API-heavy (rate limits), slow for large repos.

#### Option 2: Clone + scan in a container (recommended)
Run a lightweight worker that:
1. `git clone --bare --depth=50 {repo}` (limits to last 50 commits per branch)
2. Runs [Gitleaks](https://github.com/gitleaks/gitleaks) or a custom regex engine against all commits
3. Returns findings via API

**Patterns to scan for (expanded from current 5 to 50+):**

```
# Current patterns (keep):
- AWS Access Key: AKIA[0-9A-Z]{16}
- AWS Secret Key: [0-9a-zA-Z/+]{40}
- GitHub PAT: ghp_[0-9a-zA-Z]{36}
- Stripe Secret: sk_live_[0-9a-zA-Z]{24,}
- Private keys: -----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----

# Add these high-value patterns:
- Supabase service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}
- Supabase URL + anon key combo: (SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL).*\n.*(SUPABASE_KEY|SUPABASE_ANON_KEY)
- Firebase config block: apiKey.*authDomain.*projectId.*storageBucket
- Vercel token: [vV]ercel[_-]?[tT]oken.*[0-9a-zA-Z]{24,}
- Netlify token: [0-9a-f]{64} (in context of netlify)
- Database URLs: (postgres|mysql|mongodb(\+srv)?|redis)://[^\s'"]+
- Twilio: SK[0-9a-fA-F]{32}
- SendGrid: SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}
- Mailgun: key-[0-9a-zA-Z]{32}
- Algolia: [a-f0-9]{32} (in context of ALGOLIA_API_KEY)
- Cloudflare: [0-9a-f]{37} (in context of CF_API_TOKEN)
- Shopify: shppa_[0-9a-fA-F]{32}
- Slack webhook: https://hooks\.slack\.com/services/T[0-9A-Z]{8,}/B[0-9A-Z]{8,}/[0-9a-zA-Z]{24}
- Discord webhook: https://discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+
- Telegram bot: [0-9]+:AA[0-9A-Za-z_-]{33}
- NPM token: npm_[A-Za-z0-9]{36}
- PyPI token: pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]+
- Docker Hub token: dckr_pat_[A-Za-z0-9_-]+
- Heroku API key: [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
- Generic JWT: eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+
- Base64-encoded secrets: [A-Za-z0-9+/]{40,}={0,2} (in context of SECRET/KEY/TOKEN)
- .env file contents in committed code
- Hardcoded IPs with credentials: \b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+@
```

**Additional checks:**
- Scan all branches (not just default)
- Check if `.gitignore` was added AFTER secrets were committed (secret still in history)
- Check for `.env.example` files that accidentally contain real values
- Check for `docker-compose.yml` with hardcoded passwords
- Check for `terraform.tfstate` or `.tfvars` files (contain cloud credentials)
- Check for `kubeconfig` or Kubernetes secrets
- Check for GitHub Actions secrets referenced but potentially leaked in logs
- Provide a "history timeline" showing when secrets were introduced and if they were removed

---

### B. Backend Infrastructure Scanner (New)

This is the biggest gap. Users build apps on Supabase, Firebase, AWS, etc. — and the most critical vulnerabilities are often in their backend configuration, not their frontend code.

#### B1. Supabase Backend Scanner

**What to scan:**

| Check | How | Severity |
|-------|-----|----------|
| **Exposed anon key in HTML/JS** | Already done by API key scanner — verify it flags Supabase anon keys specifically | Medium |
| **Service role key leaked** | Scan JS/HTML for `eyJ...` tokens, decode JWT, check if `role: "service_role"` | Critical |
| **RLS disabled on tables** | If user provides Supabase project URL + service role key, query `pg_catalog` to check RLS status | Critical |
| **Public tables without RLS** | Query `information_schema.tables` + check `pg_class.relrowsecurity` | Critical |
| **Overly permissive RLS policies** | Parse policy definitions for `USING (true)` or `WITH CHECK (true)` | High |
| **Public storage buckets** | Check Supabase Storage API for buckets with public access | High |
| **Edge Functions without auth** | Check if functions respond to unauthenticated requests | High |
| **Exposed PostgREST endpoints** | Try accessing `/rest/v1/` with anon key, enumerate tables | High |
| **Database functions callable via RPC** | Check which functions are exposed via `pg_proc` + `has_function_privilege` | Medium |
| **Realtime subscriptions leaking data** | Check if Realtime channels broadcast sensitive data without auth | Medium |
| **Auth settings** | Check email confirmation required, password strength settings | Medium |
| **Exposed dashboard** | Check if Supabase Studio is publicly accessible | High |

**Implementation approach:**

The user provides their Supabase project URL + a read-only database connection string (or service role key). The scanner:

1. **Passive checks** (no credentials needed):
   - Fetch `{supabase_url}/rest/v1/` with the anon key found in their HTML
   - Try to enumerate tables via PostgREST schema endpoint
   - Check if Storage has public buckets
   - Try calling Edge Functions without auth

2. **Active checks** (credentials provided):
   - Connect to the database and run:
     ```sql
     -- Check RLS status on all user tables
     SELECT schemaname, tablename, rowsecurity
     FROM pg_tables
     WHERE schemaname = 'public';

     -- Check RLS policies
     SELECT tablename, policyname, cmd, qual, with_check
     FROM pg_policies
     WHERE schemaname = 'public';

     -- Check exposed RPC functions
     SELECT routine_name, routine_type
     FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_type = 'FUNCTION';

     -- Check storage buckets
     SELECT id, name, public
     FROM storage.buckets;

     -- Check auth settings
     SELECT * FROM auth.config; -- if accessible
     ```

3. **Report:**
   - List all tables with RLS disabled
   - Flag `USING (true)` policies
   - List exposed functions and their security
   - Public storage buckets
   - Anon key capabilities (what data an anonymous user can read/write)

#### B2. Firebase Backend Scanner

| Check | How |
|-------|-----|
| **Firestore rules** | Fetch `{project}.firebaseio.com/.settings/rules.json` if accessible |
| **RTDB world-readable** | Already partially done — expand to check write access too |
| **Storage rules** | Check if `gs://{bucket}` allows public read/write |
| **Cloud Functions exposed** | Enumerate and test authentication |
| **API key restrictions** | Check if Firebase API key is restricted to specific APIs/domains |

#### B3. General Backend Scanner

| Check | How |
|-------|-----|
| **Open admin panels** | Probe `/admin`, `/wp-admin`, `/phpmyadmin`, `/adminer`, `/grafana`, `/kibana`, `/jenkins`, `/portainer` |
| **Exposed GraphQL introspection** | `POST /graphql` with `{ __schema { types { name } } }` |
| **Exposed Swagger/OpenAPI** | Already done — expand to actually parse the spec and test each endpoint |
| **Exposed health/debug endpoints** | `/health`, `/debug`, `/metrics`, `/actuator` (Spring Boot), `/__info` |
| **Open WebSocket connections** | Try connecting to common WS paths |
| **Server-Side Request Forgery indicators** | Check for URL parameters that fetch external resources |

---

### C. Existing Scanner Enhancements

#### C1. Add Headless Browser Rendering (High Impact)

**Problem:** All scanners fetch raw HTML. Modern SPAs (React, Vue, Angular) render content via JavaScript — forms, auth flows, and API calls are invisible.

**Solution:** Add a Puppeteer/Playwright step before scanning:
1. Render the page in a headless browser
2. Wait for JS execution (2-3 seconds)
3. Extract the final DOM
4. Feed the rendered HTML to existing scanners

This would massively improve: CSRF scanner (JS-rendered forms), Auth scanner (SPA login pages), API key scanner (runtime-loaded secrets), Cookie scanner (JS-set cookies).

**Implementation:** Use a separate worker/container with Puppeteer (can't run in Edge Functions). Return rendered HTML + all network requests captured during rendering.

#### C2. Add XSS Scanner (New Scanner)

| Test | Method |
|------|--------|
| **Reflected XSS** | Inject `<script>alert(1)</script>` in URL params, check if reflected unescaped |
| **DOM XSS sinks** | Scan JS for `innerHTML`, `document.write()`, `eval()`, `setTimeout(string)` |
| **Template injection** | Test `{{7*7}}` in parameters (Angular/Vue template injection) |
| **SVG/img injection** | Test `<img src=x onerror=alert(1)>` in parameters |

#### C3. Add SSL/TLS Scanner (New Scanner)

| Check | Method |
|-------|--------|
| **Certificate expiry** | TLS handshake, check `notAfter` |
| **Certificate chain** | Verify full chain of trust |
| **Weak cipher suites** | Check for RC4, DES, NULL ciphers |
| **Protocol versions** | Flag TLS 1.0/1.1 support |
| **HSTS preload** | Check if domain is in HSTS preload list |
| **Certificate transparency** | Check CT logs for unauthorized certificates |

Can use `https://api.ssllabs.com/api/v3/analyze` for deep analysis.

#### C4. Add DNS Security Scanner (New Scanner)

| Check | Method |
|-------|--------|
| **SPF record** | DNS TXT lookup for `v=spf1` |
| **DKIM** | DNS TXT lookup for `{selector}._domainkey.{domain}` |
| **DMARC** | DNS TXT lookup for `_dmarc.{domain}` |
| **DNSSEC** | Check for RRSIG records |
| **Dangling CNAMEs** | Enumerate subdomains, check for unclaimed destinations (subdomain takeover) |
| **CAA records** | Check which CAs are authorized |
| **Zone transfer** | Test AXFR (should be denied) |

#### C5. Add Open Redirect Scanner (New Scanner)

Test common redirect parameters for open redirect vulnerabilities:
```
?redirect=https://evil.com
?next=https://evil.com
?url=https://evil.com
?return_to=https://evil.com
?continue=https://evil.com
?dest=//evil.com
?goto=//evil.com
```

Check if the server 302s to the evil URL without validation.

#### C6. Add Dependency Vulnerability Scanner (New Scanner)

If the user provides a GitHub repo:
1. Find `package.json`, `package-lock.json`, `yarn.lock`, `requirements.txt`, `Gemfile.lock`, `composer.lock`, `go.sum`, `Cargo.lock`
2. Parse dependency versions
3. Cross-reference with:
   - [OSV.dev API](https://osv.dev/) (free, comprehensive)
   - [GitHub Advisory Database API](https://docs.github.com/en/rest/security-advisories)
   - [Snyk vulnerability DB](https://snyk.io/vuln/)
4. Report CVEs with severity and fix versions

#### C7. Improve Tech Scanner CVE Database

**Current problem:** 100 hardcoded CVEs that will become stale.

**Solution:** Query the NVD API at scan time:
```
GET https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={technology}+{version}
```

Or use the OSV.dev API which is faster and free:
```
POST https://api.osv.dev/v1/query
{ "package": { "name": "next", "ecosystem": "npm" }, "version": "14.0.0" }
```

#### C8. Subdomain Enumeration (New Scanner)

1. Use Certificate Transparency logs: `https://crt.sh/?q=%.{domain}&output=json`
2. Check common subdomains: `api.`, `staging.`, `dev.`, `test.`, `admin.`, `mail.`, `ftp.`, `vpn.`
3. For each found subdomain, run a lightweight version of the main scan
4. Flag subdomains with weaker security than the main domain

---

## Priority Ranking

| Priority | Enhancement | Effort | Impact |
|----------|------------|--------|--------|
| **P0** | GitHub Deep Secrets Scanner (rebuild) | Medium | Very High — secrets in git history are the #1 real-world breach vector |
| **P0** | Supabase Backend Scanner | Medium | Very High — most CheckVibe users use Supabase, and RLS misconfigs are the most dangerous vulnerability |
| **P1** | Dependency Vulnerability Scanner | Low | High — easy to implement, high value for users with GitHub repos |
| **P1** | SSL/TLS Scanner | Low | High — certificate issues are common and impactful |
| **P1** | DNS/Email Security Scanner (SPF/DKIM/DMARC) | Low | High — email spoofing is a real threat |
| **P2** | XSS Scanner | Medium | High — but CSP headers provide some protection signal already |
| **P2** | Open Redirect Scanner | Low | Medium — common vulnerability, easy to scan |
| **P2** | Headless Browser Rendering | High | High — but requires infrastructure changes (can't run Puppeteer in Edge Functions) |
| **P2** | Dynamic CVE Database (NVD/OSV API) | Low | Medium — replaces stale hardcoded CVEs |
| **P3** | Subdomain Enumeration | Medium | Medium — useful but adds significant scan time |
| **P3** | Firebase Backend Scanner | Medium | Medium — depends on user base |
| **P3** | General Backend Endpoint Scanner | Low | Medium — expands on existing path probing |

---

## Quick Wins (Can Ship This Week)

1. **Expand GitHub scanner patterns** — Add 30+ more secret patterns to the existing regex list (no architecture change needed)
2. **Add SSL Labs API check** — Single API call, very informative
3. **Add SPF/DKIM/DMARC DNS checks** — Simple DNS lookups, no external API needed
4. **Query OSV.dev for detected tech versions** — Replace hardcoded CVE list with live API
5. **Detect Supabase anon vs service_role key** — Decode JWT found in JS, check `role` claim
6. **Add open redirect probes** — Append to existing auth scanner's path probing logic
