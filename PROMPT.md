# Goal

Add 4 new security scanners to CheckVibe's scanner suite that check for:

1. **DDoS Protection Scanner** — Checks whether WAF, CDN, rate limiting, and DDoS mitigation are in place
2. **File Upload Security Scanner** — Checks if file upload forms enforce size limits, type validation, and content-type restrictions
3. **Audit Logging Scanner** — Checks if the application shows indicators of security monitoring, error logging, and audit readiness (for legal/forensic traceability)
4. **Mobile API Rate Limiting Scanner** — Checks if mobile-specific API endpoints have rate limiting (many founders forget mobile APIs while protecting web routes)

## Context

- **26 edge function scanners** already exist in `supabase/functions/`
- Each scanner follows the same Deno pattern: validate auth → validate URL → probe target → generate findings → return `{ scannerType, score, findings, scannedAt, url }`
- Shared utilities in `supabase/functions/_shared/security.ts` provide `validateTargetUrl`, `validateScannerAuth`, `getCorsHeaders`
- The scan route at `dashboard/src/app/api/scan/route.ts` orchestrates all scanners in parallel with 45s timeout
- Frontend displays results via `<ScannerAccordion>` component using `scannerIcons` and `scannerNames` maps
- Finding type: `{ id, severity, title, description, recommendation, evidence? }`
- The `VALID_SCAN_TYPES` array and `SCANNER_WEIGHTS` map must be updated for each new scanner

## Requirements

- Each scanner must be a standalone Deno edge function in its own directory under `supabase/functions/`
- Each scanner must use the shared `validateScannerAuth`, `validateTargetUrl`, and `getCorsHeaders` from `_shared/security.ts`
- Each scanner must return the standard `{ scannerType, score, findings, scannedAt, url }` format
- The scan route must wire each new scanner into the parallel execution and weight map
- The `ScannerAccordion` component must have icons and display names for each new scanner
- The `VALID_SCAN_TYPES` array must include the new scan type IDs
- All scanners must be "always-run" (no conditional gating on GitHub repo, backend type, etc.)
- Plain-english explanations should be added for key findings
- All scanners must be non-destructive — they only probe and inspect, never modify or upload anything
- If a scanner concept cannot produce meaningful, reliable results from external probing alone, skip it or limit its scope to what's reliably testable
