# Implementation Plan — Scanner Suite v3 Upgrade

## Status
- [x] Planning
- [ ] In Progress
- [ ] Complete

## Overview

8 workstreams, ordered by priority. Each produces a deployable Edge Function + route.ts wiring.

---

## Phase 1: P0 — GitHub Deep Secrets Scanner (Rebuild)

### [MODIFY] `supabase/functions/github-scanner/index.ts`

Complete rewrite. The current scanner uses GitHub Search API which can't scan git history and has severe rate limits (30 searches/min). The rebuild uses GitHub's Git Data API to walk commit trees.

**New approach — 8 checks (up from 5):**

1. **Check 1: Current .env files** (keep existing logic)
   - `GET /repos/{owner}/{repo}/contents/{file}` for `.env`, `.env.local`, `.env.production`, `.env.staging`, `.env.development`
   - Decode base64 content, scan for real secrets vs placeholders

2. **Check 2: Git history for deleted .env files** (keep existing logic)
   - `GET /repos/{owner}/{repo}/commits?path={file}&per_page=1`

3. **Check 3: .gitignore validation** (keep existing logic)
   - `GET /repos/{owner}/{repo}/contents/.gitignore`

4. **Check 4: Deep commit history scanning** (NEW — replaces old search-based check)
   - `GET /repos/{owner}/{repo}/commits?per_page=30` → get last 30 commits on default branch
   - For each commit, `GET /repos/{owner}/{repo}/commits/{sha}` → get `files[]` array with `patch` diffs
   - Scan each patch/diff against the full 50+ secret pattern list (see below)
   - Group findings by file, deduplicate, cap at 10 findings
   - This catches secrets that were committed and then removed in later commits

5. **Check 5: Multi-branch scanning** (NEW)
   - `GET /repos/{owner}/{repo}/branches?per_page=10` → get all branches
   - For non-default branches, check latest commit diff for secrets
   - Flag if secrets found on non-default branches (often forgotten)

6. **Check 6: Dangerous file detection** (expanded from old check 5)
   - Search for via tree API: `GET /repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1`
   - Scan file paths for: `.pem`, `.key`, `id_rsa`, `id_ed25519`, `.pfx`, `.p12`, `credentials.json`, `service-account.json`, `terraform.tfstate`, `.tfvars`, `kubeconfig`, `docker-compose.yml` (if contains passwords), `.npmrc` (if contains token), `.pypirc`

7. **Check 7: Dependency file secret scan** (NEW)
   - Check `docker-compose.yml`, `docker-compose.yaml` for hardcoded passwords
   - Check `.github/workflows/*.yml` for hardcoded secrets (not using `${{ secrets.* }}`)
   - Check `Makefile`, `Dockerfile` for hardcoded credentials via `ENV` or `ARG`

8. **Check 8: .env.example with real values** (NEW)
   - Fetch `.env.example`, `.env.sample`, `.env.template`
   - Check if they contain actual secret values instead of placeholders

**Expanded secret patterns (50+ total):**

```typescript
const SECRET_PATTERNS = [
  // Keep all 16 existing patterns, PLUS add:
  { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, label: "Supabase Service Role Key", severity: "critical", validate: (m: string) => atob(m.split('.')[1]).includes('"role":"service_role"') },
  { pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/, label: "Anthropic API Key", severity: "critical" },
  { pattern: /sk-proj-[a-zA-Z0-9]{48,}/, label: "OpenAI Project Key", severity: "critical" },
  { pattern: /hf_[a-zA-Z0-9]{34,}/, label: "Hugging Face Token", severity: "high" },
  { pattern: /r8_[a-zA-Z0-9]{20,}/, label: "Replicate API Token", severity: "high" },
  { pattern: /AIza[0-9A-Za-z-_]{35}/, label: "Google/Firebase API Key", severity: "high" },
  { pattern: /SK[a-f0-9]{32}/, label: "Twilio API Key", severity: "high" },
  { pattern: /SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}/, label: "SendGrid API Key", severity: "critical" },
  { pattern: /key-[a-zA-Z0-9]{32}/, label: "Mailgun API Key", severity: "critical" },
  { pattern: /[a-f0-9]{32}-us[0-9]{1,2}/, label: "Mailchimp API Key", severity: "high" },
  { pattern: /shppa_[0-9a-fA-F]{32}/, label: "Shopify Private App Token", severity: "critical" },
  { pattern: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9a-zA-Z]{24}/, label: "Slack Webhook URL", severity: "high" },
  { pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/, label: "Discord Webhook URL", severity: "high" },
  { pattern: /\d{8,10}:[A-Za-z0-9_-]{35}/, label: "Telegram Bot Token", severity: "critical" },
  { pattern: /npm_[A-Za-z0-9]{36}/, label: "NPM Token", severity: "critical" },
  { pattern: /pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}/, label: "PyPI API Token", severity: "critical" },
  { pattern: /dckr_pat_[A-Za-z0-9_-]{20,}/, label: "Docker Hub PAT", severity: "critical" },
  { pattern: /glpat-[0-9a-zA-Z_-]{20,}/, label: "GitLab PAT", severity: "critical" },
  { pattern: /v1\.[0-9a-f]{40}/, label: "Cloudflare API Token", severity: "high", requiresContext: true },
  { pattern: /sq0atp-[0-9A-Za-z_-]{22,}/, label: "Square Access Token", severity: "critical" },
  { pattern: /dp\.st\.[a-zA-Z0-9_-]{40,}/, label: "Doppler Token", severity: "critical" },
  { pattern: /snyk_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/, label: "Snyk API Token", severity: "high" },
  { pattern: /lin_api_[a-zA-Z0-9]{40,}/, label: "Linear API Key", severity: "high" },
  { pattern: /nk_[a-zA-Z0-9]{30,}/, label: "Neon Database Key", severity: "critical" },
  // Database connection strings (enhanced)
  { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@\s]+@[^\s'"]+/, label: "MongoDB Connection String", severity: "critical" },
  { pattern: /postgres(ql)?:\/\/[^:]+:[^@\s]+@[^\s'"]+/, label: "PostgreSQL Connection String", severity: "critical" },
  { pattern: /mysql:\/\/[^:]+:[^@\s]+@[^\s'"]+/, label: "MySQL Connection String", severity: "critical" },
  { pattern: /redis:\/\/[^:]*:[^@\s]+@[^\s'"]+/, label: "Redis Connection String", severity: "critical" },
  { pattern: /amqp:\/\/[^:]+:[^@\s]+@[^\s'"]+/, label: "RabbitMQ Connection String", severity: "critical" },
];
```

**Scoring (unchanged):**
- Real secrets in .env: -30
- Potential creds: -20
- .env exists without secrets: -5
- History secrets: -20
- Missing .gitignore: -10
- Private keys: -25
- Secrets in commit diffs: -25
- Secrets on non-default branch: -15
- Dangerous files: -15
- .env.example with real values: -10

---

## Phase 2: P0 — Supabase Backend Scanner (New)

### [NEW] `supabase/functions/supabase-scanner/index.ts`

**Scanner type ID:** `supabase_backend`

**Input:** `{ targetUrl, supabaseUrl? }` — supabaseUrl is the user's Supabase project URL (optional, auto-detected from HTML if not provided)

**Detection strategy:**
1. **Auto-detect Supabase URL** from HTML/JS of the target site:
   - Search for `https://*.supabase.co` patterns in page source and JS files
   - Extract anon key from `supabase.createClient()` calls or env-like patterns

2. **Test 1: Anon key capability audit** (using detected anon key)
   - `GET {supabaseUrl}/rest/v1/` with anon key → enumerate exposed tables via PostgREST schema
   - For each table found, try `GET {supabaseUrl}/rest/v1/{table}?limit=1` → check if data is readable
   - Flag tables that return data (RLS may be disabled or too permissive)
   - Severity: critical if returns user data, high if returns any data

3. **Test 2: Service role key detection**
   - Scan HTML/JS for JWT tokens matching `eyJ...`
   - Decode JWT payload, check for `"role": "service_role"` claim
   - If found: critical finding (-40) — service role key bypasses all RLS
   - Evidence: first 20 chars of token + "...[REDACTED]"

4. **Test 3: Storage bucket enumeration**
   - `GET {supabaseUrl}/storage/v1/bucket` with anon key
   - Check response for public buckets
   - For each public bucket, try `GET {supabaseUrl}/storage/v1/object/list/{bucket}` → check if files are listable
   - Severity: high if buckets listable, medium if just bucket names exposed

5. **Test 4: Auth configuration exposure**
   - `GET {supabaseUrl}/auth/v1/settings` → check if auth settings are publicly readable
   - Check for insecure defaults: email confirmation disabled, weak password policy

6. **Test 5: Edge Function auth check**
   - If Supabase URL detected, try common function paths without auth:
   - `POST {supabaseUrl}/functions/v1/{common-name}` with no auth header
   - Flag if functions respond with 200 instead of 401

7. **Test 6: Realtime channel exposure**
   - Check if `{supabaseUrl}/realtime/v1` is accessible
   - Try subscribing to common channel names without auth

8. **Test 7: PostgREST introspection**
   - `GET {supabaseUrl}/rest/v1/rpc/` → check if RPC functions are enumerable
   - Flag dangerous functions (delete_, drop_, admin_)

**Scoring:**
- Service role key leaked: -40 (critical)
- Tables readable without auth: -25 per table (critical, capped at -50)
- Public storage buckets listable: -15 (high)
- Auth settings exposed: -10 (medium)
- Functions accessible without auth: -15 (high)
- Realtime accessible: -10 (medium)
- RPC functions exposed: -10 (medium)
- Supabase detected but all secure: +info finding "Good: Supabase properly configured"

---

## Phase 3: P1 — Dependency Vulnerability Scanner (New)

### [NEW] `supabase/functions/deps-scanner/index.ts`

**Scanner type ID:** `dependencies`

**Input:** `{ targetUrl, githubRepo? }` — needs githubRepo to read dependency files

**Approach:**
1. If `githubRepo` provided, fetch dependency files via GitHub Contents API:
   - `package.json`, `package-lock.json` (npm/Node)
   - `requirements.txt`, `Pipfile.lock` (Python)
   - `Gemfile.lock` (Ruby)
   - `composer.lock` (PHP)
   - `go.sum` (Go)
   - `Cargo.lock` (Rust)

2. Parse dependency names + versions from each file

3. For each dependency, query **OSV.dev API** (free, no key required):
   ```
   POST https://api.osv.dev/v1/query
   { "package": { "name": "lodash", "ecosystem": "npm" }, "version": "4.17.15" }
   ```

4. Batch queries using `POST https://api.osv.dev/v1/querybatch` (up to 1000 at once)

5. Map OSV severity to findings:
   - CRITICAL → critical finding (-20)
   - HIGH → high finding (-15)
   - MODERATE → medium finding (-8)
   - LOW → low finding (-3)

6. Cap deductions at -80 (always show some findings even if many vulns)

7. Group findings by package for cleaner output

**Fallback:** If no githubRepo, detect technology from tech scanner results and show an info-level finding suggesting the user provide a repo URL.

---

## Phase 4: P1 — SSL/TLS Scanner (New)

### [NEW] `supabase/functions/ssl-scanner/index.ts`

**Scanner type ID:** `ssl_tls`

**Approach — use SSL Labs API** (free, no key required):

1. Submit analysis: `GET https://api.ssllabs.com/api/v3/analyze?host={domain}&startNew=on&all=done`
2. Poll for completion: `GET https://api.ssllabs.com/api/v3/analyze?host={domain}`
3. Parse results for:
   - **Certificate expiry**: warn if <30 days, critical if expired
   - **Certificate chain**: flag incomplete chains
   - **Protocol support**: flag TLS 1.0/1.1 (high), SSL 3.0 (critical)
   - **Cipher suites**: flag RC4, DES, NULL, EXPORT ciphers
   - **Grade**: map SSL Labs grade (A+/A/B/C/D/E/F/T) to score
   - **HSTS preload**: check if domain is in preload list
   - **Key size**: flag RSA <2048 or ECDSA <256
   - **Certificate transparency**: check CT logs

4. **Fallback** (if SSL Labs is slow/unavailable): Basic TLS check via Deno's `Deno.connectTls`:
   - Check certificate validity dates
   - Check certificate chain depth
   - Extract protocol version

**Scoring:**
- Grade A+/A: 100, B: 80, C: 60, D: 40, F: 0
- Expired cert: -50
- TLS 1.0/1.1 supported: -20
- Weak ciphers: -15
- <30 days until expiry: -10
- Missing HSTS preload: -5

**Timeout strategy:** SSL Labs analysis can take 60+ seconds. Solution:
- On first scan, submit analysis and return partial result with `"pending": true`
- On subsequent scans of same domain, check if analysis is complete
- Cache results for 24 hours

Alternative faster approach: Skip SSL Labs, use Deno TLS directly + check crt.sh for certificate info.

---

## Phase 5: P1 — DNS & Email Security Scanner (New)

### [NEW] `supabase/functions/dns-scanner/index.ts`

**Scanner type ID:** `dns_email`

**Approach — DNS lookups via public DNS-over-HTTPS APIs** (no special libraries needed in Deno):

Use Google's DNS-over-HTTPS: `GET https://dns.google/resolve?name={domain}&type={type}`
Or Cloudflare: `GET https://cloudflare-dns.com/dns-query?name={domain}&type={type}` with `Accept: application/dns-json`

**Checks:**

1. **SPF Record** (`TXT` lookup for `v=spf1`):
   - Missing: -15 (high) — email spoofing possible
   - Too permissive (`+all`): -10 (high)
   - Uses `~all` (softfail): -3 (low)
   - Correct (`-all` or `redirect`): pass

2. **DKIM** (`TXT` lookup for common selectors: `default._domainkey`, `google._domainkey`, `selector1._domainkey`, `selector2._domainkey`, `k1._domainkey`):
   - At least one DKIM record found: pass
   - None found: -10 (medium) — can't verify email authenticity

3. **DMARC** (`TXT` lookup for `_dmarc.{domain}`):
   - Missing: -15 (high)
   - `p=none`: -5 (medium) — monitoring only, no enforcement
   - `p=quarantine`: -2 (low)
   - `p=reject`: pass (strict)

4. **DNSSEC** (`ANY` or specific lookup with DO flag via DNS.google `&do=1`):
   - Check for `ad` (authenticated data) flag in response
   - Missing: -5 (low/info)

5. **CAA Record** (`CAA` type lookup):
   - Missing: -3 (low) — any CA can issue certificates
   - Present: pass

6. **MX Record analysis**:
   - Check if MX points to known secure providers (Google, Microsoft, Proton, etc.)
   - Flag open relay indicators

7. **Dangling CNAME / Subdomain Takeover** (bonus):
   - Fetch `https://crt.sh/?q=%.{domain}&output=json` for CT log subdomains
   - For each subdomain CNAME, check if target resolves → if not, flag as potential takeover
   - Limit to first 20 subdomains from CT logs

**Scoring:**
- All checks pass: 100
- Missing SPF: -15, Missing DMARC: -15, Missing DKIM: -10
- Permissive SPF: -10, DMARC p=none: -5
- Missing CAA: -3, Missing DNSSEC: -5

---

## Phase 6: P2 — XSS Scanner (New)

### [NEW] `supabase/functions/xss-scanner/index.ts`

**Scanner type ID:** `xss`

**Approach — passive + light active testing:**

1. **DOM XSS sink detection** (passive — scan JS sources):
   - Scan for dangerous sinks: `innerHTML`, `outerHTML`, `document.write()`, `document.writeln()`, `eval()`, `setTimeout(string)`, `setInterval(string)`, `Function()`, `$.html()`, `.insertAdjacentHTML()`
   - Scan for dangerous sources being passed to sinks: `location.hash`, `location.search`, `document.URL`, `document.referrer`, `window.name`, `postMessage`
   - Score: per sink-source pair found, -10 (medium)

2. **Reflected XSS probing** (active — safe payloads):
   - Extract URL parameters from the target URL
   - For each parameter, inject a unique canary string: `cvbxss12345`
   - Check if the canary appears unescaped in the response HTML
   - If reflected, try a harmless HTML probe: `<cvb test="1">` (no script, no event handlers)
   - If HTML tags are reflected unescaped: high finding (-20)
   - If only text is reflected: low finding (info, properly escaped)

3. **Template injection probing:**
   - Inject `{{7*7}}` in parameters, check if `49` appears in response (Angular/Vue template injection)
   - Inject `${7*7}` for template literal injection
   - If computed: critical finding (-30)

4. **CSP bypass indicators** (from existing security-headers results):
   - If `unsafe-inline` in CSP script-src: amplifies XSS risk → note in findings

**Safety:**
- NEVER inject `<script>`, `onerror`, `onload`, or any executable payload
- Only inject canary strings and harmless HTML tags
- Max 10 parameters tested
- 5s timeout per probe

**Scoring:**
- Template injection: -30 (critical)
- Reflected HTML unescaped: -20 (high)
- DOM XSS sink+source pair: -10 (medium) each, capped at -30
- Reflected but escaped: info only

---

## Phase 7: P2 — Open Redirect Scanner (New)

### [NEW] `supabase/functions/redirect-scanner/index.ts`

**Scanner type ID:** `open_redirect`

**Approach:**

1. **Parameter-based redirect testing:**
   - Common redirect parameters: `redirect`, `redirect_uri`, `redirect_url`, `next`, `url`, `return`, `return_to`, `returnTo`, `continue`, `dest`, `destination`, `goto`, `target`, `rurl`, `redir`, `callback`, `forward`
   - For each found parameter (from URL + discovered auth pages), set value to:
     - `https://evil.example.com`
     - `//evil.example.com`
     - `/\evil.example.com`
     - `https://evil.example.com%00.{target_domain}` (null byte bypass)
   - Follow redirects manually (max 3 hops), check if final URL is `evil.example.com`
   - Use `redirect: 'manual'` in fetch to inspect Location header

2. **Path-based redirect testing:**
   - Try `{targetUrl}/redirect?url=https://evil.example.com`
   - Try `{targetUrl}/oauth/authorize?redirect_uri=https://evil.example.com`
   - Try `{targetUrl}/login?next=https://evil.example.com`

3. **Meta refresh / JS redirect detection:**
   - Check if response HTML contains `<meta http-equiv="refresh" content="0;url={param_value}">`
   - Check for `window.location = param_value` or `window.location.href = param_value`

**Scoring:**
- Full redirect to external domain: -25 (critical)
- Protocol-relative redirect (//evil.com): -20 (high)
- Redirect with bypass technique: -25 (critical)
- JS/meta redirect: -15 (high)
- No redirects: 100

---

## Phase 8: P2 — Tech Scanner Enhancement (Live CVE)

### [MODIFY] `supabase/functions/tech-scanner/index.ts`

**Changes:**

1. **Add OSV.dev API integration** alongside existing hardcoded CVE list:
   - After detecting technologies, batch-query OSV.dev:
     ```
     POST https://api.osv.dev/v1/querybatch
     { "queries": [
       { "package": { "name": "next", "ecosystem": "npm" }, "version": "14.0.0" },
       { "package": { "name": "jquery", "ecosystem": "npm" }, "version": "3.4.1" }
     ]}
     ```
   - Map technology names to ecosystem: Next.js→npm:next, jQuery→npm:jquery, PHP→Packagist:php, etc.
   - Merge OSV results with hardcoded CVE results (deduplicate by CVE ID)

2. **Keep hardcoded CVE list as fallback** (if OSV API is down)

3. **Add technology-to-ecosystem mapping:**
   ```typescript
   const TECH_TO_ECOSYSTEM: Record<string, { ecosystem: string; packageName: string }> = {
     'Next.js': { ecosystem: 'npm', packageName: 'next' },
     'React': { ecosystem: 'npm', packageName: 'react' },
     'Vue.js': { ecosystem: 'npm', packageName: 'vue' },
     'Angular': { ecosystem: 'npm', packageName: '@angular/core' },
     'jQuery': { ecosystem: 'npm', packageName: 'jquery' },
     'Bootstrap': { ecosystem: 'npm', packageName: 'bootstrap' },
     'Express': { ecosystem: 'npm', packageName: 'express' },
     'WordPress': { ecosystem: 'Packagist', packageName: 'wordpress/wordpress' },
     'Drupal': { ecosystem: 'Packagist', packageName: 'drupal/core' },
     'Laravel': { ecosystem: 'Packagist', packageName: 'laravel/framework' },
     'Django': { ecosystem: 'PyPI', packageName: 'Django' },
     'Ruby on Rails': { ecosystem: 'RubyGems', packageName: 'rails' },
   };
   ```

---

## Phase 9: Wire Everything Together

### [MODIFY] `dashboard/src/app/api/scan/route.ts`

1. **Update `VALID_SCAN_TYPES`:**
   ```typescript
   const VALID_SCAN_TYPES = [
     'security', 'api_keys', 'seo', 'legal', 'threat_intelligence', 'sqli',
     'tech_stack', 'cors', 'csrf', 'cookies', 'auth',
     // New in v3:
     'supabase_backend', 'dependencies', 'ssl_tls', 'dns_email',
     'xss', 'open_redirect',
   ] as const;
   ```

2. **Add new scanner invocations** (same pattern as existing):
   ```typescript
   // 13. Supabase Backend Scanner
   scannerPromises.push(
     fetchWithTimeout(`${supabaseUrl}/functions/v1/supabase-scanner`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken || supabaseAnonKey}`, 'x-scanner-key': scannerSecretKey },
       body: JSON.stringify({ targetUrl, supabaseUrl: body.supabaseUrl }),
     }).then(res => res.json()).then(data => { results.supabase_backend = data; }).catch(err => { results.supabase_backend = { error: err.message, score: 0 }; })
   );

   // 14. Dependency Scanner (only if githubRepo provided)
   if (githubRepo && typeof githubRepo === 'string') {
     scannerPromises.push(/* deps-scanner invocation */);
   }

   // 15. SSL/TLS Scanner
   scannerPromises.push(/* ssl-scanner invocation */);

   // 16. DNS/Email Scanner
   scannerPromises.push(/* dns-scanner invocation */);

   // 17. XSS Scanner
   scannerPromises.push(/* xss-scanner invocation */);

   // 18. Open Redirect Scanner
   scannerPromises.push(/* redirect-scanner invocation */);
   ```

3. **Update `SCANNER_WEIGHTS`:**
   ```typescript
   const SCANNER_WEIGHTS: Record<string, number> = {
     security: 0.12,
     sqli: 0.10,
     cors: 0.08,
     csrf: 0.08,
     cookies: 0.07,
     auth: 0.08,
     api_keys: 0.08,
     xss: 0.08,            // NEW
     supabase_backend: 0.06, // NEW
     open_redirect: 0.05,   // NEW
     ssl_tls: 0.05,         // NEW
     dns_email: 0.04,       // NEW
     dependencies: 0.04,    // NEW
     threat_intelligence: 0.04,
     github_secrets: 0.04,
     tech_stack: 0.03,
     seo: 0.02,
     legal: 0.01,
   };
   ```

4. **Pass `supabaseUrl` from request body** to supabase-scanner:
   ```typescript
   const { url, scanTypes, githubRepo, supabaseUrl } = body;
   ```

### [MODIFY] `dashboard/src/app/dashboard/scans/new/page.tsx`

1. **Add Supabase URL input field** (optional, after GitHub repo field):
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="supabaseUrl">Supabase Project URL (optional)</Label>
     <Input
       id="supabaseUrl"
       placeholder="https://yourproject.supabase.co"
       value={supabaseUrl}
       onChange={(e) => setSupabaseUrl(e.target.value)}
     />
     <p className="text-xs text-muted-foreground">
       Auto-detected from your site if not provided. Enables deep backend security scanning.
     </p>
   </div>
   ```

2. **Add new scanner descriptions** to the "What's Included" section:
   - XSS Scanner icon + description
   - Open Redirect Scanner icon + description
   - SSL/TLS Scanner icon + description
   - DNS/Email Security icon + description
   - Backend Infrastructure icon + description
   - Dependency Vulnerabilities icon + description

3. **Pass `supabaseUrl` in fetch body:**
   ```typescript
   body: JSON.stringify({
     url,
     scanTypes: ['security', 'api_keys', 'seo', 'legal', 'threat_intelligence', 'sqli', 'tech_stack', 'supabase_backend', 'dependencies', 'ssl_tls', 'dns_email', 'xss', 'open_redirect'],
     ...(githubRepo.trim() ? { githubRepo: githubRepo.trim() } : {}),
     ...(supabaseUrl.trim() ? { supabaseUrl: supabaseUrl.trim() } : {}),
   }),
   ```

### [MODIFY] `dashboard/src/app/dashboard/scans/[id]/page.tsx`

1. **Add result display components** for each new scanner type
2. **Add icons** for new scanner categories (use Lucide: `Shield`, `Lock`, `Mail`, `Code`, `AlertTriangle`, `Package`)
3. **Handle "pending" state** for SSL/TLS scanner (which may return a pending result on first scan)

---

## Verification

### Deploy & Test Each Scanner

```bash
# Deploy all new scanners
supabase functions deploy github-scanner --no-verify-jwt
supabase functions deploy supabase-scanner --no-verify-jwt
supabase functions deploy deps-scanner --no-verify-jwt
supabase functions deploy ssl-scanner --no-verify-jwt
supabase functions deploy dns-scanner --no-verify-jwt
supabase functions deploy xss-scanner --no-verify-jwt
supabase functions deploy redirect-scanner --no-verify-jwt

# Set secrets for new scanners (if needed)
# No new API keys required! All new scanners use free APIs:
# - OSV.dev: free, no key
# - SSL Labs: free, no key
# - DNS-over-HTTPS: free, no key
# - GitHub API: already configured (GITHUB_TOKEN)

# Test each scanner individually
curl -X POST https://vlffoepzknlbyxhkmwmn.supabase.co/functions/v1/dns-scanner \
  -H "Content-Type: application/json" \
  -H "x-scanner-key: $SCANNER_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"targetUrl": "https://example.com"}'
```

### Test Full Scan

```bash
# Run full scan with all new scanner types
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cvd_live_..." \
  -d '{
    "url": "https://example.com",
    "githubRepo": "owner/repo",
    "supabaseUrl": "https://project.supabase.co"
  }'
```

### Build Verification

```bash
cd dashboard && npm run build
```

---

## Summary Table

| Phase | Scanner | Type ID | Priority | External APIs | New Files |
|-------|---------|---------|----------|---------------|-----------|
| 1 | GitHub Deep Secrets | `github_secrets` | P0 | GitHub API (existing) | Modify `github-scanner/index.ts` |
| 2 | Supabase Backend | `supabase_backend` | P0 | None (Supabase REST) | New `supabase-scanner/index.ts` |
| 3 | Dependencies | `dependencies` | P1 | OSV.dev (free) | New `deps-scanner/index.ts` |
| 4 | SSL/TLS | `ssl_tls` | P1 | SSL Labs (free) | New `ssl-scanner/index.ts` |
| 5 | DNS/Email | `dns_email` | P1 | Google DNS-over-HTTPS (free) | New `dns-scanner/index.ts` |
| 6 | XSS | `xss` | P2 | None | New `xss-scanner/index.ts` |
| 7 | Open Redirect | `open_redirect` | P2 | None | New `redirect-scanner/index.ts` |
| 8 | Tech CVE Enhancement | `tech_stack` | P2 | OSV.dev (free) | Modify `tech-scanner/index.ts` |
| 9 | Wire Together | — | — | — | Modify `route.ts`, scan form, results page |
