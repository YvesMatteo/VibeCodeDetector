-- =============================================================================
-- Security Migration: Fix critical database-level vulnerabilities
-- Created: 2026-02-09
-- =============================================================================

-- =============================================================================
-- 1. Fix the overly permissive RLS UPDATE policy on profiles
--
-- Problem: The current policy allows authenticated users to update ANY column
-- on their own profile row, including plan, billing, and stripe columns.
-- A malicious user could call supabase.from('profiles').update({plan:'enterprise'})
-- and give themselves a free enterprise plan.
--
-- Fix: Use a BEFORE UPDATE trigger to block modifications to billing fields
-- unless the caller is using the service_role (i.e. server-side / Edge Functions).
-- =============================================================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a trigger function that prevents billing field modifications by regular users
CREATE OR REPLACE FUNCTION public.prevent_billing_field_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- If any billing/sensitive field is being changed, check caller role
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
    -- Only allow if the current role is service_role (server-side operations like
    -- Edge Functions, webhooks, or admin scripts using the service_role key)
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND current_user IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION 'Users cannot modify billing fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS protect_billing_fields ON public.profiles;

-- Create the trigger
CREATE TRIGGER protect_billing_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_field_updates();

-- Re-create the update policy: still allows users to update their own row,
-- but the trigger above enforces column-level restrictions
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- =============================================================================
-- 2. Atomic scan usage increment function
--
-- Problem: The current code does a read-then-write (SELECT plan_scans_used,
-- then UPDATE plan_scans_used + 1). Under concurrent requests this is a race
-- condition that could allow exceeding the scan limit.
--
-- Fix: A single atomic UPDATE ... WHERE used < limit, returning success/failure.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_scan_usage(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, plan TEXT, plan_scans_used INT, plan_scans_limit INT, plan_domains INT, allowed_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Atomically increment and return, only if under limit
  UPDATE profiles
  SET plan_scans_used = profiles.plan_scans_used + 1
  WHERE id = p_user_id
    AND profiles.plan_scans_used < profiles.plan_scans_limit
  RETURNING * INTO v_profile;

  IF v_profile IS NULL THEN
    -- Either user not found or limit reached -- fetch current state to return info
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    IF v_profile IS NULL THEN
      -- User does not exist
      RETURN QUERY SELECT false, 'none'::TEXT, 0, 0, 0, ARRAY[]::TEXT[];
    ELSE
      -- Limit reached: return current state with success = false
      RETURN QUERY SELECT false, v_profile.plan, v_profile.plan_scans_used, v_profile.plan_scans_limit, v_profile.plan_domains, v_profile.allowed_domains;
    END IF;
  ELSE
    -- Successfully incremented
    RETURN QUERY SELECT true, v_profile.plan, v_profile.plan_scans_used, v_profile.plan_scans_limit, v_profile.plan_domains, v_profile.allowed_domains;
  END IF;
END;
$$;


-- =============================================================================
-- 3. Atomic domain registration function
--
-- Problem: Registering a new domain for a user (checking limit, appending to
-- allowed_domains) is also a read-then-write pattern vulnerable to races.
--
-- Fix: Use SELECT ... FOR UPDATE to lock the row, then check + append atomically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.register_scan_domain(p_user_id UUID, p_domain TEXT)
RETURNS TABLE(success BOOLEAN, allowed_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domains TEXT[];
  v_limit INT;
BEGIN
  -- Lock the profile row to prevent concurrent domain registrations
  SELECT profiles.allowed_domains, profiles.plan_domains
  INTO v_domains, v_limit
  FROM profiles WHERE id = p_user_id
  FOR UPDATE;

  -- Handle NULL domains array
  IF v_domains IS NULL THEN
    v_domains := ARRAY[]::TEXT[];
  END IF;

  -- Domain already registered: return success
  IF p_domain = ANY(v_domains) THEN
    RETURN QUERY SELECT true, v_domains;
    RETURN;
  END IF;

  -- Check if domain limit is reached
  IF coalesce(array_length(v_domains, 1), 0) >= v_limit THEN
    RETURN QUERY SELECT false, v_domains;
    RETURN;
  END IF;

  -- Register the new domain
  v_domains := array_append(v_domains, p_domain);
  UPDATE profiles SET allowed_domains = v_domains WHERE id = p_user_id;
  RETURN QUERY SELECT true, v_domains;
END;
$$;


-- =============================================================================
-- 4. Webhook idempotency table
--
-- Problem: The Stripe webhook handler has no deduplication. If Stripe retries
-- a webhook event (which it does on timeouts), the handler will process it
-- again, potentially double-crediting or double-updating subscriptions.
--
-- Fix: A table to track processed event IDs. The webhook handler should
-- INSERT ... ON CONFLICT DO NOTHING and only proceed if the insert succeeded.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient cleanup of old events
CREATE INDEX IF NOT EXISTS idx_processed_events_date
  ON public.processed_webhook_events(processed_at);

-- Enable RLS but add no policies: this table is only accessed by the service_role
-- key in the webhook Edge Function, so no user-facing policies are needed.
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
