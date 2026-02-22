-- =============================================================================
-- Security Hardening v3 (2026-02-22)
-- 1. Add badge_enabled column to projects (opt-in for public badge)
-- 2. Fix handle_new_user free tier defaults (plan_domains=1, plan_scans_limit=3)
-- =============================================================================

-- 1. Add badge_enabled to projects (default false = opt-in)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Fix handle_new_user to give free tier users 1 project + 3 scans
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
