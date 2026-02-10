# Goal

Implement a major upgrade to the CheckVibe scanner suite — rebuilding the GitHub secrets scanner for deep git history scanning, adding a Supabase backend infrastructure scanner, adding 5 new security scanners (SSL/TLS, DNS/Email, XSS, Open Redirect, Dependency Vulnerabilities), and enhancing the tech scanner with live CVE lookups.

## Context

- **12 existing scanners** run as Supabase Deno Edge Functions (+ 1 local SEO), orchestrated by `dashboard/src/app/api/scan/route.ts`
- Shared security utilities: `supabase/functions/_shared/security.ts`
- Each scanner lives at: `supabase/functions/{name}-scanner/index.ts`
- Scan form UI: `dashboard/src/app/dashboard/scans/new/page.tsx`
- Scan results UI: `dashboard/src/app/dashboard/scans/[id]/page.tsx`
- Scanner weights & valid types defined in `route.ts` (lines 7, 366-379)
- GitHub scanner currently uses GitHub Search API (rate-limited, no history, limited patterns)
- Tech scanner has ~100 hardcoded CVEs that become stale
- No backend infrastructure scanning exists
- No SSL/TLS, DNS, XSS, or open redirect scanners exist

## Requirements

- All new scanners follow existing Edge Function pattern (Deno, `x-scanner-key` auth, CORS, SSRF protection via `_shared/security.ts`)
- Non-destructive scanning only — never send payloads that modify data
- Each scanner returns `{ scannerType, score, findings[], checksRun, scannedAt, url }`
- Findings use standard severity: `critical | high | medium | low | info`
- New scanners wired into `route.ts` orchestration with appropriate weights
- `VALID_SCAN_TYPES` array updated for all new types
- External API keys optional (graceful degradation if not set)
- Scan form UI gets new optional inputs: Supabase project URL field
- Secrets always redacted in findings output (first 4 chars + mask)
- Total timeout remains 45s per scanner
