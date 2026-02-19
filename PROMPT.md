# Goal

Build a **Domain Hijacking Scanner** — the 31st scanner in the CheckVibe security audit suite. This edge function detects domain-level takeover risks including expiring registrations, missing registrar locks, dangling nameservers, lame delegations, typosquatting, and zone transfer exposure.

## Context

- **Existing suite**: 30 Deno Edge Function scanners in `supabase/functions/`
- **Related scanner**: `dns-scanner` already covers email security (SPF/DMARC/DKIM), CAA, DNSSEC, and subdomain takeover via CT logs + dangling CNAMEs. The new scanner focuses on **domain-level** hijacking, not subdomains.
- **Shared utilities**: `_shared/types.ts` (Finding, ScannerResponse), `_shared/security.ts` (validateTargetUrl, validateScannerAuth, getCorsHeaders)
- **Scan route**: `dashboard/src/app/api/scan/route.ts` — wires all scanners with 45s timeout, weighted scoring, NDJSON streaming
- **Frontend config**: `dashboard/src/lib/audit-data.ts` (CURRENT_SCANNER_KEYS), `dashboard/src/components/dashboard/scanner-accordion.tsx` (icons, names, order)

## Requirements

- **Scanner key**: `domain_hijacking`
- **Edge function name**: `domain-hijacking-scanner`
- **Weight**: `0.03` (same tier as `dns_email`)
- **Always runs** (not conditional on any project config)
- **No external API keys required** — uses only RDAP (free, standardized) and Google DNS-over-HTTPS
- **6 checks** (all run in parallel via `Promise.allSettled`):
  1. **Domain Registration via RDAP** — expiration date, registrar lock statuses, recent registrar changes
  2. **Nameserver Integrity** — dangling NS records (NXDOMAIN), lame delegation (NS doesn't serve zone)
  3. **Nameserver Diversity** — single-provider risk, minimum 2 NS requirement
  4. **Typosquatting Detection** — top 15 mutations (omission, homoglyphs, TLD swap) checked via DNS
  5. **Zone Transfer Exposure** — attempt AXFR to check if zone data is publicly accessible
  6. **NS Security** — in-bailiwick glue record check, NS pointing to CNAME (RFC violation)
- **Must not duplicate** subdomain takeover checks already in `dns-scanner`
- **Timeouts**: 10s per RDAP lookup, 8s per DNS operation, 5s per zone transfer attempt
- **Scoring**: Start at 100, deduct per finding severity

## Constraints

- Deno runtime (Edge Function) — no Node.js APIs
- 45s max execution time (enforced by scan route)
- Must use shared auth/CORS/validation from `_shared/security.ts`
- Response must conform to `ScannerResponse` interface from `_shared/types.ts`
- No new env vars required (RDAP and Google DNS are free public APIs)
