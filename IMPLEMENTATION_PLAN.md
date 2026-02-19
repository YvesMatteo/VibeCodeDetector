# Implementation Plan — Domain Hijacking Scanner (Scanner #31)

## Status
- [ ] Planning
- [ ] In Progress
- [ ] Verification
- [ ] Complete

---

## Phase 1: Edge Function

### [NEW] `supabase/functions/domain-hijacking-scanner/index.ts`

Core edge function (~500-700 lines). Follows exact same pattern as `dns-scanner/index.ts`.

**Boilerplate** (identical to all 30 existing scanners):
```
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

Deno.serve(async (req) => {
  // OPTIONS preflight → getCorsHeaders(req)
  // POST only, validateScannerAuth(req), validateTargetUrl(body.targetUrl)
  // Extract domain via new URL(url).hostname
  // Run 6 checks in parallel via Promise.allSettled
  // Calculate score: start 100, deduct per finding
  // Return ScannerResponse { scannerType: "domain_hijacking", score, findings, scannedAt, url }
});
```

**Helper: `dnsLookup(name: string, type: string)`** — Google DNS-over-HTTPS (`https://dns.google/resolve?name=...&type=...`), 8s timeout via AbortController.

**Helper: `extractDomain(hostname: string)`** — Extract registrable domain (handle two-part TLDs like `.co.uk`). Reuse pattern from dns-scanner.

**Helper: `rdapLookup(domain: string)`** — RDAP query:
1. Fetch IANA RDAP bootstrap: `https://data.iana.org/rdap/dns.json` (cacheable)
2. Find RDAP server for TLD
3. Query `{rdapServer}/domain/{domain}`
4. Parse response for: `events` (expiration, registration, last changed), `status` array (lock statuses), `entities` (registrar info)
5. 10s timeout

---

### Check 1: `checkRegistration(domain)` → Finding[]
**Purpose**: Domain expiration & registrar lock status via RDAP

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| Expires ≤ 30 days | critical | 25 | `hijack-expiry-critical` |
| Expires ≤ 90 days | high | 15 | `hijack-expiry-warning` |
| Expires ≤ 180 days | medium | 5 | `hijack-expiry-soon` |
| Expires > 180 days | info | 0 | `hijack-expiry-ok` |
| Missing `clientTransferProhibited` | high | 15 | `hijack-no-transfer-lock` |
| Missing `clientDeleteProhibited` | medium | 5 | `hijack-no-delete-lock` |
| Both locks present | info | 0 | `hijack-locks-ok` |
| RDAP lookup failed | low | 0 | `hijack-rdap-failed` |

**Evidence**: Expiry date, registrar name, lock statuses found.

---

### Check 2: `checkNameserverIntegrity(domain)` → Finding[]
**Purpose**: Detect dangling NS records and lame delegations

1. Query NS records for domain via Google DNS
2. For each NS hostname:
   a. Resolve NS to IP (A record lookup)
   b. If NXDOMAIN → **dangling NS** (critical, 20 deduction)
   c. If resolves: query the NS for `SOA` of the domain (via `dns.google` with `@ns_ip` not possible, so query Google DNS for SOA and verify the NS is in the SOA answer authority section — alternatively, just check the NS resolves to an IP)
3. Lame delegation: If NS resolves but domain has no SOA record from that NS → flag as lame

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| NS doesn't resolve (NXDOMAIN) | critical | 20 | `hijack-dangling-ns` |
| Lame delegation detected | high | 10 | `hijack-lame-delegation` |
| All NS healthy | info | 0 | `hijack-ns-healthy` |

---

### Check 3: `checkNameserverDiversity(domain)` → Finding[]
**Purpose**: Single-provider risk assessment

1. Get NS records
2. Extract provider from NS hostnames (e.g., `ns1.cloudflare.com` → `cloudflare.com`)
3. Check: only 1 unique NS → critical, all same provider → medium, diverse → info

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| Only 1 NS record | critical | 15 | `hijack-single-ns` |
| All NS same provider | medium | 5 | `hijack-ns-single-provider` |
| Diverse NS providers | info | 0 | `hijack-ns-diverse` |

---

### Check 4: `checkTyposquatting(domain)` → Finding[]
**Purpose**: Detect registered typosquat domains

Generate up to 15 mutations:
- **Character omission** (drop each char): `example.com` → `examle.com`, `exmple.com`
- **Character swap** (adjacent): `example.com` → `exapmle.com`
- **Homoglyphs**: `l→1`, `o→0`, `i→1`, `a→@`, `e→3` — only for domain part, not TLD
- **TLD swap**: `.com→.co`, `.com→.net`, `.com→.org`, `.com→.io`
- **Double char**: `example.com` → `exxample.com`

For each mutation: attempt A record lookup via Google DNS. If resolves → registered → flag.

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| ≥5 typosquats registered | high | 10 | `hijack-typosquat-many` |
| 1-4 typosquats registered | medium | 5 | `hijack-typosquat-some` |
| No typosquats found | info | 0 | `hijack-typosquat-clean` |

**Evidence**: List of registered typosquat domains (max 10 shown).

---

### Check 5: `checkZoneTransfer(domain)` → Finding[]
**Purpose**: Check if AXFR is exposed

> **Note**: Deno Edge Functions can't do raw TCP (AXFR requires TCP). Instead, we'll use a heuristic: attempt a DNS ANY query and check for unusually large responses, plus check if the zone has AXFR-prevention indicators. Since true AXFR testing isn't possible from Deno, this check will:
1. Query ANY record type via Google DNS
2. If many records returned (>20), flag as potentially over-exposed zone info
3. Check for `_dmarc`, `_domainkey` TXT records that indicate zone enumeration surface

**Simplified approach** (since Deno can't do raw TCP AXFR):

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| Zone info over-exposed (>20 records visible) | medium | 5 | `hijack-zone-exposed` |
| Normal zone exposure | info | 0 | `hijack-zone-ok` |

---

### Check 6: `checkNsSecurity(domain)` → Finding[]
**Purpose**: NS-level RFC compliance and security checks

1. Check if any NS record points to a CNAME (RFC 2181 violation — NS must point to A/AAAA)
2. Check for in-bailiwick NS (e.g., `ns1.example.com` for `example.com`) — requires glue records, higher hijack risk if parent zone compromised
3. Check if NS hostnames use the same domain as the target (circular dependency)

| Condition | Severity | Deduction | Finding ID |
|-----------|----------|-----------|------------|
| NS points to CNAME | high | 10 | `hijack-ns-cname` |
| All NS in-bailiwick (no external NS) | medium | 5 | `hijack-ns-all-inbailiwick` |
| NS circular dependency | medium | 5 | `hijack-ns-circular` |
| NS config healthy | info | 0 | `hijack-ns-security-ok` |

---

## Phase 2: Wire into Scan Route

### [MODIFY] `dashboard/src/app/api/scan/route.ts`

1. **Add scanner invocation** (~line 570, after scanner #30):
```typescript
// 31. Domain Hijacking Scanner (always runs)
scannerPromises.push(trackedScanner('domain_hijacking', () =>
    fetchWithTimeout(`${supabaseUrl}/functions/v1/domain-hijacking-scanner`, {
        method: 'POST', headers: scannerHeaders, body: JSON.stringify({ targetUrl }),
    }).then(res => res.json()).then(data => { results.domain_hijacking = data; })
      .catch(err => { results.domain_hijacking = { error: err.message, score: 0 }; })
));
```

2. **Add weight** (~line 659, in SCANNER_WEIGHTS):
```typescript
domain_hijacking: 0.03,  // Domain hijacking & registration
```

---

## Phase 3: Frontend Integration

### [MODIFY] `dashboard/src/lib/audit-data.ts`

1. Add `'domain_hijacking'` to `CURRENT_SCANNER_KEYS` array (line 8-16)
2. Add display name: `domain_hijacking: 'Domain Hijacking'` to `SCANNER_DISPLAY_NAMES` (line 18-28)
3. NOT conditional — don't add to `CONDITIONAL_SCANNER_KEYS`

### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

1. **Add icon** (~line 108): `domain_hijacking: Anchor,` (import `Anchor` from lucide-react — represents domain/DNS anchor)
2. **Add display name** (~line 141): `domain_hijacking: 'Domain Hijacking Detection',`
3. **Add to sort order** (~line 722, after `dns_email`): `'domain_hijacking',`

---

## Phase 4: Deploy & Verify

### Deploy Edge Function
```bash
supabase functions deploy domain-hijacking-scanner --no-verify-jwt --project-ref vlffoepzknlbyxhkmwmn
```

### Verify
1. `curl` the edge function directly with a test domain
2. Run a full scan from the dashboard against `checkvibe.dev`
3. Confirm `domain_hijacking` appears in scan results with findings
4. Confirm scanner accordion shows the new scanner with correct icon/name
5. Confirm overall score calculation includes the new weight

---

## Scoring Summary

| Check | Max Deduction |
|-------|---------------|
| Registration (expiry + locks) | 45 |
| Nameserver Integrity | 20 per dangling NS |
| Nameserver Diversity | 15 |
| Typosquatting | 10 |
| Zone Exposure | 5 |
| NS Security | 10 |

Score clamped to [0, 100]. Typical healthy domain: 85-100. Domain about to expire with no locks: 40-60.

---

## Files Changed (Summary)

| File | Action |
|------|--------|
| `supabase/functions/domain-hijacking-scanner/index.ts` | NEW |
| `dashboard/src/app/api/scan/route.ts` | MODIFY (add invocation + weight) |
| `dashboard/src/lib/audit-data.ts` | MODIFY (add key + display name) |
| `dashboard/src/components/dashboard/scanner-accordion.tsx` | MODIFY (add icon + name + order) |
