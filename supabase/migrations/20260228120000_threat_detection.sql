-- =============================================================================
-- Threat Detection: real-time attack monitoring tables, RLS, and RPC functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. threat_settings — per-project configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threat_settings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled       BOOLEAN NOT NULL DEFAULT false,
    alert_frequency TEXT NOT NULL DEFAULT 'daily'
        CHECK (alert_frequency IN ('immediate', 'hourly', 'daily')),
    alert_email   TEXT,
    snippet_token TEXT NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_threat_settings_snippet_token ON public.threat_settings (snippet_token);
CREATE INDEX IF NOT EXISTS idx_threat_settings_user_id ON public.threat_settings (user_id);

-- RLS
ALTER TABLE public.threat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own threat settings"
    ON public.threat_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threat settings"
    ON public.threat_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threat settings"
    ON public.threat_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own threat settings"
    ON public.threat_settings FOR DELETE
    USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. threat_events — high-volume event store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threat_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    event_type    TEXT NOT NULL
        CHECK (event_type IN ('xss', 'sqli', 'csrf', 'bot', 'brute_force', 'path_traversal', 'other')),
    severity      TEXT NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    source_ip     INET,
    user_agent    TEXT,
    request_path  TEXT,
    payload_snippet TEXT,  -- truncated to 500 chars by edge function
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_events_project_time ON public.threat_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_project_type_time ON public.threat_events (project_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_created_at ON public.threat_events (created_at);

-- RLS — reads for project owners, inserts via service_role only
ALTER TABLE public.threat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read threat events for own projects"
    ON public.threat_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = threat_events.project_id
            AND p.user_id = auth.uid()
        )
    );

-- No INSERT/UPDATE/DELETE policies for authenticated — edge function uses service_role

-- ---------------------------------------------------------------------------
-- 3. threat_alert_log — tracks digest email sends for throttling
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threat_alert_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    alert_type    TEXT NOT NULL,
    event_count   INTEGER NOT NULL DEFAULT 0,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threat_alert_log_project_time ON public.threat_alert_log (project_id, sent_at DESC);

ALTER TABLE public.threat_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own threat alert logs"
    ON public.threat_alert_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = threat_alert_log.project_id
            AND p.user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 4. RPC: get_threat_stats — aggregated counts for dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_threat_stats(
    p_project_id UUID,
    p_since TIMESTAMPTZ DEFAULT now() - INTERVAL '24 hours'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_events', COALESCE(COUNT(*), 0),
        'critical_count', COALESCE(COUNT(*) FILTER (WHERE severity = 'critical'), 0),
        'high_count', COALESCE(COUNT(*) FILTER (WHERE severity = 'high'), 0),
        'medium_count', COALESCE(COUNT(*) FILTER (WHERE severity = 'medium'), 0),
        'low_count', COALESCE(COUNT(*) FILTER (WHERE severity = 'low'), 0),
        'unique_ips', COALESCE(COUNT(DISTINCT source_ip), 0),
        'top_attack_type', (
            SELECT event_type
            FROM public.threat_events te2
            WHERE te2.project_id = p_project_id
            AND te2.created_at >= p_since
            GROUP BY event_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        'by_type', COALESCE((
            SELECT json_agg(json_build_object('type', event_type, 'count', cnt))
            FROM (
                SELECT event_type, COUNT(*) AS cnt
                FROM public.threat_events te3
                WHERE te3.project_id = p_project_id
                AND te3.created_at >= p_since
                GROUP BY event_type
                ORDER BY cnt DESC
            ) sub
        ), '[]'::json)
    ) INTO result
    FROM public.threat_events
    WHERE project_id = p_project_id
    AND created_at >= p_since;

    RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: cleanup_threat_events — plan-based TTL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_threat_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_deleted INTEGER := 0;
    rows_affected INTEGER;
    r RECORD;
BEGIN
    -- For each project with threat settings, apply plan-based retention
    FOR r IN
        SELECT
            ts.project_id,
            COALESCE(u.raw_user_meta_data->>'plan', 'none') AS plan
        FROM public.threat_settings ts
        JOIN public.projects p ON p.id = ts.project_id
        JOIN auth.users u ON u.id = p.user_id
        WHERE ts.enabled = true
    LOOP
        DELETE FROM public.threat_events
        WHERE project_id = r.project_id
        AND created_at < CASE r.plan
            WHEN 'starter' THEN now() - INTERVAL '24 hours'
            WHEN 'pro'     THEN now() - INTERVAL '7 days'
            WHEN 'max'     THEN now() - INTERVAL '30 days'
            ELSE                now() - INTERVAL '24 hours'  -- default / free
        END;
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        total_deleted := total_deleted + rows_affected;
    END LOOP;

    -- Hard max: delete anything older than 30 days regardless of plan
    DELETE FROM public.threat_events
    WHERE created_at < now() - INTERVAL '30 days';
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    total_deleted := total_deleted + rows_affected;

    -- Clean old alert logs (older than 90 days)
    DELETE FROM public.threat_alert_log
    WHERE sent_at < now() - INTERVAL '90 days';

    RETURN total_deleted;
END;
$$;

-- Revoke direct execution from authenticated/anon (only service_role should call cleanup)
REVOKE EXECUTE ON FUNCTION public.cleanup_threat_events() FROM authenticated, anon;

-- Grant get_threat_stats to authenticated users (called via RPC from dashboard)
GRANT EXECUTE ON FUNCTION public.get_threat_stats(UUID, TIMESTAMPTZ) TO authenticated;
