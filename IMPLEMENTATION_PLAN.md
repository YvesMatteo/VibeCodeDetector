# Implementation Plan — 4 New Security Scanners (v8)

## Status
- [x] Planning
- [ ] In Progress
- [ ] Complete

## Overview

4 new edge function scanners + wiring into scan route and frontend. Each scanner is independent. New scan type IDs: `ddos_protection`, `file_upload`, `audit_logging`, `mobile_api`.

---

## Scanner 1: DDoS Protection Scanner

### [NEW] `supabase/functions/ddos-scanner/index.ts`

**Purpose:** Detect whether the target has DDoS protection, WAF, CDN, and rate limiting at the infrastructure level. The existing security-headers scanner only passively checks for rate limit headers — this scanner actively probes for protection.

**Checks (6 probes, all non-destructive):**

#### 1a. WAF Detection (header analysis)
Fetch the target URL and inspect response headers for known WAF signatures:

```typescript
const WAF_SIGNATURES: Array<{ name: string; headers: Record<string, RegExp | string> }> = [
    { name: 'Cloudflare', headers: { 'cf-ray': /.+/, 'server': /cloudflare/i } },
    { name: 'AWS WAF/CloudFront', headers: { 'x-amz-cf-id': /.+/ } },
    { name: 'Akamai', headers: { 'x-akamai-transformed': /.+/ } },
    { name: 'Sucuri', headers: { 'x-sucuri-id': /.+/ } },
    { name: 'Imperva/Incapsula', headers: { 'x-cdn': /incapsula/i } },
    { name: 'Fastly', headers: { 'x-served-by': /.+/, 'x-cache': /.+/, 'via': /varnish/i } },
    { name: 'Azure Front Door', headers: { 'x-azure-ref': /.+/ } },
    { name: 'Google Cloud Armor', headers: { 'x-cloud-trace-context': /.+/ } },
    { name: 'Vercel Edge', headers: { 'x-vercel-id': /.+/ } },
    { name: 'Netlify', headers: { 'x-nf-request-id': /.+/ } },
];
```

- If WAF detected: `info` finding "WAF/CDN detected: {name}" — no deduction
- If NO WAF/CDN detected: `medium` finding "No WAF or CDN protection detected" — deduct 15

#### 1b. Active Rate Limiting Probe
Send 5 rapid sequential GET requests (100ms apart) to the target URL. Check:
- If any returns HTTP 429 → `info` "Rate limiting active" (good)
- If rate limit headers (`X-RateLimit-*`, `RateLimit-*`, `Retry-After`) appear → `info` "Rate limit headers present"
- If none of the above → `high` "No rate limiting detected after 5 rapid requests" — deduct 15

```typescript
const RAPID_REQUEST_COUNT = 5;
const RAPID_REQUEST_DELAY_MS = 100;
let gotRateLimited = false;
let foundRateLimitHeaders = false;

for (let i = 0; i < RAPID_REQUEST_COUNT; i++) {
    const res = await fetchWithTimeout(targetUrl, { method: 'GET' });
    if (res.status === 429) { gotRateLimited = true; break; }
    const rlHeaders = ['x-ratelimit-limit', 'ratelimit-limit', 'x-rate-limit-limit', 'retry-after'];
    if (rlHeaders.some(h => res.headers.get(h))) { foundRateLimitHeaders = true; }
    if (i < RAPID_REQUEST_COUNT - 1) await new Promise(r => setTimeout(r, RAPID_REQUEST_DELAY_MS));
}
```

#### 1c. Connection Security
Check for:
- `Strict-Transport-Security` with `includeSubDomains` and `preload` → `info` (HSTS strong)
- Missing HSTS → `medium` deduct 5
- Check `X-Request-ID` or similar request tracking header → indicates infrastructure maturity

#### 1d. Server IP Exposure
Check if the server IP is directly exposed (not behind a proxy):
- If `server` header reveals origin server software with version → `low` "Origin server exposed"
- If behind CDN/WAF (from check 1a) → `info` "Origin IP protected by CDN/WAF"

#### 1e. Bot Protection Detection
Fetch the HTML body and check for:
- Cloudflare Turnstile script (`challenges.cloudflare.com/turnstile`)
- hCaptcha / reCAPTCHA presence
- JavaScript challenge pages (detect common challenge patterns)
- If found → `info` "Bot protection detected"
- If NOT found → `low` "No bot protection detected" — deduct 3

#### 1f. DDoS-Resilient Architecture Indicators
Check for:
- Multiple `A` records (load balancing) — not feasible from edge function (no DNS resolution), skip
- `X-Cache` or `Age` headers (caching layer present) → `info`
- `Vary` header with useful values → shows proper cache configuration

**Scoring:**
- Start at 100
- No WAF/CDN: -15
- No rate limiting: -15
- No HSTS: -5
- No bot protection: -3
- Clamp to [0, 100]

---

## Scanner 2: File Upload Security Scanner

### [NEW] `supabase/functions/upload-scanner/index.ts`

**Purpose:** Detect file upload forms on the page and check whether they have proper client-side security restrictions. Server-side validation can't be tested without actually uploading, but missing client-side restrictions are a strong signal of insecure upload handling.

**Checks (4 analysis areas):**

#### 2a. Upload Form Detection
Fetch the HTML body and parse for:
- `<input type="file">` elements
- `<form enctype="multipart/form-data">` elements
- Dropzone/upload library indicators (class names: `dropzone`, `file-upload`, `upload-area`)
- JavaScript upload patterns (regex scan for `FormData`, `file-upload`, `multer`, `busboy`)

```typescript
const FILE_INPUT_REGEX = /<input[^>]*type=["']file["'][^>]*>/gi;
const MULTIPART_FORM_REGEX = /<form[^>]*enctype=["']multipart\/form-data["'][^>]*>/gi;
const UPLOAD_LIB_REGEX = /(?:dropzone|filepond|uppy|fine-uploader|plupload|resumable)/gi;
const UPLOAD_JS_REGEX = /(?:new\s+FormData|\.upload\(|fileInput|handleUpload|onFileChange)/gi;
```

If no upload forms/indicators detected → return early with `info` "No file upload functionality detected" and score 100.

#### 2b. File Type Restriction Check
For each `<input type="file">` found:
- Check for `accept` attribute (e.g., `accept="image/*"`, `accept=".pdf,.doc"`)
- If `accept` present → `info` "File type restricted to: {types}"
- If NO `accept` attribute → `medium` "File upload accepts all file types" — deduct 10

```typescript
const acceptMatch = inputTag.match(/accept=["']([^"']+)["']/i);
if (!acceptMatch) {
    // No accept attribute — unrestricted file type
    score -= 10;
    findings.push({
        id: `upload-no-type-restrict-${idx}`,
        severity: 'medium',
        title: 'File upload accepts all file types',
        description: 'A file input element has no "accept" attribute, allowing users to upload any file type including executables.',
        recommendation: 'Add an accept attribute to restrict uploads to expected types (e.g., accept="image/*" or accept=".pdf,.doc,.docx").',
    });
}
```

#### 2c. Upload Security Headers
Check response headers for upload-relevant security:
- `X-Content-Type-Options: nosniff` → prevents MIME-type confusion attacks on uploaded files
  - Present → `info` "Content-Type-Options properly set"
  - Missing → `medium` "Missing X-Content-Type-Options" — deduct 8
- CSP `form-action` directive → restricts where forms can submit to
  - Present → `info` "CSP restricts form actions"
  - Missing (when upload forms exist) → `low` "No CSP form-action restriction" — deduct 3
- Check if file upload forms submit over HTTPS
  - HTTP action URL → `high` "File upload over insecure HTTP" — deduct 15

#### 2d. Upload Endpoint Probing
Check common upload endpoint paths with HEAD/OPTIONS requests:
```typescript
const UPLOAD_PATHS = ['/upload', '/api/upload', '/api/files', '/files/upload', '/media/upload', '/api/media'];
```
For each, send an OPTIONS request and check:
- If endpoint exists (200/204) but returns no `Content-Length` limit headers → `low` "Upload endpoint lacks size limit indicators"
- If endpoint returns `413` quickly → `info` "Server enforces upload size limits"
- Skip paths that return 404

**Scoring:**
- Start at 100
- Unrestricted file types: -10 per input (cap at -20)
- Missing nosniff: -8
- HTTP upload: -15
- No CSP form-action (when uploads exist): -3
- Clamp to [0, 100]

---

## Scanner 3: Audit Logging & Monitoring Scanner

### [NEW] `supabase/functions/audit-scanner/index.ts`

**Purpose:** Check for external indicators that the application has security monitoring, error logging, and audit trail capabilities. This scanner cannot definitively prove logging exists, but it detects strong signals of its presence or absence.

**Checks (5 analysis areas):**

#### 3a. Security Reporting Headers
Check response headers for monitoring/reporting infrastructure:
```typescript
const REPORTING_HEADERS = [
    { header: 'nel', name: 'Network Error Logging (NEL)', weight: 'high' },
    { header: 'report-to', name: 'Report-To', weight: 'high' },
    { header: 'reporting-endpoints', name: 'Reporting-Endpoints', weight: 'high' },
];
```
- Check CSP for `report-uri` or `report-to` directive
- Check for `Expect-CT` with `report-uri`
- If ANY reporting headers found → `info` "Security event reporting configured: {headers}"
- If NONE found → `medium` "No security event reporting headers detected" — deduct 10

#### 3b. security.txt Check
Fetch `/.well-known/security.txt`:
- If exists with valid content (has `Contact:` field) → `info` "security.txt properly configured"
- If missing → `medium` "No security.txt file" — deduct 5
- If exists but malformed (no Contact) → `low` "security.txt exists but incomplete"

#### 3c. Monitoring Infrastructure Detection
Scan the HTML body for indicators of monitoring/logging services:
```typescript
const MONITORING_SIGNATURES = [
    // Error monitoring
    { pattern: /sentry[._-]?io|@sentry|dsn.*sentry/i, name: 'Sentry', category: 'error_monitoring' },
    { pattern: /bugsnag/i, name: 'Bugsnag', category: 'error_monitoring' },
    { pattern: /rollbar/i, name: 'Rollbar', category: 'error_monitoring' },
    { pattern: /logrocket/i, name: 'LogRocket', category: 'session_replay' },
    { pattern: /datadoghq|dd-rum/i, name: 'Datadog', category: 'observability' },
    { pattern: /newrelic|nr-rum/i, name: 'New Relic', category: 'observability' },
    { pattern: /segment\.com|analytics\.js/i, name: 'Segment', category: 'analytics' },
    { pattern: /mixpanel/i, name: 'Mixpanel', category: 'analytics' },
    { pattern: /amplitude/i, name: 'Amplitude', category: 'analytics' },
    { pattern: /posthog/i, name: 'PostHog', category: 'product_analytics' },
    { pattern: /opentelemetry|otel/i, name: 'OpenTelemetry', category: 'observability' },
    { pattern: /grafana/i, name: 'Grafana', category: 'observability' },
];
```
- If error monitoring found (Sentry/Bugsnag/Rollbar) → `info` "Error monitoring detected: {name}"
- If observability platform found → `info` "Observability platform detected: {name}"
- If NO monitoring at all → `high` "No error monitoring or observability detected" — deduct 15
  - Description: "No indicators of error monitoring, logging, or observability infrastructure were found. Applications without monitoring cannot detect security incidents, debug production issues, or provide audit trails for legal compliance."
  - Recommendation: "Implement error monitoring (Sentry, Bugsnag) and observability (Datadog, New Relic). For audit compliance, ensure critical actions (login, password change, data access, admin operations) are logged to a tamper-evident store."

#### 3d. Error Disclosure Check
Fetch a non-existent path (e.g., `/__checkvibe_probe_404__`) and inspect the error page:
- If response contains stack trace patterns (`at .+\(`, `Traceback`, `Exception`, `.java:`, `.py:`, `node_modules`) → `high` "Error pages leak stack traces" — deduct 15
- If response contains framework identifiers (`Django`, `Rails`, `Express`, `Next.js error`) with version → `medium` "Error page reveals framework" — deduct 5
- If custom 404 page → `info` "Custom error pages configured"

#### 3e. Health/Status Endpoint Check
Check common monitoring endpoints:
```typescript
const HEALTH_PATHS = ['/health', '/api/health', '/healthz', '/status', '/_health', '/api/status'];
```
- If any returns 200 with JSON body → `info` "Health check endpoint available at {path}" (indicates operational monitoring)
- Not finding one is not penalized (many apps just don't expose this)

**Scoring:**
- Start at 100
- No reporting headers: -10
- No security.txt: -5
- No monitoring infrastructure: -15
- Stack trace leak: -15
- Framework disclosure on error: -5
- Clamp to [0, 100]

---

## Scanner 4: Mobile API Rate Limiting Scanner

### [NEW] `supabase/functions/mobile-scanner/index.ts`

**Purpose:** Check if mobile API endpoints are properly rate-limited. Founders often protect web routes but forget mobile APIs, leaving them vulnerable to abuse.

**Checks (5 analysis areas):**

#### 4a. Mobile User-Agent Rate Limiting Comparison
Send identical requests with desktop vs. mobile User-Agent and compare rate limit headers:

```typescript
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const MOBILE_UAS = [
    { name: 'iOS Safari', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' },
    { name: 'Android Chrome', ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36' },
    { name: 'React Native', ua: 'ReactNative/0.72' },
    { name: 'Expo', ua: 'Expo/50' },
];
```

- Send one request with desktop UA, record rate limit headers
- Send one request with each mobile UA, record rate limit headers
- If desktop has rate limiting but mobile doesn't → `high` "Mobile requests lack rate limiting" — deduct 20
- If both have rate limiting → `info` "Consistent rate limiting across platforms"
- If neither has rate limiting → `medium` "No rate limiting on any platform" — deduct 10

#### 4b. API Endpoint Discovery
Check for common API paths and test with mobile UA:
```typescript
const API_PATHS = [
    '/api', '/api/v1', '/api/v2', '/graphql',
    '/api/auth/login', '/api/auth/register', '/api/auth/reset-password',
    '/api/user', '/api/users', '/api/profile',
];
```
For each path that returns non-404:
- Check for rate limit headers with mobile UA
- Check for CORS headers (mobile apps often need specific CORS)
- If API endpoint found WITHOUT rate limiting → `medium` "API endpoint {path} lacks rate limiting with mobile UA" — deduct 5 per endpoint (cap at -15)

#### 4c. GraphQL Endpoint Check
If `/graphql` endpoint is found:
- Send an introspection query and check:
  - If introspection is enabled → `medium` "GraphQL introspection enabled in production" — deduct 5
  - Check for rate limit headers on GraphQL endpoint
  - If no rate limiting → `high` "GraphQL endpoint lacks rate limiting" — deduct 10
  - If rate limited → `info` "GraphQL endpoint has rate limiting"

```typescript
const introspectionQuery = JSON.stringify({
    query: '{ __schema { types { name } } }'
});
const gqlRes = await fetchWithTimeout(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': MOBILE_UAS[0].ua },
    body: introspectionQuery,
});
```

#### 4d. Authentication Endpoint Brute-Force Protection
Test login/auth endpoints for rate limiting under mobile UA:
- Send 3 rapid POST requests to `/api/auth/login` (or similar) with mobile UA
- Check if rate limiting kicks in or headers appear
- If found and no rate limiting → `critical` "Authentication endpoint not rate-limited for mobile clients" — deduct 20
- If not found → skip (don't penalize for not having this path)

#### 4e. API Versioning Check
Check if API endpoints have proper versioning:
- Look for `/api/v1`, `/api/v2` patterns in HTML links and scripts
- Check for `API-Version`, `Accept-Version` headers in responses
- If versioning found → `info` "API versioning detected"
- If no versioning and API endpoints exist → `low` "No API versioning detected" — deduct 3

**Scoring:**
- Start at 100
- Mobile lacks rate limiting (desktop has it): -20
- Auth endpoint not rate-limited for mobile: -20
- API endpoints without rate limiting: -5 per endpoint (cap at -15)
- GraphQL introspection enabled: -5
- GraphQL without rate limiting: -10
- No rate limiting on any platform: -10
- No API versioning: -3
- Clamp to [0, 100]

---

## Wiring: Scan Route

### [MODIFY] `dashboard/src/app/api/scan/route.ts`

**1. Add to `VALID_SCAN_TYPES` (line 7):**
Add `'ddos_protection', 'file_upload', 'audit_logging', 'mobile_api'` to the array.

**2. Add scanner calls (after scanner 26, before `await Promise.all`):**

```typescript
// 27. DDoS Protection Scanner (always runs)
scannerPromises.push(
    fetchWithTimeout(`${supabaseUrl}/functions/v1/ddos-scanner`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
            'x-scanner-key': scannerSecretKey,
        },
        body: JSON.stringify({ targetUrl }),
    })
        .then(res => res.json())
        .then(data => { results.ddos_protection = data; })
        .catch(err => { results.ddos_protection = { error: err.message, score: 0 }; })
);

// 28. File Upload Security Scanner (always runs)
scannerPromises.push(
    fetchWithTimeout(`${supabaseUrl}/functions/v1/upload-scanner`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
            'x-scanner-key': scannerSecretKey,
        },
        body: JSON.stringify({ targetUrl }),
    })
        .then(res => res.json())
        .then(data => { results.file_upload = data; })
        .catch(err => { results.file_upload = { error: err.message, score: 0 }; })
);

// 29. Audit Logging & Monitoring Scanner (always runs)
scannerPromises.push(
    fetchWithTimeout(`${supabaseUrl}/functions/v1/audit-scanner`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
            'x-scanner-key': scannerSecretKey,
        },
        body: JSON.stringify({ targetUrl }),
    })
        .then(res => res.json())
        .then(data => { results.audit_logging = data; })
        .catch(err => { results.audit_logging = { error: err.message, score: 0 }; })
);

// 30. Mobile API Rate Limiting Scanner (always runs)
scannerPromises.push(
    fetchWithTimeout(`${supabaseUrl}/functions/v1/mobile-scanner`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
            'x-scanner-key': scannerSecretKey,
        },
        body: JSON.stringify({ targetUrl }),
    })
        .then(res => res.json())
        .then(data => { results.mobile_api = data; })
        .catch(err => { results.mobile_api = { error: err.message, score: 0 }; })
);
```

**3. Add to `SCANNER_WEIGHTS` (line 732):**
```typescript
ddos_protection: 0.04,   // DDoS/WAF protection
file_upload: 0.03,       // File upload security
audit_logging: 0.02,     // Monitoring & audit readiness
mobile_api: 0.03,        // Mobile API rate limiting
```

---

## Wiring: Frontend

### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

**1. Add to `scannerIcons` map (line 66):**
```typescript
ddos_protection: ShieldCheck,   // or use Shield icon
file_upload: Upload,            // import Upload from lucide-react
audit_logging: FileText,        // import FileText from lucide-react
mobile_api: Smartphone,         // import Smartphone from lucide-react
```

Add imports for `Upload`, `FileText`, `Smartphone` from `lucide-react`.

**2. Add to `scannerNames` map (line 96):**
```typescript
ddos_protection: 'DDoS Protection',
file_upload: 'File Upload Security',
audit_logging: 'Audit Logging & Monitoring',
mobile_api: 'Mobile API Rate Limiting',
```

**3. Add to `SCANNER_ORDER` array (line 478):**
Insert in appropriate positions:
- `ddos_protection` after `security` (infrastructure-level check)
- `file_upload` after `auth` (application-level check)
- `audit_logging` after `file_upload`
- `mobile_api` after `audit_logging`

---

## Wiring: Plain English

### [MODIFY] `dashboard/src/lib/plain-english.ts`

Add entries for key findings from the new scanners:

```typescript
'no waf or cdn protection': {
    summary: 'Your site has no shield against attacks.',
    whyItMatters: 'Without a WAF or CDN, your server is directly exposed to DDoS attacks and automated exploitation attempts.',
},
'no rate limiting detected': {
    summary: 'Anyone can flood your server with requests.',
    whyItMatters: 'Without rate limiting, a single attacker can overwhelm your server, cause downtime, or brute-force user accounts.',
},
'file upload accepts all file types': {
    summary: 'Users can upload anything, including malware.',
    whyItMatters: 'Unrestricted file uploads let attackers upload executable files, web shells, or oversized files that crash your server.',
},
'no error monitoring or observability': {
    summary: 'You\'re flying blind in production.',
    whyItMatters: 'Without monitoring, you won\'t know when something breaks, when you\'re being attacked, or what happened when a customer reports an issue.',
},
'no security event reporting': {
    summary: 'Security incidents go undetected.',
    whyItMatters: 'Without reporting headers, your browser can\'t tell you when your security policies are violated. You need this data for incident response.',
},
'mobile requests lack rate limiting': {
    summary: 'Your mobile API is wide open to abuse.',
    whyItMatters: 'Attackers target mobile APIs specifically because developers often forget to rate-limit them. This allows credential stuffing, data scraping, and DDoS.',
},
'authentication endpoint not rate-limited': {
    summary: 'Attackers can try unlimited passwords.',
    whyItMatters: 'Without rate limiting on login, an attacker can try millions of password combinations. This is the #1 way accounts get hacked.',
},
'error pages leak stack traces': {
    summary: 'Your error pages reveal your code internals.',
    whyItMatters: 'Stack traces tell attackers exactly what framework, libraries, and file paths you use — making targeted attacks much easier.',
},
'graphql introspection enabled': {
    summary: 'Anyone can see your entire API schema.',
    whyItMatters: 'GraphQL introspection reveals every query, mutation, and type in your API — giving attackers a complete map of your attack surface.',
},
```

---

## Deployment

### Deploy New Edge Functions
```bash
for scanner in ddos-scanner upload-scanner audit-scanner mobile-scanner; do
    supabase functions deploy $scanner --no-verify-jwt
done
```

### Set Environment Variables
Each new scanner uses the same shared env vars (SCANNER_SECRET_KEY, ALLOWED_ORIGIN) — no new secrets needed.

### Build Verification
```bash
cd dashboard && npm run build
```

---

## Summary Table

| Scanner | ID | Edge Function Dir | Weight | Always-Run |
|---------|----|--------------------|--------|------------|
| DDoS Protection | `ddos_protection` | `ddos-scanner/` | 0.04 | Yes |
| File Upload Security | `file_upload` | `upload-scanner/` | 0.03 | Yes |
| Audit Logging & Monitoring | `audit_logging` | `audit-scanner/` | 0.02 | Yes |
| Mobile API Rate Limiting | `mobile_api` | `mobile-scanner/` | 0.03 | Yes |

### Files Modified
- `dashboard/src/app/api/scan/route.ts` — add 4 scanner calls + weights + valid types
- `dashboard/src/components/dashboard/scanner-accordion.tsx` — add icons, names, order
- `dashboard/src/lib/plain-english.ts` — add explanations for new findings

### Files Created
- `supabase/functions/ddos-scanner/index.ts`
- `supabase/functions/upload-scanner/index.ts`
- `supabase/functions/audit-scanner/index.ts`
- `supabase/functions/mobile-scanner/index.ts`
