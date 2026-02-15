-- Waitlist emails table
create table if not exists public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enable RLS with no public policies — only service_role can insert
alter table public.waitlist_emails enable row level security;
