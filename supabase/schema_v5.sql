-- FeBrite schema v5
-- 1. Add reminders_enabled to profiles (default ON, opt-out via Settings)
-- 2. Add a SECURITY DEFINER function so an authenticated user can
--    delete their own auth account (cascades to profiles + tracking_entries)

-- Idempotent: safe to re-run on environments that already applied it.
alter table public.profiles
  add column if not exists reminders_enabled boolean not null default true;

-- Function deletes the *currently authenticated user* from auth.users.
-- Cascading FKs on profiles + tracking_entries will clean up the rest.
-- SECURITY DEFINER lets it run with elevated privileges, but the
-- WHERE clause locks it to the caller's own id — they cannot delete
-- anyone else.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- Explicit table deletions first in case CASCADE isn't set on every FK
  delete from public.tracking_entries where user_id = uid;
  delete from public.profiles where id = uid;
  -- Then the auth row itself
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
