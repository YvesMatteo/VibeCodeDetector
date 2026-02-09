-- =============================================================================
-- API Keys, Rate Limiting, and Usage Audit Log
-- Created: 2026-02-10
-- Purpose: Enable scoped API keys with rate limiting to reduce blast radius
--          of compromised keys.
-- =============================================================================


-- =============================================================================
-- 1. API Keys table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,          -- SHA-256 hash of the full key
  key_prefix text NOT NULL,        -- First 8 chars for display (e.g., "cvd_live_a1b2c3d4")
  name text NOT NULL DEFAULT 'Default',
  scopes text[] NOT NULL DEFAULT '{scan:read}',
  allowed_domains text[],          -- NULL = inherit user's plan domains; set = restrict to these
  allowed_ips text[],              -- NULL = any IP; set = restrict to these CIDRs
  expires_at timestamptz,          -- NULL = uses default (90 days from creation)
  revoked_at timestamptz,          -- NULL = active; set = revoked
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique hash so no two keys collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

-- Fast lookup for user's keys list
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- RLS: users can only see their own keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — keys are soft-deleted via revoked_at


-- =============================================================================
-- 2. API Key Usage Audit Log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_key_usage_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address text,
  status_code int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for per-key usage queries (dashboard)
CREATE INDEX IF NOT EXISTS idx_usage_log_key_id ON public.api_key_usage_log(key_id, created_at DESC);

-- Index for per-user usage queries
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON public.api_key_usage_log(user_id, created_at DESC);

-- Auto-cleanup: keep only 90 days of logs
-- (To be called by a cron or pg_cron job)
CREATE OR REPLACE FUNCTION public.cleanup_usage_logs(p_days int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM api_key_usage_log
  WHERE created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS: only service_role writes to this table; users can read their own logs
ALTER TABLE public.api_key_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON public.api_key_usage_log FOR SELECT
  USING (auth.uid() = user_id);


-- =============================================================================
-- 3. Rate Limit Sliding Window table
--
-- Design: Each row = (identifier, window_start, request_count)
-- identifier examples:
--   "key:<key_id>"    — per-key limit
--   "user:<user_id>"  — per-user aggregate limit
--   "ip:<ip_addr>"    — per-IP limit
-- window_start is truncated to the start of the current minute
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
  identifier text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  PRIMARY KEY (identifier, window_start)
);

-- Index for cleanup of expired windows
CREATE INDEX IF NOT EXISTS idx_rate_limit_windows_start
  ON public.rate_limit_windows(window_start);

-- No RLS needed — accessed only via SECURITY DEFINER functions
ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 4. Atomic rate limit check + increment function
--
-- Returns: (allowed BOOLEAN, current_count INT, limit_max INT, reset_at TIMESTAMPTZ)
--
-- Uses a 60-second sliding window. Atomically increments or inserts.
-- If current_count >= p_max_requests, returns allowed = false.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_max_requests int,
  p_window_seconds int DEFAULT 60
)
RETURNS TABLE(allowed boolean, current_count int, limit_max int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count int;
BEGIN
  -- Truncate to window boundary
  v_window_start := date_trunc('minute', now());

  -- Upsert: increment if exists, insert if not
  INSERT INTO rate_limit_windows (identifier, window_start, request_count)
  VALUES (p_identifier, v_window_start, 1)
  ON CONFLICT (identifier, window_start)
  DO UPDATE SET request_count = rate_limit_windows.request_count + 1
  RETURNING rate_limit_windows.request_count INTO v_count;

  -- Check against limit
  IF v_count > p_max_requests THEN
    RETURN QUERY SELECT
      false,
      v_count,
      p_max_requests,
      v_window_start + (p_window_seconds || ' seconds')::interval;
  ELSE
    RETURN QUERY SELECT
      true,
      v_count,
      p_max_requests,
      v_window_start + (p_window_seconds || ' seconds')::interval;
  END IF;
END;
$$;


-- =============================================================================
-- 5. Cleanup expired rate limit windows (older than 10 minutes)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_windows()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM rate_limit_windows
  WHERE window_start < now() - interval '10 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- =============================================================================
-- 6. Validate API key function
--
-- Looks up a key by its SHA-256 hash, checks it's active (not revoked,
-- not expired), and returns key metadata + owner info.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS TABLE(
  key_id uuid,
  user_id uuid,
  scopes text[],
  allowed_domains text[],
  allowed_ips text[],
  plan text,
  plan_scans_used int,
  plan_scans_limit int,
  plan_domains int,
  user_allowed_domains text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key api_keys%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Look up key by hash
  SELECT * INTO v_key FROM api_keys ak
  WHERE ak.key_hash = p_key_hash
  LIMIT 1;

  -- Key not found
  IF v_key IS NULL THEN
    RETURN;
  END IF;

  -- Key revoked
  IF v_key.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- Key expired
  IF v_key.expires_at IS NOT NULL AND v_key.expires_at < now() THEN
    RETURN;
  END IF;

  -- Update last_used_at (fire-and-forget, don't block on this)
  UPDATE api_keys SET last_used_at = now() WHERE id = v_key.id;

  -- Get user profile for plan info
  SELECT * INTO v_profile FROM profiles WHERE id = v_key.user_id;

  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_key.id,
    v_key.user_id,
    v_key.scopes,
    v_key.allowed_domains,
    v_key.allowed_ips,
    v_profile.plan,
    v_profile.plan_scans_used,
    v_profile.plan_scans_limit,
    v_profile.plan_domains,
    v_profile.allowed_domains;
END;
$$;
