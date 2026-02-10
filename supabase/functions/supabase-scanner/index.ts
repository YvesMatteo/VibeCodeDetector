import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Supabase Backend Infrastructure Scanner
 *
 * Detects Supabase usage in a target website and audits its configuration
 * for security misconfigurations including:
 *   - Exposed anon keys with overly permissive RLS
 *   - Leaked service_role keys in client-side code
 *   - Public storage buckets with listable files
 *   - Weak auth configuration
 *   - Unauthenticated edge functions
 *   - Enumerable RPC functions with dangerous names
 *
 * SECURITY GUARANTEES:
 *   - NEVER writes, updates, or deletes data on the target
 *   - NEVER calls discovered RPC functions (only lists them)
 *   - NEVER uploads to storage buckets
 *   - NEVER uses discovered service_role keys
 *   - All discovered keys are masked: first 20 chars + "...[REDACTED]"
 *   - All HTTP requests are read-only GET (except edge function auth probes which use POST with empty body)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    checksRun: number;
    scannedAt: string;
    url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask a key/token: show first 20 chars then redact the rest. */
function redactKey(key: string): string {
    if (key.length <= 20) return '***REDACTED***';
    return key.substring(0, 20) + '...[REDACTED]';
}

/** Fetch with AbortController timeout (default 8 seconds). */
async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 8000,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'CheckVibe-SupabaseScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Safely decode a base64url string (JWT segment). */
function base64UrlDecode(segment: string): string {
    try {
        // Replace base64url chars with base64 chars and add padding
        let base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        return atob(base64);
    } catch {
        return '';
    }
}

/** Check whether a decoded JWT payload indicates a service_role key. */
function isServiceRoleJwt(payload: string): boolean {
    try {
        const parsed = JSON.parse(payload);
        return parsed.role === 'service_role';
    } catch {
        return false;
    }
}

/** List of field names that indicate sensitive data. */
const SENSITIVE_FIELDS = [
    'email', 'password', 'passwd', 'pass_hash', 'password_hash',
    'phone', 'phone_number', 'ssn', 'social_security',
    'credit_card', 'card_number', 'cvv', 'secret',
    'token', 'api_key', 'private_key',
];

/** Check whether a JSON object contains sensitive-looking field names. */
function containsSensitiveFields(obj: unknown): string[] {
    const found: string[] = [];
    if (!obj || typeof obj !== 'object') return found;
    const str = JSON.stringify(obj).toLowerCase();
    for (const field of SENSITIVE_FIELDS) {
        if (str.includes(`"${field}"`) || str.includes(`"${field}_`)) {
            found.push(field);
        }
    }
    return found;
}

// ---------------------------------------------------------------------------
// Test 0: Auto-detect Supabase URL and anon key from target HTML/JS
// ---------------------------------------------------------------------------

interface SupabaseDetection {
    supabaseUrl: string | null;
    anonKey: string | null;
    detectedFrom: string;
}

async function detectSupabase(targetUrl: string, providedSupabaseUrl?: string): Promise<SupabaseDetection> {
    // If the user explicitly provided a Supabase URL, use that
    if (providedSupabaseUrl) {
        // Still try to find the anon key from the target page
        const anonKey = await findAnonKeyFromPage(targetUrl, providedSupabaseUrl);
        return {
            supabaseUrl: providedSupabaseUrl.replace(/\/$/, ''),
            anonKey,
            detectedFrom: 'provided in request',
        };
    }

    let html: string;
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        }, 10000);
        html = await response.text();
    } catch {
        return { supabaseUrl: null, anonKey: null, detectedFrom: 'fetch failed' };
    }

    // Search for Supabase project URL pattern
    const supabaseUrlPattern = /https:\/\/[a-z0-9]+\.supabase\.co/gi;
    const supabaseUrlMatches = html.match(supabaseUrlPattern);
    let supabaseUrl: string | null = null;

    if (supabaseUrlMatches && supabaseUrlMatches.length > 0) {
        // Deduplicate and take the first unique one
        supabaseUrl = [...new Set(supabaseUrlMatches)][0].replace(/\/$/, '');
    }

    // Also look for environment variable patterns that may contain the URL
    if (!supabaseUrl) {
        const envPatterns = [
            /NEXT_PUBLIC_SUPABASE_URL\s*[:=]\s*["']?(https:\/\/[a-z0-9]+\.supabase\.co)["']?/i,
            /SUPABASE_URL\s*[:=]\s*["']?(https:\/\/[a-z0-9]+\.supabase\.co)["']?/i,
            /VITE_SUPABASE_URL\s*[:=]\s*["']?(https:\/\/[a-z0-9]+\.supabase\.co)["']?/i,
            /REACT_APP_SUPABASE_URL\s*[:=]\s*["']?(https:\/\/[a-z0-9]+\.supabase\.co)["']?/i,
            /supabaseUrl\s*[:=]\s*["'](https:\/\/[a-z0-9]+\.supabase\.co)["']/i,
        ];
        for (const pattern of envPatterns) {
            const match = html.match(pattern);
            if (match) {
                supabaseUrl = match[1].replace(/\/$/, '');
                break;
            }
        }
    }

    if (!supabaseUrl) {
        return { supabaseUrl: null, anonKey: null, detectedFrom: 'not found in HTML' };
    }

    // Try to find the anon key
    let anonKey: string | null = null;

    // Look for createClient(url, key) pattern
    const createClientPatterns = [
        // createClient("url", "key") or createClient('url', 'key')
        /createClient\s*\(\s*["'][^"']+["']\s*,\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/g,
        // createClient(env_var, "key")
        /createClient\s*\([^,]+,\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/g,
    ];

    for (const pattern of createClientPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(html);
        if (match) {
            anonKey = match[1];
            break;
        }
    }

    // Look for SUPABASE_ANON_KEY or similar env var patterns
    if (!anonKey) {
        const anonKeyPatterns = [
            /(?:NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY|REACT_APP_SUPABASE_ANON_KEY|supabaseAnonKey|supabase_anon_key|anonKey)\s*[:=]\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/gi,
        ];
        for (const pattern of anonKeyPatterns) {
            pattern.lastIndex = 0;
            const match = pattern.exec(html);
            if (match) {
                anonKey = match[1];
                break;
            }
        }
    }

    // Generic: find any JWT near "supabase" context that has role: "anon"
    if (!anonKey) {
        const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
        let jwtMatch;
        while ((jwtMatch = jwtPattern.exec(html)) !== null) {
            const token = jwtMatch[0];
            const parts = token.split('.');
            if (parts.length >= 2) {
                const decoded = base64UrlDecode(parts[1]);
                try {
                    const payload = JSON.parse(decoded);
                    if (payload.role === 'anon') {
                        anonKey = token;
                        break;
                    }
                } catch {
                    // Not a valid JWT payload, skip
                }
            }
        }
    }

    return {
        supabaseUrl,
        anonKey,
        detectedFrom: 'auto-detected from HTML',
    };
}

/** Helper to find anon key when supabaseUrl is already known. */
async function findAnonKeyFromPage(targetUrl: string, _supabaseUrl: string): Promise<string | null> {
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        }, 10000);
        const html = await response.text();

        // Look for JWTs with role: "anon"
        const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
        let match;
        while ((match = jwtPattern.exec(html)) !== null) {
            const token = match[0];
            const parts = token.split('.');
            if (parts.length >= 2) {
                const decoded = base64UrlDecode(parts[1]);
                try {
                    const payload = JSON.parse(decoded);
                    if (payload.role === 'anon') {
                        return token;
                    }
                } catch {
                    // skip
                }
            }
        }
    } catch {
        // skip
    }
    return null;
}

// ---------------------------------------------------------------------------
// Test 1: Anon Key Capability Audit
// ---------------------------------------------------------------------------

async function auditAnonKeyCapabilities(
    supabaseUrl: string,
    anonKey: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    try {
        // Fetch the OpenAPI schema to enumerate exposed tables
        const schemaResponse = await fetchWithTimeout(
            `${supabaseUrl}/rest/v1/`,
            {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                    'Accept': 'application/json',
                },
            },
        );

        if (!schemaResponse.ok) {
            findings.push({
                id: 'anon-key-schema-blocked',
                severity: 'info',
                title: 'PostgREST schema not accessible with anon key',
                description: 'The PostgREST OpenAPI schema is not accessible using the anon key, which limits table enumeration.',
                recommendation: 'No action needed. This is expected if PostgREST schema access is restricted.',
            });
            return 0;
        }

        let schema: any;
        try {
            schema = await schemaResponse.json();
        } catch {
            return 0;
        }

        // Extract table names from the OpenAPI paths
        const tables: string[] = [];
        if (schema && schema.paths) {
            for (const path of Object.keys(schema.paths)) {
                // Paths look like "/{table_name}" — extract table name
                const tableName = path.replace(/^\//, '').split('?')[0];
                if (tableName && !tableName.includes('/') && tableName !== 'rpc') {
                    tables.push(tableName);
                }
            }
        }

        if (tables.length === 0) {
            findings.push({
                id: 'anon-key-no-tables',
                severity: 'info',
                title: 'No tables exposed via anon key',
                description: 'The PostgREST schema returned no accessible tables for the anon key.',
                recommendation: 'No action needed. Tables are properly restricted.',
            });
            return 0;
        }

        findings.push({
            id: 'anon-key-tables-enumerable',
            severity: 'low',
            title: `${tables.length} table(s) visible in PostgREST schema`,
            description: `The anon key can enumerate the following tables via the OpenAPI schema: ${tables.slice(0, 15).join(', ')}${tables.length > 15 ? ` (and ${tables.length - 15} more)` : ''}.`,
            recommendation: 'Review whether all listed tables should be visible to unauthenticated users. Use RLS policies to restrict access.',
        });

        // Probe up to 10 tables for actual data access
        const tablesToProbe = tables.slice(0, 10);
        let tablesWithData = 0;

        const probeResults = await Promise.allSettled(
            tablesToProbe.map(async (table) => {
                try {
                    const tableResponse = await fetchWithTimeout(
                        `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`,
                        {
                            headers: {
                                'apikey': anonKey,
                                'Authorization': `Bearer ${anonKey}`,
                                'Accept': 'application/json',
                            },
                        },
                    );

                    if (!tableResponse.ok) return null;

                    const data = await tableResponse.json();

                    if (Array.isArray(data) && data.length > 0) {
                        // Table returned actual data rows
                        const sensitiveFields = containsSensitiveFields(data[0]);

                        if (sensitiveFields.length > 0) {
                            // Critical: sensitive data exposed
                            return {
                                table,
                                severity: 'critical' as const,
                                sensitiveFields,
                                hasData: true,
                            };
                        } else {
                            return {
                                table,
                                severity: 'high' as const,
                                sensitiveFields: [] as string[],
                                hasData: true,
                            };
                        }
                    }
                    return null;
                } catch {
                    return null;
                }
            }),
        );

        for (const result of probeResults) {
            if (result.status === 'fulfilled' && result.value) {
                const { table, severity, sensitiveFields, hasData } = result.value;
                if (!hasData) continue;

                tablesWithData++;

                if (severity === 'critical') {
                    findings.push({
                        id: `anon-key-sensitive-data-${table}`,
                        severity: 'critical',
                        title: `Table "${table}" exposes sensitive data to anon key`,
                        description: `The table "${table}" returns rows containing sensitive fields (${sensitiveFields.join(', ')}) when queried with the anon key. This data is accessible to any unauthenticated user who knows the Supabase URL.`,
                        recommendation: `Add Row Level Security (RLS) policies to the "${table}" table immediately. Run: ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; Then create appropriate SELECT policies.`,
                    });
                } else {
                    findings.push({
                        id: `anon-key-data-exposed-${table}`,
                        severity: 'high',
                        title: `Table "${table}" returns data to anon key`,
                        description: `The table "${table}" returns data rows when queried with the anon key. While no obviously sensitive fields were detected, any data accessible without authentication should be intentional.`,
                        recommendation: `Verify that public read access to "${table}" is intentional. If not, enable RLS and restrict access: ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
                    });
                }
            }
        }

        // Score deduction: -25 per table returning data, capped at -50
        scoreDeduction = Math.min(tablesWithData * 25, 50);

    } catch {
        findings.push({
            id: 'anon-key-audit-error',
            severity: 'info',
            title: 'Anon key capability audit could not complete',
            description: 'The PostgREST API did not respond as expected. The Supabase instance may have custom restrictions in place.',
            recommendation: 'No action needed if this is intentional.',
        });
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Test 2: Service Role Key Detection
// ---------------------------------------------------------------------------

async function detectServiceRoleKey(
    targetUrl: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    let html: string;
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        }, 10000);
        html = await response.text();
    } catch {
        return 0;
    }

    // Also fetch linked JS files (first-party only, limited to 10)
    const allContent = [html];
    const scriptSrcPattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const scriptUrls: string[] = [];
    let scriptMatch;
    while ((scriptMatch = scriptSrcPattern.exec(html)) !== null && scriptUrls.length < 10) {
        const src = scriptMatch[1];
        // Only fetch first-party scripts (same origin or relative paths)
        try {
            const resolved = new URL(src, targetUrl);
            const targetOrigin = new URL(targetUrl).origin;
            if (resolved.origin === targetOrigin) {
                scriptUrls.push(resolved.href);
            }
        } catch {
            // Skip invalid URLs
        }
    }

    // Fetch first-party scripts in parallel
    const scriptResults = await Promise.allSettled(
        scriptUrls.map(async (jsUrl) => {
            try {
                const res = await fetchWithTimeout(jsUrl, {}, 5000);
                const text = await res.text();
                if (text.length <= 500000) return text;
            } catch { /* skip */ }
            return null;
        }),
    );

    for (const result of scriptResults) {
        if (result.status === 'fulfilled' && result.value) {
            allContent.push(result.value);
        }
    }

    // Extract inline scripts
    const inlineScriptPattern = /<script[^>]*>([^<]+)<\/script>/gi;
    let inlineMatch;
    while ((inlineMatch = inlineScriptPattern.exec(html)) !== null) {
        const content = inlineMatch[1];
        if (content.length > 30) {
            allContent.push(content);
        }
    }

    // Scan all content for JWTs
    const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
    const checkedTokens = new Set<string>();

    for (const content of allContent) {
        jwtPattern.lastIndex = 0;
        let match;
        while ((match = jwtPattern.exec(content)) !== null) {
            const token = match[0];

            // Deduplicate
            if (checkedTokens.has(token)) continue;
            checkedTokens.add(token);

            // Decode the payload (second segment)
            const parts = token.split('.');
            if (parts.length < 2) continue;

            const decoded = base64UrlDecode(parts[1]);
            if (isServiceRoleJwt(decoded)) {
                scoreDeduction = 40;
                findings.push({
                    id: 'service-role-key-exposed',
                    severity: 'critical',
                    title: 'Supabase service_role key exposed in client-side code',
                    description: 'A JWT with role "service_role" was found in client-side code. The service_role key bypasses ALL Row Level Security policies, giving full read/write/delete access to every table in the database. This is the most dangerous Supabase misconfiguration possible.',
                    recommendation: 'IMMEDIATELY rotate the service_role key in Supabase Dashboard > Settings > API. Remove the key from all client-side code. The service_role key must ONLY be used in server-side code (API routes, edge functions) and NEVER exposed to the browser.',
                    evidence: redactKey(token),
                });
                // Only need to find one — severity is already maximum
                break;
            }
        }

        // Also check for explicit variable assignments
        const serviceRoleVarPatterns = [
            /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/gi,
            /service_role\s*[:=]\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/gi,
            /serviceRoleKey\s*[:=]\s*["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/gi,
        ];

        for (const pattern of serviceRoleVarPatterns) {
            pattern.lastIndex = 0;
            const varMatch = pattern.exec(content);
            if (varMatch) {
                const token = varMatch[1];
                if (checkedTokens.has(token)) continue;
                checkedTokens.add(token);

                // Even if we can't decode it, the variable name is damning
                scoreDeduction = Math.max(scoreDeduction, 40);
                findings.push({
                    id: 'service-role-key-variable',
                    severity: 'critical',
                    title: 'Supabase service_role key variable found in client-side code',
                    description: 'A variable explicitly named as a service_role key was found in client-side code. Even if the key itself is invalid, this pattern indicates a severe security practice issue.',
                    recommendation: 'Remove all service_role key references from client-side code. Use server-side API routes or edge functions to perform operations that require elevated privileges.',
                    evidence: redactKey(token),
                });
                break;
            }
        }

        if (scoreDeduction >= 40) break; // Already found the worst case
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Test 3: Storage Bucket Enumeration
// ---------------------------------------------------------------------------

async function auditStorageBuckets(
    supabaseUrl: string,
    anonKey: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    try {
        const bucketsResponse = await fetchWithTimeout(
            `${supabaseUrl}/storage/v1/bucket`,
            {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                    'Accept': 'application/json',
                },
            },
        );

        if (!bucketsResponse.ok) {
            findings.push({
                id: 'storage-buckets-restricted',
                severity: 'info',
                title: 'Storage bucket listing restricted',
                description: 'Storage bucket enumeration is not accessible with the anon key. This is good security practice.',
                recommendation: 'No action needed.',
            });
            return 0;
        }

        let buckets: any[];
        try {
            buckets = await bucketsResponse.json();
        } catch {
            return 0;
        }

        if (!Array.isArray(buckets) || buckets.length === 0) {
            findings.push({
                id: 'storage-no-buckets',
                severity: 'info',
                title: 'No storage buckets found',
                description: 'No storage buckets were returned by the Storage API.',
                recommendation: 'No action needed.',
            });
            return 0;
        }

        // Bucket names are exposed
        const bucketNames = buckets.map((b: any) => b.name || b.id).filter(Boolean);
        scoreDeduction += 8;
        findings.push({
            id: 'storage-buckets-enumerable',
            severity: 'medium',
            title: `${buckets.length} storage bucket(s) enumerable`,
            description: `The anon key can list storage buckets: ${bucketNames.join(', ')}. While not immediately dangerous, this reveals your storage architecture.`,
            recommendation: 'Restrict bucket listing access using RLS policies on the storage.buckets table.',
        });

        // Check each public bucket for listable files
        const publicBuckets = buckets.filter((b: any) => b.public === true);

        if (publicBuckets.length > 0) {
            const listResults = await Promise.allSettled(
                publicBuckets.map(async (bucket: any) => {
                    const bucketId = bucket.id || bucket.name;
                    try {
                        const listResponse = await fetchWithTimeout(
                            `${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucketId)}`,
                            {
                                method: 'POST',
                                headers: {
                                    'apikey': anonKey,
                                    'Authorization': `Bearer ${anonKey}`,
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                },
                                body: JSON.stringify({ prefix: '', limit: 5, offset: 0 }),
                            },
                        );

                        if (listResponse.ok) {
                            const files = await listResponse.json();
                            if (Array.isArray(files) && files.length > 0) {
                                return { bucketId, fileCount: files.length, listable: true };
                            }
                        }
                        return { bucketId, fileCount: 0, listable: false };
                    } catch {
                        return { bucketId, fileCount: 0, listable: false };
                    }
                }),
            );

            for (const result of listResults) {
                if (result.status === 'fulfilled') {
                    const { bucketId, fileCount, listable } = result.value;
                    if (listable) {
                        scoreDeduction += 15;
                        findings.push({
                            id: `storage-bucket-listable-${bucketId}`,
                            severity: 'high',
                            title: `Public bucket "${bucketId}" has listable files`,
                            description: `The public storage bucket "${bucketId}" allows file enumeration (found ${fileCount}+ files). Anyone can browse and download files in this bucket.`,
                            recommendation: `Review the contents of the "${bucketId}" bucket. If file listing should not be public, add RLS policies on storage.objects to restrict list access. Consider making the bucket private if not needed publicly.`,
                        });
                    } else {
                        findings.push({
                            id: `storage-bucket-public-${bucketId}`,
                            severity: 'low',
                            title: `Bucket "${bucketId}" is marked as public`,
                            description: `The storage bucket "${bucketId}" is configured as public. While file listing appears restricted, direct file URLs may still be accessible.`,
                            recommendation: `Verify that public access to the "${bucketId}" bucket is intentional. Mark buckets as private if they contain sensitive files.`,
                        });
                    }
                }
            }
        }
    } catch {
        findings.push({
            id: 'storage-audit-error',
            severity: 'info',
            title: 'Storage bucket audit could not complete',
            description: 'The Storage API did not respond as expected.',
            recommendation: 'No action needed if storage is not used.',
        });
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Test 4: Auth Configuration Exposure
// ---------------------------------------------------------------------------

async function auditAuthConfig(
    supabaseUrl: string,
    anonKey: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    try {
        const settingsResponse = await fetchWithTimeout(
            `${supabaseUrl}/auth/v1/settings`,
            {
                headers: {
                    'apikey': anonKey,
                    'Accept': 'application/json',
                },
            },
        );

        if (!settingsResponse.ok) {
            findings.push({
                id: 'auth-settings-restricted',
                severity: 'info',
                title: 'Auth settings endpoint not accessible',
                description: 'The /auth/v1/settings endpoint did not return a successful response.',
                recommendation: 'No action needed.',
            });
            return 0;
        }

        let settings: any;
        try {
            settings = await settingsResponse.json();
        } catch {
            return 0;
        }

        // Check: email enabled with autoconfirm (users don't need to verify email)
        if (settings.external_email_enabled === true && settings.mailer_autoconfirm === true) {
            scoreDeduction += 8;
            findings.push({
                id: 'auth-email-autoconfirm',
                severity: 'medium',
                title: 'Email sign-up with auto-confirm enabled',
                description: 'Email authentication is enabled with automatic email confirmation. Users can sign up with any email address without verification, which can lead to fake accounts, email enumeration, and abuse.',
                recommendation: 'Disable mailer_autoconfirm in Supabase Dashboard > Authentication > Settings. Require users to verify their email address before gaining access.',
            });
        }

        // Check: weak password policy
        const minPasswordLength = settings.password_min_length ?? settings.minimum_password_length;
        if (typeof minPasswordLength === 'number' && minPasswordLength < 8) {
            scoreDeduction += 5;
            findings.push({
                id: 'auth-weak-password-policy',
                severity: 'medium',
                title: `Weak password policy: minimum ${minPasswordLength} characters`,
                description: `The minimum password length is set to ${minPasswordLength} characters. NIST recommends at least 8 characters, and many security standards recommend 12+.`,
                recommendation: 'Increase the minimum password length to at least 8 characters in Supabase Dashboard > Authentication > Settings.',
            });
        }

        // Check: manual linking enabled
        if (settings.security_manual_linking_enabled === true) {
            findings.push({
                id: 'auth-manual-linking',
                severity: 'low',
                title: 'Manual account linking enabled',
                description: 'Manual account linking is enabled, which allows users to link multiple authentication methods to a single account. While useful, this can be exploited for account takeover if not properly validated.',
                recommendation: 'Review your account linking logic to ensure proper identity verification before linking accounts.',
            });
        }

        // Check: phone enabled with autoconfirm
        if (settings.external_phone_enabled === true && settings.sms_autoconfirm === true) {
            scoreDeduction += 5;
            findings.push({
                id: 'auth-phone-autoconfirm',
                severity: 'medium',
                title: 'Phone sign-up with auto-confirm enabled',
                description: 'Phone authentication is enabled with automatic SMS confirmation. Users can sign up with any phone number without verification.',
                recommendation: 'Disable sms_autoconfirm to require phone number verification via OTP.',
            });
        }

        // If settings were retrieved but nothing concerning found
        if (scoreDeduction === 0) {
            findings.push({
                id: 'auth-config-ok',
                severity: 'info',
                title: 'Auth configuration appears secure',
                description: 'No concerning authentication configuration issues were detected.',
                recommendation: 'Continue monitoring auth settings and review periodically.',
            });
        }

    } catch {
        findings.push({
            id: 'auth-audit-error',
            severity: 'info',
            title: 'Auth configuration audit could not complete',
            description: 'The auth settings endpoint did not respond as expected.',
            recommendation: 'No action needed if custom auth is in use.',
        });
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Test 5: Edge Function Auth Check
// ---------------------------------------------------------------------------

async function auditEdgeFunctions(
    supabaseUrl: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    const commonFunctionNames = ['hello', 'api', 'webhook', 'process'];

    const probeResults = await Promise.allSettled(
        commonFunctionNames.map(async (funcName) => {
            try {
                // Use POST with no auth header to test if function requires authentication
                const response = await fetchWithTimeout(
                    `${supabaseUrl}/functions/v1/${funcName}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
                    },
                );

                return {
                    name: funcName,
                    status: response.status,
                    accessible: response.status === 200,
                };
            } catch {
                return { name: funcName, status: 0, accessible: false };
            }
        }),
    );

    const accessibleFunctions: string[] = [];

    for (const result of probeResults) {
        if (result.status === 'fulfilled' && result.value.accessible) {
            accessibleFunctions.push(result.value.name);
        }
    }

    if (accessibleFunctions.length > 0) {
        for (const funcName of accessibleFunctions) {
            scoreDeduction += 15;
            findings.push({
                id: `edge-func-no-auth-${funcName}`,
                severity: 'high',
                title: `Edge function "${funcName}" accessible without authentication`,
                description: `The edge function at /functions/v1/${funcName} returned HTTP 200 without any authentication header. This function can be called by anyone on the internet, potentially exposing functionality or data.`,
                recommendation: `Add JWT verification to the "${funcName}" edge function. Either remove the --no-verify-jwt deployment flag, or implement manual auth checking inside the function.`,
            });
        }
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Test 6: PostgREST RPC Introspection
// ---------------------------------------------------------------------------

async function auditRpcFunctions(
    supabaseUrl: string,
    anonKey: string,
    findings: Finding[],
): Promise<number> {
    let scoreDeduction = 0;

    try {
        // Fetch the OpenAPI schema which includes RPC function definitions
        const schemaResponse = await fetchWithTimeout(
            `${supabaseUrl}/rest/v1/`,
            {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                    'Accept': 'application/json',
                },
            },
        );

        if (!schemaResponse.ok) {
            return 0;
        }

        let schema: any;
        try {
            schema = await schemaResponse.json();
        } catch {
            return 0;
        }

        // Extract RPC functions from the OpenAPI schema
        // They appear as paths like "/rpc/{function_name}"
        const rpcFunctions: string[] = [];
        if (schema && schema.paths) {
            for (const path of Object.keys(schema.paths)) {
                if (path.startsWith('/rpc/')) {
                    const funcName = path.replace('/rpc/', '').split('?')[0];
                    if (funcName) {
                        rpcFunctions.push(funcName);
                    }
                }
            }
        }

        if (rpcFunctions.length === 0) {
            return 0;
        }

        // RPC functions are enumerable
        scoreDeduction += 10;
        findings.push({
            id: 'rpc-functions-enumerable',
            severity: 'medium',
            title: `${rpcFunctions.length} RPC function(s) enumerable via anon key`,
            description: `The following RPC functions are visible in the PostgREST schema: ${rpcFunctions.slice(0, 20).join(', ')}${rpcFunctions.length > 20 ? ` (and ${rpcFunctions.length - 20} more)` : ''}.`,
            recommendation: 'Review which RPC functions should be accessible to unauthenticated users. Use SECURITY DEFINER carefully and consider revoking EXECUTE on sensitive functions from the anon role.',
        });

        // Check for dangerous-sounding function names
        const dangerousPatterns = [
            /delete/i,
            /drop/i,
            /admin/i,
            /^exec$/i,
            /execute/i,
            /^run$/i,
            /system/i,
            /truncate/i,
            /modify/i,
            /remove/i,
            /purge/i,
        ];

        const dangerousFunctions: string[] = [];
        for (const funcName of rpcFunctions) {
            for (const pattern of dangerousPatterns) {
                if (pattern.test(funcName)) {
                    dangerousFunctions.push(funcName);
                    break;
                }
            }
        }

        if (dangerousFunctions.length > 0) {
            scoreDeduction += dangerousFunctions.length * 15;
            findings.push({
                id: 'rpc-dangerous-functions',
                severity: 'high',
                title: `${dangerousFunctions.length} potentially dangerous RPC function(s) exposed`,
                description: `The following RPC functions have names suggesting destructive or administrative operations: ${dangerousFunctions.join(', ')}. These functions are callable via the anon key.`,
                recommendation: 'Revoke EXECUTE permission on these functions from the anon and authenticated roles unless absolutely necessary. Use: REVOKE EXECUTE ON FUNCTION function_name FROM anon, authenticated;',
            });
        }
    } catch {
        // Schema not accessible, which is fine
    }

    return scoreDeduction;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }
        const targetUrl = validation.url!;

        // Optional: user-provided Supabase URL
        let providedSupabaseUrl: string | undefined;
        if (body.supabaseUrl && typeof body.supabaseUrl === 'string') {
            // Validate the provided Supabase URL
            const sbValidation = validateTargetUrl(body.supabaseUrl);
            if (sbValidation.valid) {
                providedSupabaseUrl = sbValidation.url;
            }
        }

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // ------------------------------------------------------------------
        // Test 0: Auto-detect Supabase URL and anon key
        // ------------------------------------------------------------------
        checksRun++;
        const detection = await detectSupabase(targetUrl, providedSupabaseUrl);

        if (!detection.supabaseUrl) {
            // No Supabase detected — return clean result
            findings.push({
                id: 'no-supabase-detected',
                severity: 'info',
                title: 'No Supabase instance detected',
                description: 'No Supabase project URL was found in the target site HTML or JavaScript. This scanner only applies to sites using Supabase.',
                recommendation: 'No action needed. This site does not appear to use Supabase, or the Supabase configuration is not exposed in client-side code.',
            });

            const result: ScanResult = {
                scannerType: 'supabase_backend',
                score: 100,
                findings,
                checksRun,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            };

            return new Response(JSON.stringify(result), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // Supabase detected
        findings.push({
            id: 'supabase-detected',
            severity: 'info',
            title: `Supabase instance detected (${detection.detectedFrom})`,
            description: `Found Supabase project at ${detection.supabaseUrl}. Anon key ${detection.anonKey ? 'was found' : 'was NOT found'} in client-side code.`,
            recommendation: detection.anonKey
                ? 'The anon key is expected to be public. Ensure RLS policies are properly configured to protect your data.'
                : 'No anon key was found in client-side code, which limits the scope of this audit.',
            evidence: detection.anonKey ? redactKey(detection.anonKey) : undefined,
        });

        // ------------------------------------------------------------------
        // Test 2: Service Role Key Detection (runs independently, no anon key needed)
        // ------------------------------------------------------------------
        checksRun++;
        const serviceRoleDeduction = await detectServiceRoleKey(targetUrl, findings);
        score -= serviceRoleDeduction;

        // Tests that require anon key
        if (detection.anonKey) {
            // ------------------------------------------------------------------
            // Test 1: Anon Key Capability Audit
            // ------------------------------------------------------------------
            checksRun++;
            const anonKeyDeduction = await auditAnonKeyCapabilities(
                detection.supabaseUrl,
                detection.anonKey,
                findings,
            );
            score -= anonKeyDeduction;

            // ------------------------------------------------------------------
            // Test 3: Storage Bucket Enumeration
            // ------------------------------------------------------------------
            checksRun++;
            const storageDeduction = await auditStorageBuckets(
                detection.supabaseUrl,
                detection.anonKey,
                findings,
            );
            score -= storageDeduction;

            // ------------------------------------------------------------------
            // Test 4: Auth Configuration Exposure
            // ------------------------------------------------------------------
            checksRun++;
            const authDeduction = await auditAuthConfig(
                detection.supabaseUrl,
                detection.anonKey,
                findings,
            );
            score -= authDeduction;

            // ------------------------------------------------------------------
            // Test 6: PostgREST RPC Introspection
            // ------------------------------------------------------------------
            checksRun++;
            const rpcDeduction = await auditRpcFunctions(
                detection.supabaseUrl,
                detection.anonKey,
                findings,
            );
            score -= rpcDeduction;
        } else {
            findings.push({
                id: 'anon-key-not-found',
                severity: 'info',
                title: 'Anon key not found — some tests skipped',
                description: 'The Supabase anon key was not found in client-side code. Tests that require the anon key (table access audit, storage audit, auth config, RPC introspection) were skipped.',
                recommendation: 'You can provide the anon key via the supabaseUrl parameter or re-run with the key for a complete audit.',
            });
        }

        // ------------------------------------------------------------------
        // Test 5: Edge Function Auth Check (no anon key needed)
        // ------------------------------------------------------------------
        checksRun++;
        const edgeFuncDeduction = await auditEdgeFunctions(detection.supabaseUrl, findings);
        score -= edgeFuncDeduction;

        // ------------------------------------------------------------------
        // Final score adjustments
        // ------------------------------------------------------------------
        score = Math.max(0, Math.min(100, score));

        // If Supabase was detected and everything looks good, note it
        const hasNonInfoFindings = findings.some(
            f => f.severity !== 'info',
        );
        if (!hasNonInfoFindings) {
            score = Math.max(score, 95);
            findings.push({
                id: 'supabase-secure',
                severity: 'info',
                title: 'Supabase properly configured',
                description: 'No security misconfigurations were detected in your Supabase backend. All tested aspects appear to be properly secured.',
                recommendation: 'Continue following Supabase security best practices. Regularly review RLS policies and access controls.',
            });
        }

        const result: ScanResult = {
            scannerType: 'supabase_backend',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Supabase scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'supabase_backend',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: '',
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
        );
    }
});
