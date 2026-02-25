-- Outreach batch tracking
CREATE TABLE IF NOT EXISTS outreach_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES outreach_batches(id) ON DELETE CASCADE,
  url text NOT NULL,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  score int,
  emails text[] DEFAULT '{}',
  error text,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  scan_results jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_entries_domain ON outreach_entries(domain);
CREATE INDEX IF NOT EXISTS idx_outreach_entries_batch ON outreach_entries(batch_id);

ALTER TABLE outreach_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_batches_all" ON outreach_batches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner_entries_all" ON outreach_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM outreach_batches b WHERE b.id = outreach_entries.batch_id AND b.user_id = auth.uid()));
