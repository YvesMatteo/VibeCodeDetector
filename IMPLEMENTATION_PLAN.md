# Implementation Plan — Security Hardening

## Status
- [x] Planning
- [ ] In Progress
- [ ] Verification
- [ ] Complete

## Task List

### Phase 1: Critical Fixes
- [ ] Fix PATCH /api/keys/[id] — add privilege escalation checks from POST route
- [ ] Fix fetchFaviconUrl — add SSRF validation before fetching favicon href URLs

### Phase 2: CSRF & Cookie Security
- [ ] Create shared CSRF utility at dashboard/src/lib/csrf.ts
- [ ] Add CSRF checks to POST/PATCH/DELETE in keys routes
- [ ] Add CSRF checks to POST/PATCH/DELETE in projects routes
- [ ] Sign cv-access cookie with HMAC in supabase/middleware.ts

### Phase 3: Consolidation
- [ ] Create shared URL validation utility at dashboard/src/lib/url-validation.ts
- [ ] Refactor scan/route.ts to use shared SSRF utility
- [ ] Refactor projects/route.ts to use shared SSRF utility
- [ ] Refactor projects/[id]/route.ts to use shared SSRF utility

### Phase 4: Verification
- [ ] Build passes with all changes
- [ ] Test API key PATCH privilege escalation is blocked
- [ ] Test favicon SSRF protection
- [ ] Test CSRF protection on all routes

## Notes & Findings
- 2026-02-16: Security audit completed. 4 critical, 7 high severity issues found.
- 2026-02-16: Starting Phase 1 — critical fixes.
