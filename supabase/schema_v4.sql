-- =============================================================================
--  FeBrite — schema v4 patch
--  Practitioners directory: enums, table, RLS, and a smarter handle_new_user
--  trigger that creates the right kind of profile based on signup metadata.
--  Specialty IDs match src/data/specialties.js so the frontend and DB are aligned.
-- =============================================================================

-- Enums (idempotent)
do $$ begin
  create type practitioner_specialty as enum (
    'gynae', 'gp', 'psychiatry', 'psychology', 'counselling',
    'nutrition', 'physio', 'midwife', 'doula', 'lactation',
    'sextherapy', 'fertility', 'endocrinology'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_model as enum ('probono', 'paid', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending', 'verified', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

-- Practitioners table
create table if not exists public.practitioners (
  id                      uuid primary key references auth.users on delete cascade,
  display_name            text not null default '',
  credentials             text,                            -- e.g. "MD, MMed"
  specialty               practitioner_specialty not null default 'gp',
  secondary_specialties   practitioner_specialty[] default '{}',
  bio                     text,
  photo_url               text,
  languages               text[] default array['English']::text[],
  location                text,                            -- "Nairobi, Kenya"
  years_practising        int,
  registration_number     text,
  registration_authority  text,
  fee_model               fee_model not null default 'probono',
  hourly_rate_kes         int,
  probono_slots_per_month int,
  contact_email           text,
  contact_phone           text,
  website                 text,
  verification_status     verification_status not null default 'pending',
  verification_notes      text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.practitioners enable row level security;

drop policy if exists "pro_self_select"      on public.practitioners;
drop policy if exists "pro_public_directory" on public.practitioners;
drop policy if exists "pro_self_insert"      on public.practitioners;
drop policy if exists "pro_self_update"      on public.practitioners;

create policy "pro_self_select"      on public.practitioners for select using (auth.uid() = id);
create policy "pro_public_directory" on public.practitioners for select using (verification_status = 'verified');
create policy "pro_self_insert"      on public.practitioners for insert with check (auth.uid() = id);
create policy "pro_self_update"      on public.practitioners for update using  (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_practitioners_updated_at on public.practitioners;
create trigger trg_practitioners_updated_at before update on public.practitioners
  for each row execute function public.set_updated_at();

-- Updated handle_new_user — branches on is_pro metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  if coalesce(new.raw_user_meta_data->>'is_pro', 'false') = 'true' then
    insert into public.practitioners (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
    on conflict (id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
