# Implementation Plan — CheckVibe Full Audit (February 20, 2026)

## Status
- [x] Planning
- [x] In Progress
- [x] Verification
- [ ] Complete

---

## CRITICAL FIXES

### Phase 1: Fix Scanner Weight Calculation [C1]

#### [MODIFY] `dashboard/src/app/api/scan/route.ts`

The `SCANNER_WEIGHTS` object (line ~704-739) sums to **1.25** instead of **1.0**. This deflates all overall scores by ~20%.

**Root cause**: New scanners (`graphql: 0.05`, `jwt_audit: 0.05`, `ai_llm: 0.04`, `ddos_protection: 0.04`, `file_upload: 0.03`, `audit_logging: 0.01`, `mobile_api: 0.03`, `domain_hijacking: 0.03`) were added without reducing existing weights. Total added: +0.28 on top of original ~0.97.

**Fix**: Rebalance all 34 scanner weights to sum to exactly 1.0. Proposed rebalancing:

```typescript
const SCANNER_WEIGHTS: Record<string, number> = {
    // Core security (high impact) — 0.38 total
    security: 0.06,          // was 0.08
    sqli: 0.06,              // was 0.07
    xss: 0.06,               // was 0.07
    ssl_tls: 0.05,           // was 0.06
    api_keys: 0.05,          // was 0.06
    graphql: 0.04,           // was 0.05
    jwt_audit: 0.04,         // was 0.05
    ai_llm: 0.03,            // was 0.04
    csrf: 0.03,              // same

    // Auth & session — 0.10 total
    cors: 0.03,              // was 0.04
    cookies: 0.03,           // was 0.04
    auth: 0.04,              // same

    // Backend providers — 0.10 total
    supabase_backend: 0.03,  // was 0.04
    firebase_backend: 0.03,  // was 0.04
    convex_backend: 0.02,    // was 0.04
    supabase_mgmt: 0.02,     // was 0.04

    // Infrastructure — 0.15 total
    ddos_protection: 0.03,   // was 0.04
    file_upload: 0.02,       // was 0.03
    open_redirect: 0.02,     // was 0.03
    dns_email: 0.02,         // was 0.03
    domain_hijacking: 0.02,  // was 0.03
    mobile_api: 0.02,        // was 0.03
    audit_logging: 0.01,     // same
    threat_intelligence: 0.01, // was 0.03

    // GitHub/repo-based — 0.08 total
    github_secrets: 0.02,    // was 0.03
    github_security: 0.02,   // was 0.03
    dependencies: 0.02,      // was 0.03
    scorecard: 0.02,         // same

    // Hosting (auto-detect, low impact) — 0.08 total
    vercel_hosting: 0.02,    // same
    netlify_hosting: 0.02,   // same
    cloudflare_hosting: 0.02, // same
    railway_hosting: 0.02,   // same

    // Non-scoring
    tech_stack: 0.02,        // was 0.03
    legal: 0.00,             // same — informational only
};
// Total: 1.00
```

**Verification**: Add a comment with the sum, or add a runtime assertion.

---

### Phase 2: Register Missing Scanners [C2, C3, C4]

#### [MODIFY] `dashboard/src/lib/audit-data.ts`

1. Add to `CURRENT_SCANNER_KEYS` array (line 8-17):
   - `'graphql'`
   - `'jwt_audit'`
   - `'ai_llm'`

2. Add to `SCANNER_DISPLAY_NAMES` map (line 19-30):
   - `graphql: 'GraphQL'`
   - `jwt_audit: 'JWT Audit'`
   - `ai_llm: 'AI/LLM Security'`

#### [MODIFY] `dashboard/src/app/api/scan/route.ts`

Add to `VALID_SCAN_TYPES` array (line 12):
- `'graphql'`
- `'jwt_audit'`
- `'ai_llm'`
- `'domain_hijacking'`

#### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

1. Add to `scannerIcons` (line ~78-110):
   - `graphql: Globe,` (or `Code`)
   - `jwt_audit: Lock,` (or `Key`)
   - `ai_llm: Cpu,` (or `Sparkles`)

2. Add to `scannerNames` (line ~112-144):
   - `graphql: 'GraphQL Security',`
   - `jwt_audit: 'JWT Deep Audit',`
   - `ai_llm: 'AI/LLM Security',`

#### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

Add to `SCANNER_NAMES` (line ~58-68):
- `graphql: 'GraphQL',`
- `jwt_audit: 'JWT Audit',`
- `ai_llm: 'AI/LLM',`
- `domain_hijacking: 'Domain Hijacking',`

#### [MODIFY] `dashboard/src/lib/export-markdown.ts`

Ensure the export function uses `SCANNER_DISPLAY_NAMES` from `audit-data.ts` instead of a hardcoded map, so new scanners automatically get proper names in exported reports.

---

### Phase 3: Add CSP Report Endpoint [C5]

#### [NEW] `dashboard/src/app/api/security/csp-report/route.ts`

Create a minimal endpoint that accepts CSP violation reports:

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const report = await req.json();
        // Log CSP violations for monitoring (non-blocking)
        console.warn('CSP Violation:', JSON.stringify(report));
        return new NextResponse(null, { status: 204 });
    } catch {
        return new NextResponse(null, { status: 400 });
    }
}
```

Also create `dashboard/src/app/api/security/report/route.ts` for the `Report-To` header endpoint (same structure).

---

## HIGH PRIORITY FIXES

### Phase 4: Fix Stats & Copy Inconsistencies [H1, H2, H3, L3]

#### [MODIFY] `dashboard/src/app/page.tsx`

Update `stats` array (line ~68-73):
- Change `'30'` → `'34'` for "Security Scanners"

#### [MODIFY] `dashboard/src/app/login/page.tsx`

Update subtitle (line ~80):
- Change `"26 automated scanners"` → `"34 automated scanners"`

#### [MODIFY] `dashboard/src/app/dashboard/changelog/page.tsx`

- Add a new v0.8.0 entry for the 4 new scanners (GraphQL, JWT Audit, AI/LLM, Domain Hijacking)
- Or update v0.6.0 text from "30" to reflect the actual count

#### [MODIFY] `dashboard/src/app/dashboard/credits/page.tsx`

Update comparison features (line ~64):
- Change `'Full scan suite (30 scanners)'` → `'Full scan suite (34 scanners)'`

---

### Phase 5: Fix Scanner Body Payloads [H5, H6]

#### [MODIFY] `dashboard/src/app/api/scan/route.ts`

For scanners `audit_logging` (line ~625-630), `mobile_api` (line ~633-638), and `domain_hijacking` (line ~641-646):

Change from:
```typescript
body: JSON.stringify({ targetUrl }),
```

To:
```typescript
body: buildScannerBody(),
```

This ensures they receive `renderedHtml`, `interceptedApiCalls`, and `interceptedCookies` like all other scanners.

---

## MEDIUM PRIORITY

### Phase 6: Consolidate Duplicate Code [L1, L2, L4]

#### [MODIFY] `dashboard/src/lib/audit-data.ts`

Export `SCANNER_DISPLAY_NAMES` so it can be imported by other files:
```typescript
export const SCANNER_DISPLAY_NAMES: Record<string, string> = { ... };
```

#### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

Replace local `SCANNER_NAMES` with import from `audit-data.ts`:
```typescript
import { SCANNER_DISPLAY_NAMES } from '@/lib/audit-data';
// Remove local SCANNER_NAMES, use SCANNER_DISPLAY_NAMES instead
```

#### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

Consider importing display names from `audit-data.ts` and only keep scanner-accordion-specific longer names in a local extension map.

---

### Phase 7: UX Improvements [M1, M4, M8]

#### Account deletion [M1]

Consider adding a self-service account deletion flow in `settings-tabs.tsx`:
- Confirmation dialog with "type DELETE to confirm"
- Calls Supabase admin API to delete user data
- Redirects to landing page

#### Scan search [M4]

Add a search/filter bar to `dashboard/scans/page.tsx`:
- Filter by URL
- Filter by status (completed, failed, running)
- Filter by date range

#### Scans in sidebar [M8]

Add "Scans" to the sidebar nav in `sidebar.tsx` if keeping the legacy scans page, or redirect to project-based scan history.

---

## VERIFICATION

### Build Check
```bash
cd dashboard && npm run build
```

### Weight Sum Verification
```bash
node -e "
const w = { /* paste final weights */ };
const sum = Object.values(w).reduce((a, b) => a + b, 0);
console.assert(Math.abs(sum - 1.0) < 0.001, 'Weights must sum to 1.0, got: ' + sum);
console.log('Weight sum:', sum.toFixed(4), '✓');
"
```

### Scanner Registration Check
Verify all scanner keys appear in:
1. `CURRENT_SCANNER_KEYS` in `audit-data.ts`
2. `VALID_SCAN_TYPES` in `scan/route.ts`
3. `scannerIcons` in `scanner-accordion.tsx`
4. `scannerNames` in `scanner-accordion.tsx`
5. `SCANNER_DISPLAY_NAMES` in `audit-data.ts`

### Live Scan Test
Run a scan and verify:
1. All 34 scanners appear with proper names
2. Overall score is not deflated
3. Export shows human-readable names
4. No raw keys visible in UI

---

## FILES CHANGED (Summary)

| File | Action | Issues Fixed |
|------|--------|--------------|
| `dashboard/src/app/api/scan/route.ts` | MODIFY | C1, C3, H5, H6 |
| `dashboard/src/lib/audit-data.ts` | MODIFY | C2, C4, L1 |
| `dashboard/src/components/dashboard/scanner-accordion.tsx` | MODIFY | C4 |
| `dashboard/src/components/dashboard/audit-report.tsx` | MODIFY | C4, H4, L1 |
| `dashboard/src/lib/export-markdown.ts` | MODIFY | M5, M6 |
| `dashboard/src/app/api/security/csp-report/route.ts` | NEW | C5 |
| `dashboard/src/app/api/security/report/route.ts` | NEW | C5 |
| `dashboard/src/app/page.tsx` | MODIFY | H1 |
| `dashboard/src/app/login/page.tsx` | MODIFY | H3 |
| `dashboard/src/app/dashboard/changelog/page.tsx` | MODIFY | H2 |
| `dashboard/src/app/dashboard/credits/page.tsx` | MODIFY | L3 |

---

## PREVIOUS AUDIT ITEMS STATUS

### Fixed since Feb 9 audit:
- ✅ `ignoreBuildErrors: true` removed from next.config.ts
- ✅ `invoice.payment_failed` webhook handler added
- ✅ `@ts-ignore` usages removed
- ✅ Security headers properly configured (HSTS, X-Frame-Options, CSP, etc.)
- ✅ `customer.subscription.updated` handles non-active states (past_due, paused, etc.)

### Still outstanding:
- ⚠️ CSP `unsafe-eval` / `unsafe-inline` still present (required by Framer Motion)
- ⚠️ No rate limiting on edge functions (per-IP throttling)
- ⚠️ No test coverage (zero test files beyond a few lib unit tests)
- ⚠️ No email verification required after signup
- ⚠️ Account deletion still manual (email to support)

---

## Notes & Findings
- [2026-02-20]: Full audit started. 5 critical, 6 high, 8 medium, 6 low issues identified.
- Scanner weight miscalculation is the highest-impact bug — affects every single scan score.
- The 3 "phantom scanners" (graphql, jwt_audit, ai_llm) run and produce results but are invisible in the UI registry.
