-- Add progress tracking columns to scans table
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS scanners_completed integer DEFAULT 0 NOT NULL;
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS scanners_total integer DEFAULT 0 NOT NULL;

-- Enable Supabase Realtime for the scans table so clients can subscribe to progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;
