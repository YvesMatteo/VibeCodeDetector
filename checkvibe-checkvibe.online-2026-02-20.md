# CheckVibe Security Report
## checkvibe.online

**URL:** https://checkvibe.online/  
**Scanned:** February 20, 2026 at 09:14 AM UTC  
**Status:** completed  

**Changes since Feb 16, 2026:** 12 resolved · 14 new · 14 unchanged  

## Issues Found: 28 actionable — Critical (29 passing checks)

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 4 |
| 🟡 Medium | 11 |
| 🔵 Low | 13 |
| ℹ️ Info | 29 |

## Scanner Summary

| Scanner | Issues | Status |
|---------|--------|--------|
| API Key Detector | 0 | OK |
| GitHub Deep Scan | 0 | OK |
| GitHub Security Alerts | 0 | OK |
| Supabase Deep Lint | 0 | OK |
| Supabase Backend | 0 | OK |
| Firebase Backend | 0 | OK |
| Convex Backend | 0 | OK |
| Security Scanner | 7 | OK |
| Authentication Flow | 0 | OK |
| Dependency Vulnerabilities | 0 | OK |
| XSS Detection | 1 | OK |
| DNS & Email Security | 5 | OK |
| Vercel Hosting | 1 | OK |
| Netlify Hosting | 0 | OK |
| Cloudflare Pages | 0 | OK |
| Railway Hosting | 0 | OK |
| SSL/TLS Security | 2 | OK |
| SQL Injection | 0 | OK |
| CORS Misconfiguration | 0 | OK |
| CSRF Protection | 1 | OK |
| Cookie & Session Security | 0 | OK |
| Open Redirect | 0 | OK |
| OpenSSF Scorecard | 0 | OK |
| Threat Intelligence | 0 | OK |
| Tech Stack & CVEs | 0 | OK |
| Legal Compliance | 1 | OK |
| ai_llm | 0 | OK |
| Audit Logging & Monitoring | 3 | OK |
| DDoS Protection | 3 | OK |
| domain_hijacking | 3 | OK |
| File Upload Security | 0 | OK |
| graphql | 0 | OK |
| jwt_audit | 0 | OK |
| Mobile API Rate Limiting | 1 | OK |

## Detected Tech Stack

- **Vercel** (Hosting Platform)

---

## Detailed Scanner Results

### API Key Detector

**Issues:** 0 | **Info:** 0

No findings.

### GitHub Deep Scan

**Issues:** 0 | **Info:** 0

No findings.

### GitHub Security Alerts

**Issues:** 0 | **Info:** 0

No findings.

### Supabase Deep Lint

**Issues:** 0 | **Info:** 0

No findings.

### Supabase Backend

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No Supabase instance detected

### Firebase Backend

**Issues:** 0 | **Info:** 0

No findings.

### Convex Backend

**Issues:** 0 | **Info:** 0

No findings.

### Security Scanner

**Issues:** 7 | **Info:** 1

#### 🟡 Missing Content-Security-Policy header

**Severity:** medium  
**Description:** Prevents XSS and injection attacks. Note: many large sites use alternative mitigations like nonce-based scripts or Trusted Types instead of a strict CSP.  
**Recommendation:** Add the Content-Security-Policy header to your server response.  

#### 🟡 Missing X-Frame-Options header

**Severity:** medium  
**Description:** Prevents clickjacking attacks (superseded by CSP frame-ancestors)  
**Recommendation:** Add the X-Frame-Options header to your server response.  

#### 🟡 Missing X-Content-Type-Options header

**Severity:** medium  
**Description:** Prevents MIME-type sniffing  
**Recommendation:** Add the X-Content-Type-Options header to your server response.  

#### 🔵 Missing Referrer-Policy header

**Severity:** low  
**Description:** Controls referrer information  
**Recommendation:** Add the Referrer-Policy header to your server response.  

#### 🔵 Missing Permissions-Policy header

**Severity:** low  
**Description:** Controls browser feature access (relatively new header, adoption is still growing)  
**Recommendation:** Add the Permissions-Policy header to your server response.  

#### 🔵 Server header present

**Severity:** low  
**Description:** Server header reveals: Vercel. While no version is disclosed, this still identifies the server software.  
**Recommendation:** Consider removing the Server header entirely to minimize information disclosure.  

#### 🔵 No rate limiting headers detected

**Severity:** low  
**Description:** No rate limiting headers were found in the response. APIs and endpoints without rate limiting are vulnerable to brute-force and DDoS attacks.  
**Recommendation:** Implement rate limiting and expose standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).  

#### Passing Checks

- ✅ HTTP properly redirects to HTTPS

### Authentication Flow

**Issues:** 0 | **Info:** 1

#### Passing Checks

- ✅ No standard auth pages detected

### Dependency Vulnerabilities

**Issues:** 0 | **Info:** 0

No findings.

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

**Issues:** 1 | **Info:** 2

#### 🔵 2 security header(s) missing on Vercel deployment

**Severity:** low  
**Description:** The following security headers are missing: Missing X-Frame-Options or CSP frame-ancestors (clickjacking risk); Missing X-Content-Type-Options (MIME sniffing risk).  
**Recommendation:** Add security headers via vercel.json headers config or Next.js middleware. Vercel does not set these by default.  

```
Missing X-Frame-Options or CSP frame-ancestors (clickjacking risk)
Missing X-Content-Type-Options (MIME sniffing risk)
```

#### Passing Checks

- ✅ Vercel hosting detected
- ✅ No .env files publicly accessible

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

**Issues:** 0 | **Info:** 0

No findings.

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

**Issues:** 3 | **Info:** 1

#### 🟠 No rate limiting detected

**Severity:** high  
**Description:** After sending 5 rapid requests, no rate limiting was detected — no HTTP 429 response and no rate limit headers. Without rate limiting, the server is vulnerable to brute-force attacks, credential stuffing, and resource exhaustion.  
**Recommendation:** Implement rate limiting at the application or infrastructure level. Use standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) to communicate limits to clients. Consider using a reverse proxy (nginx, HAProxy) or WAF for automatic rate limiting.  

#### 🔵 HSTS configured but could be stronger

**Severity:** low  
**Description:** HSTS is set but missing: includeSubDomains preload. A weak HSTS policy leaves room for protocol downgrade attacks.  
**Recommendation:** Set Strict-Transport-Security: max-age=31536000; includeSubDomains; preload  

```
max-age=63072000
```

#### 🔵 No bot protection detected

**Severity:** low  
**Description:** No CAPTCHA, challenge page, or bot detection service was found in the page source. Without bot protection, automated attacks and scrapers can freely interact with the application.  
**Recommendation:** Consider adding bot protection (Cloudflare Turnstile, hCaptcha, reCAPTCHA) on sensitive forms (login, registration, contact). Use invisible challenges for minimal UX impact.  

#### Passing Checks

- ✅ WAF/CDN detected: Vercel Edge Network

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

**Issues:** 1 | **Info:** 0

#### 🟡 No rate limiting detected on any platform

**Severity:** medium  
**Description:** No rate limiting headers or 429 responses were detected for either desktop or mobile User-Agents. Without rate limiting, the API is vulnerable to brute-force attacks, credential stuffing, and DDoS from any client platform.  
**Recommendation:** Implement rate limiting at the application or reverse proxy level. Apply limits based on IP address and/or authentication token, not User-Agent.  

---

*Report generated by [CheckVibe](https://checkvibe.dev) on 2026-02-20T09:16:31.948Z*
