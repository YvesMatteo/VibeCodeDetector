-- =============================================================================
-- Add email column to profiles for easy identification in Table Editor
-- =============================================================================

-- 1. Add email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Update handle_new_user to copy email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, plan, plan_domains, plan_scans_limit, plan_scans_used, allowed_domains)
  VALUES (new.id, new.email, 0, 'none', 1, 3, 0, '{}');
  RETURN new;
END;
$$;
