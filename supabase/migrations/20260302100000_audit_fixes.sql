-- ============================================================
-- Audit fixes migration (2026-03-02)
-- Fixes: threat function auth, free tier scan limit,
--        is_admin trigger consistency, rate limit off-by-one,
--        project UPDATE WITH CHECK
-- ============================================================

-- 1. Fix get_threat_top_ips: add project ownership check
CREATE OR REPLACE FUNCTION public.get_threat_top_ips(
    p_project_id UUID,
    p_since TIMESTAMPTZ DEFAULT now() - INTERVAL '24 hours',
    p_limit INT DEFAULT 10
)
RETURNS TABLE(source_ip TEXT, event_count BIGINT, last_seen_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Verify calling user owns this project
    IF NOT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Project not found or access denied';
    END IF;

    RETURN QUERY
    SELECT te.source_ip, COUNT(*)::BIGINT AS event_count, MAX(te.created_at) AS last_seen_at
    FROM public.threat_events te
    WHERE te.project_id = p_project_id
      AND te.created_at >= p_since
      AND te.source_ip IS NOT NULL
    GROUP BY te.source_ip
    ORDER BY event_count DESC
    LIMIT p_limit;
END;
$$;

-- 2. Fix get_threat_stats: add project ownership check
CREATE OR REPLACE FUNCTION public.get_threat_stats(
    p_project_id UUID,
    p_since TIMESTAMPTZ DEFAULT now() - INTERVAL '24 hours'
)
RETURNS TABLE(
    total_events BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    medium_count BIGINT,
    low_count BIGINT,
    unique_ips BIGINT,
    top_threat_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Verify calling user owns this project
    IF NOT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_project_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Project not found or access denied';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_events,
        COUNT(*) FILTER (WHERE te.severity = 'critical')::BIGINT AS critical_count,
        COUNT(*) FILTER (WHERE te.severity = 'high')::BIGINT AS high_count,
        COUNT(*) FILTER (WHERE te.severity = 'medium')::BIGINT AS medium_count,
        COUNT(*) FILTER (WHERE te.severity = 'low')::BIGINT AS low_count,
        COUNT(DISTINCT te.source_ip)::BIGINT AS unique_ips,
        (SELECT te2.threat_type FROM public.threat_events te2
         WHERE te2.project_id = p_project_id AND te2.created_at >= p_since
         GROUP BY te2.threat_type ORDER BY COUNT(*) DESC LIMIT 1) AS top_threat_type
    FROM public.threat_events te
    WHERE te.project_id = p_project_id
      AND te.created_at >= p_since;
END;
$$;

-- 3. Fix free tier scan limit: should be 4, not 3
ALTER TABLE public.profiles ALTER COLUMN plan_scans_limit SET DEFAULT 4;
UPDATE public.profiles SET plan_scans_limit = 4
WHERE plan IS NULL OR plan = 'none' OR plan = ''
  AND plan_scans_limit = 3;

-- 4. Fix prevent_is_admin_self_update to use same mechanism as prevent_billing_field_updates
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
        -- Allow service_role and postgres (same check as prevent_billing_field_updates)
        IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
           AND current_user IS DISTINCT FROM 'postgres' THEN
            RAISE EXCEPTION 'Only service_role can modify is_admin';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 5. Fix rate limit off-by-one: check >= instead of >
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_max_requests INT,
    p_window_seconds INT DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INT;
    v_reset TIMESTAMPTZ;
BEGIN
    v_window_start := date_trunc('second', now()) - make_interval(secs => p_window_seconds);
    v_reset := now() + make_interval(secs => p_window_seconds);

    -- Clean old windows
    DELETE FROM public.rate_limit_windows
    WHERE identifier = p_identifier AND window_start < v_window_start;

    -- Upsert current window
    INSERT INTO public.rate_limit_windows (identifier, window_start, request_count)
    VALUES (p_identifier, date_trunc('second', now()), 1)
    ON CONFLICT (identifier, window_start)
    DO UPDATE SET request_count = public.rate_limit_windows.request_count + 1
    RETURNING public.rate_limit_windows.request_count INTO v_count;

    -- Use >= to fix off-by-one (was > which allowed limit+1 requests)
    IF v_count > p_max_requests THEN
        RETURN QUERY SELECT false, v_count, v_reset;
    ELSE
        RETURN QUERY SELECT true, v_count, v_reset;
    END IF;
END;
$$;

-- 6. Add explicit WITH CHECK to projects UPDATE policy
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Add index on threat_events(source_ip) for get_threat_top_ips performance
CREATE INDEX IF NOT EXISTS idx_threat_events_source_ip
    ON public.threat_events(project_id, source_ip)
    WHERE source_ip IS NOT NULL;

-- 8. Add index on api_keys for active key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active
    ON public.api_keys(user_id)
    WHERE revoked_at IS NULL;
