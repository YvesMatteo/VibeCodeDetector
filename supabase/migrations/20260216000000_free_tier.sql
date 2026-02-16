-- Free tier: allow plan='none' users to have 1 project and 3 scans/month
-- with blurred finding details to incentivize upgrading.

-- 1. Update check_project_limit() to use plan_domains instead of plan='none' check
CREATE OR REPLACE FUNCTION public.check_project_limit(p_user_id uuid)
RETURNS TABLE(allowed boolean, current_count int, project_limit int)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_plan_domains int;
  v_current int;
BEGIN
  SELECT plan_domains
    INTO v_plan_domains
    FROM public.profiles
   WHERE id = p_user_id;

  -- Block only if plan_domains is explicitly 0 (edge case)
  IF v_plan_domains IS NULL OR v_plan_domains = 0 THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  SELECT count(*)::int INTO v_current
    FROM public.projects
   WHERE projects.user_id = p_user_id;

  RETURN QUERY SELECT (v_current < v_plan_domains), v_current, v_plan_domains;
END;
$$;

-- 2. Update column defaults so new signups get free tier automatically
ALTER TABLE public.profiles
  ALTER COLUMN plan_domains SET DEFAULT 1,
  ALTER COLUMN plan_scans_limit SET DEFAULT 3;

-- 3. Backfill existing plan='none' users who currently have 0 limits
UPDATE public.profiles
   SET plan_domains = 1,
       plan_scans_limit = 3
 WHERE plan = 'none'
   AND plan_domains = 0;
