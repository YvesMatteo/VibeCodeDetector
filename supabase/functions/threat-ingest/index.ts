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

// In-memory rate limiting (best-effort, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 500; // events per minute per token
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(token: string, eventCount: number): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(token);

    if (!entry || now >= entry.resetAt) {
        rateLimitMap.set(token, { count: eventCount, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count + eventCount > RATE_LIMIT_MAX) {
        return false;
    }

    entry.count += eventCount;
    return true;
}

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
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    let body: IngestPayload;
    try {
        body = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ error: "Invalid JSON" }),
            { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    const { token, events } = body;

    if (!token || typeof token !== "string") {
        return new Response(
            JSON.stringify({ error: "Missing token" }),
            { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    if (!Array.isArray(events) || events.length === 0) {
        return new Response(
            JSON.stringify({ error: "Events array required" }),
            { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    // Cap batch size
    const batch = events.slice(0, MAX_EVENTS_PER_BATCH);

    // Rate limit check
    if (!checkRateLimit(token, batch.length)) {
        return new Response(
            JSON.stringify({ error: "Rate limit exceeded" }),
            { status: 429, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    // Validate token against threat_settings
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings, error: settingsError } = await supabase
        .from("threat_settings")
        .select("project_id, enabled")
        .eq("snippet_token", token)
        .single();

    if (settingsError || !settings) {
        return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    if (!settings.enabled) {
        return new Response(
            JSON.stringify({ error: "Threat detection disabled" }),
            { status: 403, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    const projectId = settings.project_id;

    // Get source IP from request headers (forwarded by edge)
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || null;

    // Sanitize and prepare rows
    const rows = batch.map((evt) => ({
        project_id: projectId,
        event_type: VALID_TYPES.has(evt.type) ? evt.type : "other",
        severity: VALID_SEVERITIES.has(evt.severity || "") ? evt.severity : "medium",
        source_ip: evt.sourceIp || sourceIp,
        user_agent: evt.userAgent ? String(evt.userAgent).slice(0, MAX_USER_AGENT_LEN) : null,
        request_path: evt.path ? String(evt.path).slice(0, MAX_PATH_LEN) : null,
        payload_snippet: evt.payload ? String(evt.payload).slice(0, MAX_PAYLOAD_SNIPPET_LEN) : null,
        metadata: evt.metadata && typeof evt.metadata === "object" ? evt.metadata : {},
    }));

    const { error: insertError } = await supabase
        .from("threat_events")
        .insert(rows);

    if (insertError) {
        console.error("Threat events insert error:", insertError);
        return new Response(
            JSON.stringify({ error: "Failed to store events" }),
            { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
        );
    }

    return new Response(
        JSON.stringify({ accepted: rows.length }),
        { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
});
