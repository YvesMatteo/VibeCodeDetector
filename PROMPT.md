# Security Hardening Sprint

## Goal
Fix all critical and high-severity security vulnerabilities identified in the CheckVibe.dev audit.

## Requirements
- [ ] Fix PATCH /api/keys/[id] privilege escalation (scopes/domains/IPs can be escalated)
- [ ] Add SSRF protection to fetchFaviconUrl in scan route
- [ ] Add CSRF protection to all mutating API routes (keys, projects)
- [ ] Sign the cv-access waitlist cookie with HMAC
- [ ] Consolidate SSRF validation to shared utility (remove duplication)

## Constraints
- No new external libraries
- Must maintain backward compatibility with existing API key format
- Session auth behavior unchanged
- All changes in dashboard/ directory

## Success Criteria
- [ ] API keys cannot escalate their own privileges via PATCH
- [ ] Favicon fetch blocks private/internal URLs
- [ ] All mutating API endpoints validate CSRF for session auth
- [ ] Waitlist cookie cannot be forged
- [ ] SSRF patterns defined in exactly one place
