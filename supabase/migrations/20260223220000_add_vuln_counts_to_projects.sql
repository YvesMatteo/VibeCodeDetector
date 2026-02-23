-- =============================================================================
-- Add vulnerability count columns to projects table
-- =============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS total_findings int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critical_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS high_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medium_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS info_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_score int;
