-- =============================================================================
--  FeBrite — schema v2 patch
--  Adds the bio/profile fields used by the new /profile page.
--  Purely additive and idempotent (uses IF NOT EXISTS) so it's safe to run
--  against the existing database without touching what's already there.
-- =============================================================================

alter table public.profiles add column if not exists pronouns          text;
alter table public.profiles add column if not exists date_of_birth     date;
alter table public.profiles add column if not exists phone             text;
alter table public.profiles add column if not exists city              text;
alter table public.profiles add column if not exists country           text;

alter table public.profiles add column if not exists goals             text[]  default '{}';
alter table public.profiles add column if not exists conditions        text[]  default '{}';
alter table public.profiles add column if not exists allergies         text[]  default '{}';
alter table public.profiles add column if not exists medications       jsonb   default '[]';

alter table public.profiles add column if not exists cycle_start_date  date;
alter table public.profiles add column if not exists cycle_length      int     default 28;
alter table public.profiles add column if not exists period_length     int     default 5;
alter table public.profiles add column if not exists birth_control     text;

alter table public.profiles add column if not exists emergency_contact jsonb;     -- {name, relationship, phone}
alter table public.profiles add column if not exists regular_doctor    jsonb;     -- {name, clinic, phone}
alter table public.profiles add column if not exists support_people    jsonb   default '[]';  -- [{name, relationship, when_to_reach, phone}]

alter table public.profiles add column if not exists workout_prefs     text[]  default '{}';
alter table public.profiles add column if not exists dietary_prefs     text[]  default '{}';

alter table public.profiles add column if not exists notification_prefs jsonb;

-- That's it. No new tables, no new policies — existing RLS already covers
-- these columns since they live on the profiles table.
