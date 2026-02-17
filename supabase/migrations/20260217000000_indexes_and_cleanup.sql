-- Composite index for frequent "latest scan per project" queries
CREATE INDEX IF NOT EXISTS idx_scans_project_completed
  ON scans (project_id, completed_at DESC)
  WHERE status = 'completed';

-- Schedule automatic cleanup for rate limit windows (delete entries older than 10 min)
-- and API key usage logs (delete entries older than 90 days)
-- Uses pg_cron if available

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Clean up rate limit windows every 5 minutes
    PERFORM cron.schedule(
      'cleanup-rate-limit-windows',
      '*/5 * * * *',
      'SELECT cleanup_rate_limit_windows()'
    );

    -- Clean up old usage logs daily at 3 AM UTC
    PERFORM cron.schedule(
      'cleanup-usage-logs',
      '0 3 * * *',
      'SELECT cleanup_usage_logs()'
    );
  END IF;
END
$$;
