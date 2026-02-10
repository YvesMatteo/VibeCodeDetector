# Project Prompt — Rate Limiting & API Key Damage Reduction

## Goal
Implement rate limiting and API key scoping so that when someone obtains an API key they shouldn't have, the blast radius is minimized. This is a defense-in-depth strategy: even if a key leaks, the attacker can do limited damage.

## Context
- **Current state**: No user-facing API keys exist. Auth is Supabase session-based only.
- **Scan usage**: Already tracked atomically via `increment_scan_usage()` RPC (plan-based limits)
- **Edge functions**: Authenticated via shared `x-scanner-key` secret (single key for all scanners)
- **Dashboard API routes**: `/api/scan`, `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`

## Requirements

### API Key System
- [ ] Users can generate scoped API keys from the dashboard
- [ ] Keys are hashed (SHA-256) before storage — only the prefix is stored in cleartext for identification
- [ ] Keys can be revoked instantly
- [ ] Keys have configurable scopes (e.g., `scan:read`, `scan:write`) — principle of least privilege
- [ ] Keys are tied to the user's plan limits (inherit plan_scans_limit, plan_domains)
- [ ] Each key has an optional expiry date (default: 90 days)

### Rate Limiting (Per-Key & Per-User)
- [ ] Per-key rate limit: X requests per minute (sliding window)
- [ ] Per-user aggregate rate limit: Y requests per minute across all keys
- [ ] Per-IP rate limit for unauthenticated endpoints (login, signup abuse)
- [ ] Rate limit headers in responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] Exponential backoff / cooldown after repeated limit hits
- [ ] Rate limits scale by plan tier (Starter < Pro < Enterprise)

### Damage Reduction When Key Is Compromised
- [ ] Key scoping: leaked read-only key can't trigger scans
- [ ] Domain allowlist per key: key only works for pre-registered domains
- [ ] IP allowlist per key (optional): restrict key usage to specific IPs
- [ ] Anomaly detection: alert if key usage pattern changes dramatically (optional/future)
- [ ] Automatic key rotation reminders (90-day default)
- [ ] Usage audit log: every API call logged with key ID, endpoint, IP, timestamp
- [ ] Admin can see per-key usage in dashboard

## Constraints
- Must use existing Supabase infrastructure (no Redis — use Supabase/Postgres for rate limit state)
- No new external libraries without approval (prefer built-in Next.js + Supabase features)
- Must not break existing session-based auth flow — API keys are an additional auth method
- Rate limit storage in Postgres must be efficient (don't create a row per request — use sliding window counters)
- Edge functions continue using `x-scanner-key` internally — API keys are a dashboard/API gateway concern

## Success Criteria
- [ ] API keys can be created, listed, revoked from dashboard UI
- [ ] Leaked key with `scan:read` scope cannot trigger new scans
- [ ] Key restricted to `example.com` domain cannot scan `evil.com`
- [ ] Rate-limited key returns 429 with proper headers
- [ ] Usage audit log shows all API calls with key identification
- [ ] All existing session-based flows continue working unchanged
- [ ] Migration is backwards-compatible (no downtime)
