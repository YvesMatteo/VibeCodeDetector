-- Backfill profiles for existing users
insert into public.profiles (id, credits)
select id, 0 from auth.users
where id not in (select id from public.profiles);

-- Verify the count
select count(*) from public.profiles;
