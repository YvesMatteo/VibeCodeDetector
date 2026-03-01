-- =============================================================================
-- Add missing get_threat_top_ips RPC function for threat detection dashboard
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_threat_top_ips(UUID, TIMESTAMPTZ, INT);

CREATE OR REPLACE FUNCTION public.get_threat_top_ips(
    p_project_id UUID,
    p_since TIMESTAMPTZ DEFAULT now() - INTERVAL '24 hours',
    p_limit INT DEFAULT 10
)
RETURNS TABLE(source_ip INET, event_count BIGINT, last_seen_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT te.source_ip, COUNT(*) AS event_count, MAX(te.created_at) AS last_seen_at
    FROM public.threat_events te
    WHERE te.project_id = p_project_id
    AND te.created_at >= p_since
    AND te.source_ip IS NOT NULL
    GROUP BY te.source_ip
    ORDER BY event_count DESC
    LIMIT p_limit;
$$;

-- Allow authenticated users to call this from the dashboard
GRANT EXECUTE ON FUNCTION public.get_threat_top_ips(UUID, TIMESTAMPTZ, INT) TO authenticated;
