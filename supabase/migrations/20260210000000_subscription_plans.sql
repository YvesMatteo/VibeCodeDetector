-- Add subscription columns to profiles
alter table public.profiles
  add column if not exists plan text default 'none' not null,
  add column if not exists plan_domains integer default 0 not null,
  add column if not exists plan_scans_limit integer default 0 not null,
  add column if not exists plan_scans_used integer default 0 not null,
  add column if not exists plan_period_start timestamptz,
  add column if not exists stripe_subscription_id text,
  add column if not exists allowed_domains text[] default '{}' not null;

-- Update handle_new_user to set subscription defaults
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, credits, plan, plan_domains, plan_scans_limit, plan_scans_used, allowed_domains)
  values (new.id, 0, 'none', 0, 0, 0, '{}');
  return new;
end;
$$;
