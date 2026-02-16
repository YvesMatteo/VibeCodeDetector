# Implementation Plan — Security Hardening

## Status
- [x] Planning
- [x] In Progress
- [x] Verification
- [x] Complete

## Task List

### Phase 1: Critical Fixes
- [x] Fix PATCH /api/keys/[id] — add privilege escalation checks from POST route
- [x] Fix fetchFaviconUrl — add SSRF validation before fetching favicon href URLs

### Phase 2: CSRF & Cookie Security
- [x] Create shared CSRF utility at dashboard/src/lib/csrf.ts
- [x] Add CSRF checks to POST/PATCH/DELETE in keys routes
- [x] Add CSRF checks to POST/PATCH/DELETE in projects routes
- [x] Sign cv-access cookie with HMAC in supabase/middleware.ts

### Phase 3: Consolidation
- [x] Create shared URL validation utility at dashboard/src/lib/url-validation.ts
- [x] Refactor scan/route.ts to use shared SSRF utility
- [x] Refactor projects/route.ts to use shared SSRF utility
- [x] Refactor projects/[id]/route.ts to use shared SSRF utility

### Phase 4: Verification
- [x] Build passes with all changes

## Notes & Findings
- 2026-02-16: Security audit completed. 4 critical, 7 high severity issues found.
- 2026-02-16: Starting Phase 1 — critical fixes.
