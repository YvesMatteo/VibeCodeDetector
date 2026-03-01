-- Migration: Ensure deletions are truly permanent everywhere
-- Fixes orphaned records when API keys, projects, or scans are deleted

-- ============================================================================
-- 1. Fix scans.project_id FK: SET NULL → CASCADE
--    When a project is deleted, its scans should be deleted too (not orphaned)
-- ============================================================================
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_project_id_fkey;
ALTER TABLE scans
    ADD CONSTRAINT scans_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- ============================================================================
-- 2. Fix api_key_usage_log.key_id FK: SET NULL → CASCADE
--    When an API key is hard-deleted, its usage logs should go with it
-- ============================================================================
ALTER TABLE api_key_usage_log DROP CONSTRAINT IF EXISTS api_key_usage_log_key_id_fkey;
ALTER TABLE api_key_usage_log
    ADD CONSTRAINT api_key_usage_log_key_id_fkey
    FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. Add missing FK on netlify_deployments.scan_id → scans(id)
--    Currently has no FK constraint at all — SET NULL preserves deployment audit trail
-- ============================================================================
ALTER TABLE netlify_deployments
    ADD CONSTRAINT netlify_deployments_scan_id_fkey
    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. cleanup_api_key_artifacts: removes rate_limit_windows for a deleted key
--    rate_limit_windows uses text 'identifier' field (no FK), so must be cleaned manually
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_api_key_artifacts(p_key_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.rate_limit_windows
    WHERE identifier LIKE 'key:' || p_key_id::text || '%';
END;
$$;

-- Only service_role can call this function
REVOKE ALL ON FUNCTION cleanup_api_key_artifacts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_api_key_artifacts(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION cleanup_api_key_artifacts(UUID) FROM anon;
