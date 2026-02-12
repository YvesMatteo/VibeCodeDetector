-- Fix: increment_scan_usage returned 'free' for non-existent users instead of 'none'
-- This aligns with the CHECK constraint on profiles.plan IN ('none','starter','pro','enterprise')

CREATE OR REPLACE FUNCTION public.increment_scan_usage(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, plan TEXT, plan_scans_used INT, plan_scans_limit INT, plan_domains INT, allowed_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  UPDATE profiles
  SET plan_scans_used = profiles.plan_scans_used + 1
  WHERE id = p_user_id
    AND profiles.plan_scans_used < profiles.plan_scans_limit
  RETURNING * INTO v_profile;

  IF v_profile IS NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
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
