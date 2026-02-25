-- Store generated email content for review/debugging
ALTER TABLE outreach_entries ADD COLUMN IF NOT EXISTS email_subject text;
ALTER TABLE outreach_entries ADD COLUMN IF NOT EXISTS email_body text;
