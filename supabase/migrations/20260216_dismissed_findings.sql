-- Finding Dismissal System
-- Allows users to dismiss (hide) scan findings as false positives or accepted risks.

CREATE TABLE public.dismissed_findings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES public.scans(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  reason text NOT NULL,
  note text,
  scope text NOT NULL DEFAULT 'project',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id, fingerprint)
);

ALTER TABLE public.dismissed_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals" ON public.dismissed_findings
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookups when loading a project's dismissed findings
CREATE INDEX idx_dismissed_findings_project ON public.dismissed_findings(user_id, project_id);
