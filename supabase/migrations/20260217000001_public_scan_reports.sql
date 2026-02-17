-- Add public_id column to scans for shareable reports
ALTER TABLE scans ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Index for fast lookup by public_id
CREATE INDEX IF NOT EXISTS idx_scans_public_id ON scans (public_id) WHERE public_id IS NOT NULL;
