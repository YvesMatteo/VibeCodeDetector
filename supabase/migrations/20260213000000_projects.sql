-- ============================================================
-- Projects table: persistent project-based scanning
-- ============================================================

CREATE TABLE public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  github_repo text,
  backend_type text DEFAULT 'none' CHECK (backend_type IN ('none','supabase','firebase','convex')),
  backend_url text,
  supabase_pat text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE UNIQUE INDEX idx_projects_user_url ON public.projects(user_id, url);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_projects_updated_at();

-- ============================================================
-- Add project_id to scans
-- ============================================================

ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON public.scans(project_id);

-- ============================================================
-- check_project_limit RPC
-- Returns: { allowed: bool, current: int, limit: int }
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_project_limit(p_user_id uuid)
RETURNS TABLE(allowed boolean, current_count int, project_limit int)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_plan_domains int;
  v_current int;
BEGIN
  SELECT plan, plan_domains
    INTO v_plan, v_plan_domains
    FROM public.profiles
   WHERE id = p_user_id;

  IF v_plan IS NULL OR v_plan = 'none' THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  SELECT count(*)::int INTO v_current
    FROM public.projects
   WHERE projects.user_id = p_user_id;

  RETURN QUERY SELECT (v_current < v_plan_domains), v_current, v_plan_domains;
END;
$$;

-- ============================================================
-- Data migration: auto-create projects from existing scans
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v_project_id uuid;
  v_hostname text;
BEGIN
  -- For each distinct (user_id, hostname) from scans
  FOR r IN
    SELECT DISTINCT s.user_id,
           substring(s.url from '://([^/]+)') AS hostname
      FROM public.scans s
     WHERE s.project_id IS NULL
       AND s.url IS NOT NULL
       AND substring(s.url from '://([^/]+)') IS NOT NULL
  LOOP
    v_hostname := r.hostname;

    -- Insert project if it doesn't exist
    INSERT INTO public.projects (user_id, name, url)
    VALUES (r.user_id, v_hostname, 'https://' || v_hostname)
    ON CONFLICT (user_id, url) DO NOTHING
    RETURNING id INTO v_project_id;

    -- If it already existed, fetch the id
    IF v_project_id IS NULL THEN
      SELECT id INTO v_project_id
        FROM public.projects
       WHERE projects.user_id = r.user_id AND projects.url = 'https://' || v_hostname;
    END IF;

    -- Link scans to this project
    IF v_project_id IS NOT NULL THEN
      UPDATE public.scans
         SET project_id = v_project_id
       WHERE scans.user_id = r.user_id
         AND substring(scans.url from '://([^/]+)') = v_hostname
         AND scans.project_id IS NULL;
    END IF;
  END LOOP;
END;
$$;
