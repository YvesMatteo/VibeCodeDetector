# CheckVibe Security Report
## checkvibe.online

**URL:** https://checkvibe.online/  
**Scanned:** February 20, 2026 at 09:33 AM UTC  
**Status:** completed  

**Changes since Feb 20, 2026:** 12 resolved · 25 unchanged  

## Issues Found: 25 actionable — At Risk (30 passing checks)

| Severity | Count |
|----------|-------|
| 🔴 Critical | 1 |
| 🟠 High | 5 |
| 🟡 Medium | 11 |
| 🔵 Low | 8 |
| ℹ️ Info | 30 |

## Scanner Summary

| Scanner | Issues | Status |
|---------|--------|--------|
| API Key Detector | 0 | OK |
| GitHub Deep Scan | 1 | OK |
| GitHub Security Alerts | 2 | OK |
| Supabase Deep Lint | 5 | OK |
| Supabase Backend | 0 | OK |
| Firebase Backend | 0 | OK |
| Convex Backend | 0 | OK |
| Security Scanner | 0 | OK |
| Authentication Flow | 0 | OK |
| Dependency Vulnerabilities | 0 | OK |
| XSS Detection | 1 | OK |
| DNS & Email Security | 5 | OK |
| Vercel Hosting | 0 | OK |
| Netlify Hosting | 0 | OK |
| Cloudflare Pages | 0 | OK |
| Railway Hosting | 0 | OK |
| SSL/TLS Security | 2 | OK |
| SQL Injection | 0 | OK |
| CORS Misconfiguration | 0 | OK |
| CSRF Protection | 1 | OK |
| Cookie & Session Security | 0 | OK |
| Open Redirect | 0 | OK |
| OpenSSF Scorecard | 1 | OK |
| Threat Intelligence | 0 | OK |
| Tech Stack & CVEs | 0 | OK |
| Legal Compliance | 1 | OK |
| ai_llm | 0 | OK |
| Audit Logging & Monitoring | 3 | OK |
| DDoS Protection | 0 | OK |
| domain_hijacking | 3 | OK |
| File Upload Security | 0 | OK |
| graphql | 0 | OK |
| jwt_audit | 0 | OK |
| Mobile API Rate Limiting | 0 | OK |

## Detected Tech Stack

- **Vercel** (Hosting Platform)

---

## Detailed Scanner Results

### API Key Detector

**Issues:** 0 | **Info:** 0

No findings.

### GitHub Deep Scan

**Issues:** 1 | **Info:** 0

#### 🔴 AWS Access Key found in commit history

**Severity:** critical  
**Description:** A AWS Access Key was detected in the diff of file "dashboard/src/components/ui/feature-bento.tsx" in a recent commit. Even if it was later removed, the secret remains in git history.  
**Recommendation:** Rotate this credential immediately. Use BFG Repo-Cleaner or 'git filter-repo' to scrub it from history. Never commit secrets to source control.  
**Report:** https://github.com/YvesMatteo/VibeCodeDetector/commit/0fd6b83bd74e3470e0763ae35ae8f32cc21f00c3  

### GitHub Security Alerts

**Issues:** 2 | **Info:** 1

#### 🟡 Dependabot alerts not enabled or not accessible

**Severity:** medium  
**Description:** The Dependabot alerts API returned 404/403. Dependabot may not be enabled for this repository, or the token lacks permission.  
**Recommendation:** Enable Dependabot alerts in Settings > Code security and analysis. Ensure the token has `security_events` scope.  

#### 🟡 Code scanning (SAST) not enabled

**Severity:** medium  
**Description:** No code scanning results found. CodeQL or a similar SAST tool is not configured for this repository.  
**Recommendation:** Enable CodeQL code scanning via GitHub Actions. Go to Settings > Code security > Code scanning > Set up code scanning.  

#### Passing Checks

- ✅ No open secret scanning alerts

### Supabase Deep Lint

**Issues:** 5 | **Info:** 1

#### 🟠 3 overly permissive RLS policies

**Severity:** high  
**Description:** These policies use 'true' as the condition, effectively allowing unrestricted access: scans.Users can insert their own scans (INSERT), api_keys.Users can insert their own API keys (INSERT), projects.Users can create own projects (INSERT)  
**Recommendation:** Replace 'true' conditions with proper auth checks like (auth.uid() = user_id).  

```
scans.Users can insert their own scans (INSERT), api_keys.Users can insert their own API keys (INSERT), projects.Users can create own projects (INSERT)
```

#### 🟠 10 SECURITY DEFINER functions in public schema

**Severity:** high  
**Description:** These functions run with the privileges of the function creator (typically superuser), bypassing RLS: increment_scan_usage, handle_new_user, prevent_billing_field_updates, register_scan_domain, cleanup_usage_logs, cleanup_processed_events, check_project_limit, check_rate_limit, validate_api_key, cleanup_rate_limit_windows. If any accept user input, this can be exploited for privilege escalation.  
**Recommendation:** Change to SECURITY INVOKER unless the function specifically needs elevated privileges. If DEFINER is needed, validate all inputs.  

```
increment_scan_usage, handle_new_user, prevent_billing_field_updates, register_scan_domain, cleanup_usage_logs, cleanup_processed_events, check_project_limit, check_rate_limit, validate_api_key, cleanup_rate_limit_windows
```

#### 🔵 4 foreign key columns without indexes

**Severity:** low  
**Description:** These FK columns lack indexes, causing slow JOINs and cascading deletes: dismissed_findings.scan_id, alert_rules.user_id, project_webhooks.user_id, scheduled_scans.user_id  
**Recommendation:** Create indexes on foreign key columns: CREATE INDEX ON public.{table} ({column});  

```
dismissed_findings.scan_id, alert_rules.user_id, project_webhooks.user_id, scheduled_scans.user_id
```

#### 🟡 Write privileges granted to anon/authenticated on public tables

**Severity:** medium  
**Description:** The anon or authenticated roles have write access (INSERT/UPDATE/DELETE) on public tables. Without proper RLS policies, this allows unrestricted data modification. scans (anon): INSERT,UPDATE,DELETE; scans (authenticated): INSERT,UPDATE,DELETE; scheduled_scans (anon): INSERT,UPDATE,DELETE; scheduled_scans (authenticated): INSERT,UPDATE,DELETE; alert_rules (anon): INSERT,UPDATE,DELETE; alert_rules (authenticated): INSERT,UPDATE,DELETE; project_webhooks (anon): INSERT,UPDATE,DELETE; project_webhooks (authenticated): INSERT,UPDATE,DELETE; api_keys (anon): INSERT,UPDATE,DELETE; api_keys (authenticated): INSERT,UPDATE,DELETE; api_key_usage_log (anon): INSERT,UPDATE,DELETE; api_key_usage_log (authenticated): INSERT,UPDATE,DELETE; rate_limit_windows (anon): INSERT,UPDATE,DELETE; rate_limit_windows (authenticated): INSERT,UPDATE,DELETE; profiles (anon): INSERT,UPDATE,DELETE; profiles (authenticated): INSERT,UPDATE,DELETE; waitlist_emails (anon): INSERT,UPDATE,DELETE; waitlist_emails (authenticated): INSERT,UPDATE,DELETE; processed_webhook_events (anon): INSERT,UPDATE,DELETE; processed_webhook_events (authenticated): INSERT,UPDATE,DELETE; dismissed_findings (anon): INSERT,UPDATE,DELETE; dismissed_findings (authenticated): INSERT,UPDATE,DELETE; projects (anon): INSERT,UPDATE,DELETE; projects (authenticated): INSERT,UPDATE,DELETE  
**Recommendation:** Ensure RLS is enabled on all tables with write grants. Consider revoking write access from anon role where not needed.  

```
scans (anon): INSERT,UPDATE,DELETE; scans (authenticated): INSERT,UPDATE,DELETE; scheduled_scans (anon): INSERT,UPDATE,DELETE; scheduled_scans (authenticated): INSERT,UPDATE,DELETE; alert_rules (anon): INSERT,UPDATE,DELETE; alert_rules (authenticated): INSERT,UPDATE,DELETE; project_webhooks (anon): INSERT,UPDATE,DELETE; project_webhooks (authenticated): INSERT,UPDATE,DELETE; api_keys (anon): INSERT,UPDATE,DELETE; api_keys (authenticated): INSERT,UPDATE,DELETE; api_key_usage_log (anon): INSERT,UPDATE,DELETE; api_key_usage_log (authenticated): INSERT,UPDATE,DELETE; rate_limit_windows (anon): INSERT,UPDATE,DELETE; rate_limit_windows (authenticated): INSERT,UPDATE,DELETE; profiles (anon): INSERT,UPDATE,DELETE; profiles (authenticated): INSERT,UPDATE,DELETE; waitlist_emails (anon): INSERT,UPDATE,DELETE; waitlist_emails (authenticated): INSERT,UPDATE,DELETE; processed_webhook_events (anon): INSERT,UPDATE,DELETE; processed_webhook_events (authenticated): INSERT,UPDATE,DELETE; dismissed_findings (anon): INSERT,UPDATE,DELETE; dismissed_findings (authenticated): INSERT,UPDATE,DELETE; projects (anon): INSERT,UPDATE,DELETE; projects (authenticated): INSERT,UPDATE,DELETE
```

#### 🟡 3 tables with RLS enabled but no policies

**Severity:** medium  
**Description:** These tables have RLS enabled but zero policies defined: rate_limit_windows, waitlist_emails, processed_webhook_events. This means NO ONE (except service_role) can access the data, which may be unintentional.  
**Recommendation:** Add RLS policies for authenticated users, or disable RLS if the table should be freely accessible.  

```
rate_limit_windows, waitlist_emails, processed_webhook_events
```

#### Passing Checks

- ✅ All public tables have RLS enabled

### Supabase Backend

**Issues:** 0 | **Info:** 3

#### Passing Checks

- ✅ Supabase instance detected (provided in request)
- ✅ Anon key not found — some tests skipped
- ✅ Supabase properly configured

### Firebase Backend

**Issues:** 0 | **Info:** 0

No findings.

### Convex Backend

**Issues:** 0 | **Info:** 0

No findings.

### Security Scanner

**Issues:** 0 | **Info:** 0

No findings.

### Authentication Flow

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No standard auth pages detected

### Dependency Vulnerabilities

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No dependency files found

### XSS Detection

**Issues:** 1 | **Info:** 0

#### 🟡 No Content-Security-Policy header

**Severity:** medium  
**Description:** The server does not set a Content-Security-Policy (CSP) header. Without CSP, the browser has no instructions to restrict which scripts can execute, making any XSS vulnerability immediately exploitable. CSP is the single most effective HTTP header for mitigating XSS attacks.  
**Recommendation:** Implement a strict Content-Security-Policy header. Start with: script-src 'self'; object-src 'none'; base-uri 'self'; and avoid 'unsafe-inline' and 'unsafe-eval'. Use nonces or hashes for inline scripts.  

### DNS & Email Security

**Issues:** 5 | **Info:** 2

#### 🟠 No SPF record found

**Severity:** high  
**Description:** No SPF (Sender Policy Framework) record was found for this domain. Without SPF, any server can send email pretending to be from this domain, enabling phishing and spoofing attacks.  
**Recommendation:** Add a TXT record with an SPF policy. A basic starting point: v=spf1 include:_spf.google.com ~all (adjust for your email provider).  

#### 🔵 DMARC policy is 'quarantine'

**Severity:** low  
**Description:** The DMARC policy is set to "quarantine", which flags or spam-folders emails that fail authentication. This is good but "reject" provides stronger protection.  
**Recommendation:** Consider upgrading to p=reject once you are confident all legitimate email passes SPF and DKIM.  

#### 🟡 No DKIM records found for common selectors

**Severity:** medium  
**Description:** No DKIM records were found for any of the commonly used selectors (default, google, selector1, selector2, k1, mail, dkim, s1, s2). DKIM selector names vary by provider, so your domain may still have DKIM configured under a custom selector name.  
**Recommendation:** Verify with your email provider that DKIM signing is enabled. Check your provider documentation for the correct selector name and ensure a corresponding DNS TXT record exists.  

#### 🔵 No CAA records found

**Severity:** low  
**Description:** No CAA (Certificate Authority Authorization) records were found. Without CAA, any Certificate Authority can issue TLS certificates for this domain, increasing the risk of unauthorized certificate issuance.  
**Recommendation:** Add CAA records to restrict which Certificate Authorities can issue certificates. Example: 0 issue "letsencrypt.org" to only allow Let's Encrypt.  

#### 🔵 DNSSEC not enabled

**Severity:** low  
**Description:** DNSSEC is not enabled or not validated for this domain. Without DNSSEC, DNS responses can be spoofed by attackers (DNS cache poisoning), potentially redirecting users to malicious servers.  
**Recommendation:** Enable DNSSEC through your domain registrar or DNS hosting provider. Most modern registrars support one-click DNSSEC activation.  

#### Passing Checks

- ✅ No MX records found
- ✅ Certificate transparency log query failed

### Vercel Hosting

**Issues:** 0 | **Info:** 0

No findings.

### Netlify Hosting

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ Not a Netlify deployment

### Cloudflare Pages

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ Not a Cloudflare Pages deployment

### Railway Hosting

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ Not a Railway deployment

### SSL/TLS Security

**Issues:** 2 | **Info:** 7

#### 🔵 HSTS missing includeSubDomains directive

**Severity:** low  
**Description:** The HSTS header does not include the includeSubDomains directive. Subdomains may still be accessed over insecure HTTP.  
**Recommendation:** Add includeSubDomains to the HSTS header to enforce HTTPS on all subdomains.  

#### 🔵 Domain not in HSTS preload list

**Severity:** low  
**Description:** checkvibe.online is not in the HSTS browser preload list. Without preloading, the first visit to your site could still be over HTTP before the HSTS header is received.  
**Recommendation:** Submit your domain to hstspreload.org for inclusion. Requires HSTS with max-age >= 31536000, includeSubDomains, and preload directives.  

#### Passing Checks

- ✅ Certificate Transparency lookup unavailable
- ✅ HTTPS connection successful
- ✅ HSTS properly configured
- ✅ HTTP properly redirects to HTTPS
- ✅ SSL Labs grade: A+
- ✅ TLS 1.3 is supported
- ✅ Forward secrecy supported

### SQL Injection

**Issues:** 0 | **Info:** 0

No findings.

### CORS Misconfiguration

**Issues:** 0 | **Info:** 0

No findings.

### CSRF Protection

**Issues:** 1 | **Info:** 1

#### 🟡 No clickjacking protection detected

**Severity:** medium  
**Description:** Neither X-Frame-Options nor CSP frame-ancestors are set. This allows the site to be embedded in iframes on attacker pages, enabling clickjacking attacks (a form of CSRF).  
**Recommendation:** Add X-Frame-Options: DENY (or SAMEORIGIN) or use CSP's frame-ancestors directive.  

#### Passing Checks

- ✅ No HTML forms detected

### Cookie & Session Security

**Issues:** 0 | **Info:** 0

No findings.

### Open Redirect

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No Open Redirects Detected

### OpenSSF Scorecard

**Issues:** 1 | **Info:** 0

#### 🔵 Repository not found in OpenSSF Scorecard

**Severity:** low  
**Description:** The repository YvesMatteo/VibeCodeDetector was not found in the Scorecard database. It may be private, too new, or not yet analyzed.  
**Recommendation:** Ensure the repository is public. New repos may take a few days to appear in the Scorecard database. You can also run scorecard locally: https://github.com/ossf/scorecard  

### Threat Intelligence

**Issues:** 0 | **Info:** 0

No findings.

### Tech Stack & CVEs

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ 1 technologies detected

### Legal Compliance

**Issues:** 1 | **Info:** 0

#### 🔵 Site returned an error

**Severity:** low  
**Description:** HTTP 404 Not Found. Could not analyze legal compliance.  

### ai_llm

**Issues:** 0 | **Info:** 0

No findings.

### Audit Logging & Monitoring

**Issues:** 3 | **Info:** 1

#### 🟡 No security event reporting headers detected

**Severity:** medium  
**Description:** No NEL (Network Error Logging), Report-To, Reporting-Endpoints, or CSP report-uri headers were found. Without security event reporting, you won't know when your security policies are violated or when network errors affect your users.  
**Recommendation:** Add security reporting headers: NEL for network error logging, Report-To for collecting reports, and report-uri in your CSP to receive Content-Security-Policy violation reports.  

#### 🟡 No security.txt file

**Severity:** medium  
**Description:** No security.txt file was found at /.well-known/security.txt. This file tells security researchers how to report vulnerabilities responsibly. Without it, researchers may not know how to contact you, or may resort to public disclosure.  
**Recommendation:** Create a /.well-known/security.txt file with at least a Contact field. See https://securitytxt.org/ for the standard format.  

#### 🟠 No error monitoring or observability detected

**Severity:** high  
**Description:** No indicators of error monitoring (Sentry, Bugsnag, Rollbar) or observability platforms (Datadog, New Relic, OpenTelemetry) were found in the page source. Without monitoring, the application cannot: detect security incidents in real-time, provide audit trails for legal compliance, debug production issues, or prove what happened during a breach.  
**Recommendation:** Implement error monitoring (Sentry, Bugsnag) and observability (Datadog, New Relic). For legal audit compliance, ensure critical actions (login, password change, data deletion, admin operations, payment events) are logged to a tamper-evident store with timestamps and user IDs.  

#### Passing Checks

- ✅ Custom error pages configured

### DDoS Protection

**Issues:** 0 | **Info:** 0

No findings.

### domain_hijacking

**Issues:** 3 | **Info:** 6

#### 🟠 Domain transfer lock not enabled

**Severity:** high  
**Description:** The domain does not have clientTransferProhibited status. Without a transfer lock, an attacker with registrar access could transfer the domain away.  
**Recommendation:** Enable domain transfer lock (clientTransferProhibited) at your registrar.  

```
Current statuses: server transfer prohibited, client renew prohibited, client transfer prohibited, client update prohibited, client delete prohibited
```

#### 🟡 Domain delete lock not enabled

**Severity:** medium  
**Description:** The domain does not have clientDeleteProhibited status. Without this lock, the domain could be accidentally or maliciously deleted.  
**Recommendation:** Enable domain delete lock (clientDeleteProhibited) at your registrar.  

```
Current statuses: server transfer prohibited, client renew prohibited, client transfer prohibited, client update prohibited, client delete prohibited
```

#### 🟡 All nameservers from same provider

**Severity:** medium  
**Description:** All 2 nameservers are hosted by GoDaddy. If this provider experiences an outage, your domain becomes unreachable.  
**Recommendation:** Consider adding a secondary DNS provider for resilience against provider-level outages.  

```
Provider: GoDaddy, NS count: 2
```

#### Passing Checks

- ✅ Domain registration is current
- ✅ Domain registrar information
- ✅ All nameservers resolve correctly
- ✅ Nameserver configuration is secure
- ✅ No typosquat domains detected
- ✅ DNS zone surface is minimal

### File Upload Security

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No file upload functionality detected

### graphql

**Issues:** 0 | **Info:** 0

No findings.

### jwt_audit

**Issues:** 0 | **Info:** 0

No findings.

### Mobile API Rate Limiting

**Issues:** 0 | **Info:** 0

No findings.

---

*Report generated by [CheckVibe](https://checkvibe.dev) on 2026-02-20T09:34:23.525Z*
