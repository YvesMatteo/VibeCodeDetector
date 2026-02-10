# Implementation Plan — Rate Limiting & API Key Damage Reduction

## Status
- [x] Planning
- [x] In Progress
- [ ] Verification
- [ ] Complete

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Client Request                     │
│              (Session Cookie OR API Key)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Route Layer                  │
│                                                       │
│  1. Auth Resolution (session OR api_key header)       │
│  2. Rate Limit Check (per-key + per-user + per-IP)    │
│  3. Scope Validation (does key have required scope?)  │
│  4. Domain Allowlist Check (key domain restriction)   │
│  5. Forward to handler                                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Existing Business Logic                  │
│  - increment_scan_usage() (plan limits)               │
│  - register_scan_domain() (domain limits)             │
│  - Edge Function calls (scanner-key auth)             │
└─────────────────────────────────────────────────────┘
```

### Rate Limit Strategy: Sliding Window Counter in Postgres

Use a `rate_limit_windows` table with 1-minute sliding window buckets:
- Composite key: `(identifier, window_start)`
- `identifier` = `key:{key_id}` or `user:{user_id}` or `ip:{ip_addr}`
- Atomic increment via `check_rate_limit()` RPC function
- Periodic cleanup of expired windows (cron or on-read)

### API Key Format
```
cvd_live_<32-random-hex>
```
- Prefix `cvd_live_` for identification and secret scanning tools
- Store SHA-256 hash in DB, store first 8 chars of hex as `key_prefix` for UI display
- User sees full key ONCE at creation time

---

## Task List

### Phase 1: Database Schema & Migrations ✅
- [x] Create `api_keys` table (id, user_id, key_hash, key_prefix, name, scopes, allowed_domains, allowed_ips, expires_at, revoked_at, last_used_at, created_at)
- [x] Create `api_key_usage_log` table (id, key_id, user_id, endpoint, method, ip_address, status_code, created_at)
- [x] Create `rate_limit_windows` table (identifier, window_start, request_count, PRIMARY KEY(identifier, window_start))
- [x] Create `check_rate_limit(p_identifier, p_max_requests, p_window_seconds)` RPC function
- [x] Create `cleanup_rate_limit_windows()` function + `cleanup_usage_logs()`
- [x] Create `validate_api_key()` RPC function
- [x] Add RLS policies: users can only see/manage their own API keys
- [x] Create indexes (key_hash unique, user_id, usage_log composite)

### Phase 2: API Key Management (Backend) ✅
- [x] Create `dashboard/src/lib/api-keys.ts` — key generation, hashing, validation utilities
- [x] Create `POST /api/keys` route — generate new API key (returns full key once)
- [x] Create `GET /api/keys` route — list user's keys (prefix, name, scopes, usage stats)
- [x] Create `DELETE /api/keys/[id]` route — revoke a key (soft delete via revoked_at)
- [x] Create `PATCH /api/keys/[id]` route — update key name, scopes, allowed_domains, allowed_ips

### Phase 3: Rate Limiting Middleware ✅
- [x] Create `dashboard/src/lib/rate-limit.ts` — rate limit check utility using `check_rate_limit()` RPC
- [x] Create `dashboard/src/lib/api-auth.ts` — unified auth resolver (session OR API key)
- [x] Add rate limit to `/api/scan` route (per-key: 10/min starter, 30/min pro, 100/min enterprise)
- [x] Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [x] Return 429 Too Many Requests with Retry-After header when limit exceeded

### Phase 4: Scope & Domain Enforcement ✅
- [x] Define scope constants: `scan:read`, `scan:write`, `keys:read`, `keys:manage`
- [x] Add scope check to `/api/scan` — require `scan:write` for POST
- [x] Add domain allowlist enforcement — if key has `allowed_domains`, reject scans for other domains
- [x] Add IP allowlist enforcement — if key has `allowed_ips`, reject requests from other IPs

### Phase 5: Usage Audit Logging ✅
- [x] Log every API key call to `api_key_usage_log` (non-blocking, fire-and-forget)
- [x] Update `api_keys.last_used_at` on each use (in `validate_api_key()` RPC)
- [x] Create `GET /api/keys/[id]/usage` route — return usage stats for a specific key

### Phase 6: Dashboard UI ✅
- [x] Create API Keys management page (`/dashboard/api-keys`)
- [x] Key creation dialog (name, scopes checkboxes, domain allowlist, expiry)
- [x] Show-once modal for newly created key (copy to clipboard)
- [x] Key list with: name, prefix, scopes, last used, created, status (active/expired/revoked)
- [x] Revoke button with confirmation dialog
- [x] Added "API Keys" to sidebar navigation

### Phase 7: Verification & Hardening
- [x] TypeScript compiles with zero new errors
- [ ] Deploy migration to Supabase
- [ ] Test: creating key returns full key, subsequent list shows only prefix
- [ ] Test: revoked key returns 401
- [ ] Test: expired key returns 401
- [ ] Test: key with `scan:read` scope cannot POST to `/api/scan`
- [ ] Test: key with `allowed_domains: ["example.com"]` cannot scan `evil.com`
- [ ] Test: rate limit returns 429 with correct headers after exceeding limit
- [ ] Test: existing session-based auth still works unchanged

## Rate Limits by Plan Tier

| Tier       | Per-Key (req/min) | Per-User Aggregate (req/min) | Monthly Scans | Domains |
|------------|-------------------|------------------------------|---------------|---------|
| Starter    | 10                | 20                           | 5             | 1       |
| Pro        | 30                | 60                           | 20            | 3       |
| Enterprise | 100               | 200                          | 75            | 10      |

## Scopes

| Scope         | Description                        |
|---------------|-------------------------------------|
| `scan:read`   | Read scan results and history       |
| `scan:write`  | Trigger new scans                   |
| `keys:read`   | List API keys (own keys only)       |
| `keys:manage` | Create, update, revoke API keys     |

## Notes & Findings
- 2026-02-09: Initialized project. No user-facing API keys exist yet. System uses Supabase session auth + shared scanner key.
- 2026-02-09: Chose Postgres sliding window over Redis — keeps infrastructure simple (Supabase-only).
- 2026-02-09: Key format `cvd_live_<hex>` chosen for easy identification by secret scanners (GitHub, GitGuardian, etc).
- 2026-02-09: Rate limit windows use composite PK `(identifier, window_start)` — efficient for both writes and cleanup.
