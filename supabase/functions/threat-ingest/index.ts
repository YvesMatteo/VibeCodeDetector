import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThreatEvent {
    type: string;
    severity?: string;
    sourceIp?: string;
    userAgent?: string;
    path?: string;
    payload?: string;
    metadata?: Record<string, unknown>;
    timestamp?: string;
}

interface IngestPayload {
    token: string;
    events: ThreatEvent[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set([
    "xss", "sqli", "csrf", "bot", "brute_force", "path_traversal", "other",
]);

const VALID_SEVERITIES = new Set([
    "critical", "high", "medium", "low", "info",
]);

const MAX_EVENTS_PER_BATCH = 50;
const MAX_PAYLOAD_SNIPPET_LEN = 500;
const MAX_PATH_LEN = 2048;
const MAX_USER_AGENT_LEN = 512;

const RATE_LIMIT_MAX = 500; // events per minute per token
const RATE_LIMIT_WINDOW_SECONDS = 60;

const TOKEN_PREFIX = "cvt_";

// ---------------------------------------------------------------------------
// CORS — open because the snippet runs on customer sites
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
}

/**
 * Extract the client's source IP from request headers.
 * x-forwarded-for may contain a comma-separated chain; take the first entry.
 */
function extractSourceIp(req: Request): string | null {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    return req.headers.get("x-real-ip") ?? null;
}

/**
 * Extract User-Agent from request headers (server-authoritative).
 */
function extractUserAgent(req: Request): string | null {
    const ua = req.headers.get("user-agent");
    return ua ? ua.slice(0, MAX_USER_AGENT_LEN) : null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body: IngestPayload;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const { token, events } = body;

    // -- Token validation --------------------------------------------------
    if (!token || typeof token !== "string") {
        return jsonResponse({ error: "Missing token" }, 400);
    }

    if (!token.startsWith(TOKEN_PREFIX)) {
        return jsonResponse({ error: "Invalid token format" }, 400);
    }

    if (!Array.isArray(events) || events.length === 0) {
        return jsonResponse({ error: "Events array required" }, 400);
    }

    // Cap batch size
    const batch = events.slice(0, MAX_EVENTS_PER_BATCH);

    // -- Supabase client ---------------------------------------------------
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // -- DB-backed rate limit (sliding window via check_rate_limit RPC) ----
    // Uses the existing rate_limit_windows table + atomic check_rate_limit
    // function. The identifier is scoped per-token so each snippet token has
    // its own 500 events/minute budget.
    try {
        const { data: rlData, error: rlError } = await supabase.rpc(
            "check_rate_limit",
            {
                p_identifier: `threat:${token}`,
                p_max_requests: RATE_LIMIT_MAX,
                p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
            },
        );

        if (rlError) {
            console.error("Rate limit check failed:", rlError);
            // Fail closed — deny when we cannot verify the rate limit
            return jsonResponse({ error: "Rate limit check failed" }, 429);
        }

        const rl = rlData?.[0];
        if (!rl || !rl.allowed) {
            return jsonResponse({ error: "Rate limit exceeded" }, 429);
        }
    } catch (err) {
        console.error("Rate limit RPC exception:", err);
        return jsonResponse({ error: "Rate limit check failed" }, 429);
    }

    // -- Validate token against threat_settings ----------------------------
    const { data: settings, error: settingsError } = await supabase
        .from("threat_settings")
        .select("project_id, enabled")
        .eq("snippet_token", token)
        .single();

    if (settingsError || !settings) {
        return jsonResponse({ error: "Invalid token" }, 401);
    }

    if (!settings.enabled) {
        return jsonResponse({ error: "Threat detection disabled" }, 403);
    }

    const projectId = settings.project_id;

    // -- Extract server-authoritative request metadata ---------------------
    const sourceIp = extractSourceIp(req);
    const userAgent = extractUserAgent(req);

    // -- Sanitize and prepare rows -----------------------------------------
    const rows = batch.map((evt) => ({
        project_id: projectId,
        event_type: VALID_TYPES.has(evt.type) ? evt.type : "other",
        severity: VALID_SEVERITIES.has(evt.severity || "") ? evt.severity : "medium",
        source_ip: sourceIp,
        user_agent: userAgent,
        request_path: evt.path ? String(evt.path).slice(0, MAX_PATH_LEN) : null,
        payload_snippet: evt.payload ? String(evt.payload).slice(0, MAX_PAYLOAD_SNIPPET_LEN) : null,
        metadata: evt.metadata && typeof evt.metadata === "object" ? evt.metadata : {},
    }));

    const { error: insertError } = await supabase
        .from("threat_events")
        .insert(rows);

    if (insertError) {
        console.error("Threat events insert error:", insertError);
        return jsonResponse({ error: "Failed to store events" }, 500);
    }

    return jsonResponse({ accepted: rows.length }, 200);
});
