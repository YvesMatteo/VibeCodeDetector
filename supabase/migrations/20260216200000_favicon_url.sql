-- Add favicon_url to projects for caching site favicons
ALTER TABLE projects ADD COLUMN IF NOT EXISTS favicon_url TEXT;
