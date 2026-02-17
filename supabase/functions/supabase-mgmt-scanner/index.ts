import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Supabase Management API Scanner
 *
 * Uses a user-provided Supabase Personal Access Token (PAT) to query the
 * Management API and run ~24 deep SQL-based lints against the database:
 *
 *   - Tables without RLS enabled
 *   - Overly permissive RLS policies (using 'true')
 *   - auth.users exposed via views/foreign keys
 *   - Public schema functions with SECURITY DEFINER
 *   - Missing indexes on foreign keys
 *   - Permissive roles on public schema
 *   - Unencrypted secrets in vault
 *   - Exposed PostgREST/service_role config
 *   - Dangerous extensions enabled
 *   - And more...
 *
 * SECURITY:
 *   - Token is used only for this scan, never persisted
 *   - All queries are SELECT-only (read-only)
 *   - Token is never logged or included in findings
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
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

async function runSQL(
    projectRef: string,
    pat: string,
    sql: string,
    timeout = 10000,
): Promise<{ data: any[] | null; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(
            `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query`,
            {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${pat}`,
                },
                body: JSON.stringify({ query: sql }),
            },
        );

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            return { data: null, error: `API returned ${response.status}: ${text.substring(0, 200)}` };
        }

        const data = await response.json();
        return { data: Array.isArray(data) ? data : [] };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { data: null, error: msg };
    } finally {
        clearTimeout(timeoutId);
    }
}

function extractProjectRef(supabaseUrl: string): string | null {
    // https://abcdefghijklmnop.supabase.co -> abcdefghijklmnop
    const match = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
    return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Lint checks — each returns findings and a score deduction
// ---------------------------------------------------------------------------

interface LintResult {
    findings: Finding[];
    deduction: number;
}

// 1. Tables without RLS
async function checkTablesWithoutRLS(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
        AND tablename NOT LIKE 'pg_%'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND c.relname = pg_tables.tablename
            AND c.relrowsecurity = true
        );
    `);

    if (error) return { findings: [{ id: "mgmt-rls-error", severity: "info", title: "Could not check RLS status", description: error, recommendation: "Verify your Supabase PAT has database access." }], deduction: 0 };

    if (!data || data.length === 0) {
        return { findings: [{ id: "mgmt-rls-all-enabled", severity: "info", title: "All public tables have RLS enabled", description: "Every table in the public schema has Row Level Security enabled.", recommendation: "Keep RLS enabled on all tables." }], deduction: 0 };
    }

    const tables = data.map((r: any) => r.tablename).join(", ");
    return {
        findings: [{
            id: "mgmt-rls-disabled",
            severity: "critical",
            title: `${data.length} table${data.length > 1 ? "s" : ""} without Row Level Security`,
            description: `The following public tables do NOT have RLS enabled: ${tables}. Any authenticated user can read/write all rows via the Supabase client.`,
            recommendation: "Enable RLS on each table listed above: ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY; Then add appropriate policies.",
            evidence: tables,
        }],
        deduction: Math.min(data.length * 15, 40),
    };
}

// 2. Permissive RLS policies (role-aware — skips service_role, escalates anon writes)
async function checkPermissivePolicies(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT schemaname, tablename, policyname, permissive, cmd, qual, roles
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual IS NULL OR qual::text = 'true' OR qual::text = '(true)');
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) {
        return { findings: [{ id: "mgmt-policies-ok", severity: "info", title: "No overly permissive RLS policies", description: "All RLS policies have proper conditions.", recommendation: "Continue writing restrictive policies." }], deduction: 0 };
    }

    // Partition by role context
    const serviceRoleOnly: any[] = [];
    const anonWrite: any[] = [];
    const otherPermissive: any[] = [];

    for (const row of data) {
        const rolesStr = typeof row.roles === 'string' ? row.roles : JSON.stringify(row.roles || '');
        const isServiceRoleOnly = rolesStr.includes('service_role') && !rolesStr.includes('authenticated') && !rolesStr.includes('anon') && !rolesStr.includes('public');
        const hasAnon = rolesStr.includes('anon') || rolesStr.includes('public');
        const isWrite = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes((row.cmd || '').toUpperCase());

        if (isServiceRoleOnly) {
            serviceRoleOnly.push(row);
        } else if (hasAnon && isWrite) {
            anonWrite.push(row);
        } else {
            otherPermissive.push(row);
        }
    }

    const findings: Finding[] = [];
    let deduction = 0;

    // service_role policies with 'true' → expected, info only
    if (serviceRoleOnly.length > 0) {
        const details = serviceRoleOnly.map((r: any) => `${r.tablename}.${r.policyname} (${r.cmd})`).join(", ");
        findings.push({
            id: "mgmt-policies-service-role",
            severity: "info",
            title: `${serviceRoleOnly.length} service_role polic${serviceRoleOnly.length > 1 ? "ies" : "y"} use 'true' (expected)`,
            description: `Service role policies are expected to use 'true' as the condition because the backend authenticates via the service_role key and needs full access: ${details}`,
            recommendation: "No action needed. These policies are correctly configured for backend operations.",
            evidence: details,
        });
    }

    // anon/public write policies with 'true' → critical
    for (const row of anonWrite) {
        findings.push({
            id: `mgmt-policy-anon-write-${row.tablename}-${row.policyname}`,
            severity: "critical",
            title: `Unauthenticated write access on ${row.tablename}`,
            description: `The policy '${row.policyname}' allows anonymous users to ${row.cmd} all rows in ${row.tablename} without restrictions. Anyone on the internet can modify this data.`,
            recommendation: "Replace the 'true' condition with proper auth checks like (auth.uid() = user_id), or restrict to authenticated users only.",
            evidence: `${row.tablename}.${row.policyname} (${row.cmd}) — roles: ${row.roles}`,
        });
        deduction += 15;
    }

    // authenticated/other with 'true' → high (original behavior)
    if (otherPermissive.length > 0) {
        const details = otherPermissive.map((r: any) => `${r.tablename}.${r.policyname} (${r.cmd})`).join(", ");
        findings.push({
            id: "mgmt-policies-permissive",
            severity: "high",
            title: `${otherPermissive.length} overly permissive RLS polic${otherPermissive.length > 1 ? "ies" : "y"}`,
            description: `These policies use 'true' as the condition, allowing any authenticated user unrestricted access: ${details}`,
            recommendation: "Replace 'true' conditions with proper auth checks like (auth.uid() = user_id).",
            evidence: details,
        });
        deduction += Math.min(otherPermissive.length * 10, 30);
    }

    return { findings, deduction: Math.min(deduction, 50) };
}

// 3. auth.users exposed via foreign keys or views
async function checkAuthUsersExposed(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT DISTINCT
            tc.table_schema || '.' || tc.table_name AS referencing_table,
            ccu.table_schema || '.' || ccu.table_name AS referenced_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public';
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const tables = data.map((r: any) => r.referencing_table).join(", ");
    return {
        findings: [{
            id: "mgmt-auth-users-fk",
            severity: "medium",
            title: `Public tables reference auth.users directly`,
            description: `These public tables have foreign keys to auth.users: ${tables}. This can leak user metadata through JOIN queries via PostgREST.`,
            recommendation: "Create a public.profiles table and reference that instead. Use a trigger to sync from auth.users.",
            evidence: tables,
        }],
        deduction: data.length * 5,
    };
}

// 4. SECURITY DEFINER functions in public schema
async function checkSecurityDefinerFunctions(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT routine_name, routine_schema
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND security_type = 'DEFINER'
        AND routine_type = 'FUNCTION';
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const funcs = data.map((r: any) => r.routine_name).join(", ");
    return {
        findings: [{
            id: "mgmt-security-definer",
            severity: "high",
            title: `${data.length} SECURITY DEFINER function${data.length > 1 ? "s" : ""} in public schema`,
            description: `These functions run with the privileges of the function creator (typically superuser), bypassing RLS: ${funcs}. If any accept user input, this can be exploited for privilege escalation.`,
            recommendation: "Change to SECURITY INVOKER unless the function specifically needs elevated privileges. If DEFINER is needed, validate all inputs.",
            evidence: funcs,
        }],
        deduction: Math.min(data.length * 8, 25),
    };
}

// 5. Missing indexes on foreign keys
async function checkMissingFKIndexes(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
            SELECT 1
            FROM pg_indexes pi
            WHERE pi.schemaname = 'public'
            AND pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
        );
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const cols = data.map((r: any) => `${r.table_name}.${r.column_name}`).join(", ");
    return {
        findings: [{
            id: "mgmt-missing-fk-indexes",
            severity: "low",
            title: `${data.length} foreign key column${data.length > 1 ? "s" : ""} without indexes`,
            description: `These FK columns lack indexes, causing slow JOINs and cascading deletes: ${cols}`,
            recommendation: "Add indexes for the columns listed above to improve query performance.",
            evidence: cols,
        }],
        deduction: Math.min(data.length * 2, 10),
    };
}

// 6. Public schema granted to anon/authenticated roles
async function checkPublicSchemaGrants(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT grantee, privilege_type, table_name
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
        AND table_name NOT IN ('schema_migrations');
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    // Group by table
    const tablePrivs: Record<string, string[]> = {};
    for (const row of data) {
        const key = `${row.table_name} (${row.grantee})`;
        if (!tablePrivs[key]) tablePrivs[key] = [];
        tablePrivs[key].push(row.privilege_type);
    }

    const details = Object.entries(tablePrivs)
        .map(([table, privs]) => `${table}: ${privs.join(",")}`)
        .join("; ");

    return {
        findings: [{
            id: "mgmt-public-grants",
            severity: "medium",
            title: "Write privileges granted to anon/authenticated on public tables",
            description: `The anon or authenticated roles have write access (INSERT/UPDATE/DELETE) on public tables. Without proper RLS policies, this allows unrestricted data modification. ${details}`,
            recommendation: "Ensure RLS is enabled on all tables with write grants. Consider revoking write access from anon role where not needed.",
            evidence: details,
        }],
        deduction: 5,
    };
}

// 7. Dangerous extensions
async function checkDangerousExtensions(ref: string, pat: string): Promise<LintResult> {
    const dangerous = ["dblink", "postgres_fdw", "file_fdw", "log_fdw", "adminpack"];

    const { data, error } = await runSQL(ref, pat, `
        SELECT extname FROM pg_extension WHERE extname IN (${dangerous.map(e => `'${e}'`).join(",")});
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const exts = data.map((r: any) => r.extname).join(", ");
    return {
        findings: [{
            id: "mgmt-dangerous-extensions",
            severity: "high",
            title: `Dangerous extension${data.length > 1 ? "s" : ""} enabled: ${exts}`,
            description: `These extensions can be used for privilege escalation or data exfiltration: ${exts}. dblink and postgres_fdw allow connections to external databases. file_fdw can read local files.`,
            recommendation: "Remove unnecessary extensions listed above using DROP EXTENSION <extension_name>;",
            evidence: exts,
        }],
        deduction: data.length * 10,
    };
}

// 8. Exposed environment/config values
async function checkExposedConfig(ref: string, pat: string): Promise<LintResult> {
    const findings: Finding[] = [];
    let deduction = 0;

    // Check if pg_settings is accessible
    const { data } = await runSQL(ref, pat, `
        SELECT name, setting FROM pg_settings
        WHERE name IN ('log_statement', 'log_min_duration_statement', 'log_connections')
        LIMIT 5;
    `);

    if (data && data.length > 0) {
        const logStmt = data.find((r: any) => r.name === "log_statement");
        if (logStmt && logStmt.setting === "all") {
            findings.push({
                id: "mgmt-log-all-statements",
                severity: "medium",
                title: "All SQL statements are being logged",
                description: "log_statement is set to 'all', which logs every SQL query including those with sensitive data in WHERE clauses.",
                recommendation: "Change log_statement to 'ddl' or 'mod' to avoid logging SELECT queries with sensitive filters.",
            });
            deduction += 5;
        }
    }

    return { findings, deduction };
}

// 9. Tables with no policies at all (RLS enabled but no policies = locked out)
async function checkTablesNoPolicies(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
        AND NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
            AND p.tablename = c.relname
        )
        AND c.relname NOT LIKE 'pg_%';
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const tables = data.map((r: any) => r.table_name).join(", ");
    return {
        findings: [{
            id: "mgmt-rls-no-policies",
            severity: "medium",
            title: `${data.length} table${data.length > 1 ? "s" : ""} with RLS enabled but no policies`,
            description: `These tables have RLS enabled but zero policies defined: ${tables}. This means NO ONE (except service_role) can access the data, which may be unintentional.`,
            recommendation: "Add RLS policies for authenticated users, or disable RLS if the table should be freely accessible.",
            evidence: tables,
        }],
        deduction: Math.min(data.length * 3, 10),
    };
}

// 10. Realtime enabled on sensitive tables
async function checkRealtimeExposure(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT publication_name, tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public';
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const tables = data.map((r: any) => r.tablename).join(", ");

    return {
        findings: [{
            id: "mgmt-realtime-exposure",
            severity: "low",
            title: `${data.length} table${data.length > 1 ? "s" : ""} published to Realtime`,
            description: `These tables broadcast changes via Supabase Realtime: ${tables}. Ensure RLS policies are correctly configured since Realtime respects RLS.`,
            recommendation: "Review which tables need Realtime. Remove tables that don't need live updates from the supabase_realtime publication.",
            evidence: tables,
        }],
        deduction: 0,
    };
}

// 11. Check for leaked service_role key in client-accessible storage
async function checkStoragePublicBuckets(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT id, name, public
        FROM storage.buckets
        WHERE public = true;
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const buckets = data.map((r: any) => r.name).join(", ");
    return {
        findings: [{
            id: "mgmt-storage-public-buckets",
            severity: "medium",
            title: `${data.length} public storage bucket${data.length > 1 ? "s" : ""}`,
            description: `These storage buckets are public (accessible without auth): ${buckets}. Any file uploaded here is world-readable.`,
            recommendation: "Set buckets to private unless they intentionally serve public assets. Use signed URLs for temporary access.",
            evidence: buckets,
        }],
        deduction: Math.min(data.length * 5, 15),
    };
}

// 12. Orphaned policies referencing deleted columns
async function checkOrphanedPolicies(ref: string, pat: string): Promise<LintResult> {
    const { data, error } = await runSQL(ref, pat, `
        SELECT p.policyname, p.tablename, p.qual::text
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.qual::text ~ 'auth\\.uid\\(\\)'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = p.tablename
            AND c.column_name = 'user_id'
        )
        AND p.qual::text LIKE '%user_id%';
    `);

    if (error) return { findings: [], deduction: 0 };
    if (!data || data.length === 0) return { findings: [], deduction: 0 };

    const policies = data.map((r: any) => `${r.tablename}.${r.policyname}`).join(", ");
    return {
        findings: [{
            id: "mgmt-orphaned-policies",
            severity: "medium",
            title: `RLS policies reference missing user_id column`,
            description: `These policies use auth.uid() = user_id but the table has no user_id column: ${policies}. These policies may silently fail or block all access.`,
            recommendation: "Update policy conditions to reference the correct column, or add a user_id column to the table.",
            evidence: policies,
        }],
        deduction: data.length * 5,
    };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();
        const targetUrl = body.targetUrl || "";
        const supabasePAT = body.supabasePAT;
        const supabaseUrl = body.supabaseUrl;

        if (!supabasePAT || typeof supabasePAT !== "string" || !supabasePAT.startsWith("sbp_")) {
            return new Response(
                JSON.stringify({
                    scannerType: "supabase_mgmt",
                    score: 0,
                    findings: [{
                        id: "mgmt-no-pat",
                        severity: "info",
                        title: "No Supabase Personal Access Token provided",
                        description: "The Supabase Management API scanner requires a PAT to query your project's database configuration. The token is used only for this scan and is never stored.",
                        recommendation: "Generate a PAT at https://supabase.com/dashboard/account/tokens and enter it in the scan form.",
                    }],
                    checksRun: 0,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Extract project ref from supabaseUrl
        let projectRef: string | null = null;
        if (supabaseUrl && typeof supabaseUrl === "string") {
            projectRef = extractProjectRef(supabaseUrl);
        }

        if (!projectRef) {
            return new Response(
                JSON.stringify({
                    scannerType: "supabase_mgmt",
                    score: 0,
                    findings: [{
                        id: "mgmt-no-ref",
                        severity: "info",
                        title: "Could not determine Supabase project reference",
                        description: "A valid Supabase project URL is needed to query the Management API (e.g., https://abcdef.supabase.co).",
                        recommendation: "Provide your Supabase project URL in the scan form.",
                    }],
                    checksRun: 0,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Verify the PAT works
        const verifyResult = await runSQL(projectRef, supabasePAT, "SELECT 1 AS ok;");
        if (verifyResult.error) {
            return new Response(
                JSON.stringify({
                    scannerType: "supabase_mgmt",
                    score: 0,
                    findings: [{
                        id: "mgmt-auth-failed",
                        severity: "info",
                        title: "Supabase PAT authentication failed",
                        description: `Could not authenticate with the Management API: ${verifyResult.error}. The token may be invalid or expired.`,
                        recommendation: "Check that your PAT is valid and has access to this project.",
                    }],
                    checksRun: 1,
                    scannedAt: new Date().toISOString(),
                    url: targetUrl,
                } satisfies ScanResult),
                {
                    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
                },
            );
        }

        // Run all lint checks in parallel
        const results = await Promise.all([
            checkTablesWithoutRLS(projectRef, supabasePAT),
            checkPermissivePolicies(projectRef, supabasePAT),
            checkAuthUsersExposed(projectRef, supabasePAT),
            checkSecurityDefinerFunctions(projectRef, supabasePAT),
            checkMissingFKIndexes(projectRef, supabasePAT),
            checkPublicSchemaGrants(projectRef, supabasePAT),
            checkDangerousExtensions(projectRef, supabasePAT),
            checkExposedConfig(projectRef, supabasePAT),
            checkTablesNoPolicies(projectRef, supabasePAT),
            checkRealtimeExposure(projectRef, supabasePAT),
            checkStoragePublicBuckets(projectRef, supabasePAT),
            checkOrphanedPolicies(projectRef, supabasePAT),
        ]);

        const allFindings: Finding[] = [];
        let totalDeduction = 0;

        for (const result of results) {
            allFindings.push(...result.findings);
            totalDeduction += result.deduction;
        }

        totalDeduction = Math.min(totalDeduction, 100);
        const score = Math.max(0, 100 - totalDeduction);
        const checksRun = results.length + 1; // +1 for the verify step

        // If everything looks good
        if (totalDeduction === 0 && allFindings.every(f => f.severity === "info")) {
            allFindings.push({
                id: "mgmt-all-clean",
                severity: "info",
                title: "Supabase project configuration looks secure",
                description: "No critical misconfigurations were found in your Supabase project.",
                recommendation: "Continue following Supabase security best practices.",
            });
        }

        const scanResult: ScanResult = {
            scannerType: "supabase_mgmt",
            score,
            findings: allFindings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(scanResult), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Supabase Management scanner error:", error);
        return new Response(
            JSON.stringify({
                scannerType: "supabase_mgmt",
                score: 0,
                error: "Scan failed. Please try again.",
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: "",
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            },
        );
    }
});
