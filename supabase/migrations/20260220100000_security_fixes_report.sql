-- =============================================================================
-- Security Fixes (Report 2026-02-20)
-- 1. Explicitly drop and recreate INSERT policies with WITH CHECK
-- 2. Add SET search_path = '' and fully qualified schemas to SECURITY DEFINER
-- 3. Add missing FK indexes
-- 4. Add Service-Role only policies for closed tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Overly Permissive RLS Policies (Fixing the INSERT policies)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.scans;
CREATE POLICY "Users can insert their own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.api_keys;
CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. Secure SECURITY DEFINER functions (Qualify tables + SET search_path = '')
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_scan_usage(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, plan TEXT, plan_scans_used INT, plan_scans_limit INT, plan_domains INT, allowed_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  UPDATE public.profiles
  SET plan_scans_used = public.profiles.plan_scans_used + 1
  WHERE id = p_user_id
    AND public.profiles.plan_scans_used < public.profiles.plan_scans_limit
  RETURNING * INTO v_profile;

  IF v_profile IS NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF v_profile IS NULL THEN
      RETURN QUERY SELECT false, 'none'::TEXT, 0, 0, 0, ARRAY[]::TEXT[];
    ELSE
      RETURN QUERY SELECT false, v_profile.plan, v_profile.plan_scans_used, v_profile.plan_scans_limit, v_profile.plan_domains, v_profile.allowed_domains;
    END IF;
  ELSE
    RETURN QUERY SELECT true, v_profile.plan, v_profile.plan_scans_used, v_profile.plan_scans_limit, v_profile.plan_domains, v_profile.allowed_domains;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, credits, plan, plan_domains, plan_scans_limit, plan_scans_used, allowed_domains)
  VALUES (new.id, 0, 'none', 1, 3, 0, '{}');
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_billing_field_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.plan IS DISTINCT FROM OLD.plan OR
    NEW.plan_domains IS DISTINCT FROM OLD.plan_domains OR
    NEW.plan_scans_limit IS DISTINCT FROM OLD.plan_scans_limit OR
    NEW.plan_scans_used IS DISTINCT FROM OLD.plan_scans_used OR
    NEW.plan_period_start IS DISTINCT FROM OLD.plan_period_start OR
    NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
    NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
    NEW.allowed_domains IS DISTINCT FROM OLD.allowed_domains OR
    NEW.credits IS DISTINCT FROM OLD.credits
  ) THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND current_user IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION 'Users cannot modify billing fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION public.register_scan_domain(p_user_id UUID, p_domain TEXT)
RETURNS TABLE(success BOOLEAN, allowed_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_domains TEXT[];
  v_limit INT;
BEGIN
  SELECT public.profiles.allowed_domains, public.profiles.plan_domains
  INTO v_domains, v_limit
  FROM public.profiles WHERE id = p_user_id
  FOR UPDATE;

  IF v_domains IS NULL THEN
    v_domains := ARRAY[]::TEXT[];
  END IF;

  IF p_domain = ANY(v_domains) THEN
    RETURN QUERY SELECT true, v_domains;
    RETURN;
  END IF;

  IF coalesce(array_length(v_domains, 1), 0) >= v_limit THEN
    RETURN QUERY SELECT false, v_domains;
    RETURN;
  END IF;

  v_domains := array_append(v_domains, p_domain);
  UPDATE public.profiles SET allowed_domains = v_domains WHERE id = p_user_id;
  RETURN QUERY SELECT true, v_domains;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_usage_logs(p_days int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.api_key_usage_log
  WHERE created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_processed_events(p_days INT DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.processed_webhook_events
    WHERE processed_at < NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_project_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INT, project_limit INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_plan TEXT;
    v_plan_domains INT;
    v_current INT;
    v_limit INT;
BEGIN
    SELECT p.plan, p.plan_domains INTO v_plan, v_plan_domains
    FROM public.profiles p WHERE p.id = p_user_id;

    IF v_plan IS NULL OR v_plan = 'none' THEN
        v_limit := 1;
    ELSE
        v_limit := COALESCE(v_plan_domains, 1);
    END IF;

    SELECT COUNT(*)::INT INTO v_current
    FROM public.projects pr WHERE pr.user_id = p_user_id;

    RETURN QUERY SELECT (v_current < v_limit), v_current, v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_max_requests int,
  p_window_seconds int DEFAULT 60
)
RETURNS TABLE(allowed boolean, current_count int, limit_max int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start timestamptz;
  v_count int;
BEGIN
  v_window_start := date_trunc('minute', now());

  INSERT INTO public.rate_limit_windows (identifier, window_start, request_count)
  VALUES (p_identifier, v_window_start, 1)
  ON CONFLICT (identifier, window_start)
  DO UPDATE SET request_count = public.rate_limit_windows.request_count + 1
  RETURNING public.rate_limit_windows.request_count INTO v_count;

  IF v_count > p_max_requests THEN
    RETURN QUERY SELECT false, v_count, p_max_requests, v_window_start + (p_window_seconds || ' seconds')::interval;
  ELSE
    RETURN QUERY SELECT true, v_count, p_max_requests, v_window_start + (p_window_seconds || ' seconds')::interval;
  END IF;
END;
$$;

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
SET search_path = ''
AS $$
DECLARE
  v_key public.api_keys%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_key FROM public.api_keys ak WHERE ak.key_hash = p_key_hash LIMIT 1;
  IF v_key IS NULL THEN RETURN; END IF;
  IF v_key.revoked_at IS NOT NULL THEN RETURN; END IF;
  IF v_key.expires_at IS NOT NULL AND v_key.expires_at < now() THEN RETURN; END IF;

  UPDATE public.api_keys SET last_used_at = now() WHERE id = v_key.id;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_key.user_id;
  IF v_profile IS NULL THEN RETURN; END IF;

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

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_windows()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.rate_limit_windows
  WHERE window_start < now() - interval '10 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Missing Foreign Key Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dismissed_findings_scan_id ON public.dismissed_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_project_webhooks_user_id ON public.project_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_scans_user_id ON public.scheduled_scans(user_id);


-- -----------------------------------------------------------------------------
-- 4. Explicit Policies for Closed Tables
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Deny all access" ON public.rate_limit_windows;
CREATE POLICY "Deny all access" ON public.rate_limit_windows FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access" ON public.waitlist_emails;
CREATE POLICY "Deny all access" ON public.waitlist_emails FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access" ON public.processed_webhook_events;
CREATE POLICY "Deny all access" ON public.processed_webhook_events FOR ALL USING (false);
