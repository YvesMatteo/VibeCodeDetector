-- Security hardening migration (2026-02-17)
-- Fixes: SECURITY DEFINER functions callable by any authenticated user,
-- missing search_path on check_project_limit, cleanup functions exposed

-- 1. Revoke EXECUTE on sensitive functions from public roles
-- Only service_role (used by the dashboard API) should call these
REVOKE EXECUTE ON FUNCTION increment_scan_usage(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION register_scan_domain(uuid, text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION check_rate_limit(text, int, int) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION validate_api_key(text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION cleanup_usage_logs(int) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION cleanup_rate_limit_windows() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION check_project_limit(uuid) FROM authenticated, anon;

-- 2. Fix check_project_limit: add SET search_path for SECURITY DEFINER safety
CREATE OR REPLACE FUNCTION check_project_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INT, project_limit INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan TEXT;
    v_plan_domains INT;
    v_current INT;
    v_limit INT;
BEGIN
    SELECT p.plan, p.plan_domains INTO v_plan, v_plan_domains
    FROM profiles p WHERE p.id = p_user_id;

    -- Free tier: 1 project, paid plans: plan_domains
    IF v_plan IS NULL OR v_plan = 'none' THEN
        v_limit := 1;
    ELSE
        v_limit := COALESCE(v_plan_domains, 1);
    END IF;

    SELECT COUNT(*)::INT INTO v_current
    FROM projects pr WHERE pr.user_id = p_user_id;

    RETURN QUERY SELECT (v_current < v_limit), v_current, v_limit;
END;
$$;

-- 3. Add explicit WITH CHECK to dismissed_findings policy for clarity
DROP POLICY IF EXISTS "Users manage own dismissals" ON dismissed_findings;
CREATE POLICY "Users manage own dismissals"
    ON dismissed_findings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Add cleanup for processed_webhook_events (auto-expire after 90 days)
CREATE OR REPLACE FUNCTION cleanup_processed_events(p_days INT DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM processed_webhook_events
    WHERE processed_at < NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- Only service_role can call cleanup
REVOKE EXECUTE ON FUNCTION cleanup_processed_events(int) FROM authenticated, anon;
