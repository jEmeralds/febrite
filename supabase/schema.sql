-- =============================================================================
--  ANWA — Women's Wellness Platform
--  Supabase / PostgreSQL schema (MVP with forward-compatible hooks)
--  Run in Supabase SQL editor. Lean by design: only what Phase 1 needs,
--  plus the cheap structural hooks so Phase 2+ needs no painful migrations.
-- =============================================================================

-- ---------- ENUMS ----------
do $$ begin
  create type life_stage     as enum ('teen','young','mid','meno','elder');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role      as enum ('user','professional','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('draft','in_review','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_source as enum ('editorial','professional');
exception when duplicate_object then null; end $$;

-- ---------- SHARED updated_at TRIGGER ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- =============================================================================
--  PROFILES  (1:1 with auth.users — the only table that references auth.*)
--  Child tables reference public.profiles, never auth.users directly.
-- =============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  life_stage    life_stage,
  role          user_role not null default 'user',   -- HOOK: enables professional/admin later
  locale        text default 'en',
  region        text,                                  -- drives regional resources
  focus_areas   text[] default '{}',                    -- curated interests from onboarding
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end; $$ language plpgsql security definer;
drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
--  CONSENTS  (cookie consent, data sharing, tele-health — one table for all)
-- =============================================================================
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,                 -- 'cookies_analytics' | 'data_sharing' | 'telehealth' ...
  granted      boolean not null default false,
  updated_at   timestamptz not null default now(),
  unique (user_id, consent_type)
);

-- =============================================================================
--  DOMAINS  (the seven professional lenses — drives theming colours)
-- =============================================================================
create table if not exists public.domains (
  slug      text primary key,                 -- 'gynae','medical','psychiatry',...
  label     text not null,
  pro_title text not null,                     -- 'Gynaecologist', 'Registered Dietitian'...
  color     text not null,                     -- theme accent hex used by the frontend
  sort      int  not null default 0
);

insert into public.domains (slug,label,pro_title,color,sort) values
  ('gynae','Reproductive & Gynae','Gynaecologist','#9A4E5B',1),
  ('medical','General Health','Doctor (GP)','#3E6E8C',2),
  ('psychiatry','Mental Health','Psychiatrist','#7A5C9E',3),
  ('psychology','Emotional Wellbeing','Clinical Psychologist','#B25A38',4),
  ('nutrition','Nutrition','Registered Dietitian','#6E9A4E',5),
  ('fitness','Movement & Body','Women''s Health Physio','#C9893F',6),
  ('life','Relationships & Life','Counsellor','#5C6E5A',7)
on conflict (slug) do nothing;

-- =============================================================================
--  CONTENT  (articles — clinician-reviewed, stage-targeted)
-- =============================================================================
create table if not exists public.content (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  domain_slug     text not null references public.domains(slug),
  title           text not null,
  blurb           text,
  body            jsonb not null default '[]',          -- array of paragraph/section blocks
  takeaways       text[] default '{}',
  see_professional text,
  read_minutes    int default 5,
  source          text,                                  -- 'ACOG','WHO','NICE NG23',...
  reviewer_name   text,                                  -- credential surfaced for trust
  reviewer_credential text,
  reviewed_at     date,
  status          content_status not null default 'draft',
  content_source  content_source not null default 'editorial', -- HOOK: 'professional' contributions
  author_id       uuid references public.profiles(id),         -- HOOK: pro-authored content later
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists trg_content_updated on public.content;
create trigger trg_content_updated before update on public.content
  for each row execute function set_updated_at();
create index if not exists idx_content_domain on public.content(domain_slug);
create index if not exists idx_content_status on public.content(status);

-- Many-to-many: one article can target several life stages
create table if not exists public.content_stages (
  content_id uuid not null references public.content(id) on delete cascade,
  stage      life_stage not null,
  primary key (content_id, stage)
);

-- =============================================================================
--  TRACKING  (holistic daily check-in: mind + body + cycle)
-- =============================================================================
create table if not exists public.tracking_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entry_date    date not null default current_date,
  mood          int  check (mood between 1 and 5),
  sleep_hours   numeric(3,1) check (sleep_hours between 0 and 24),
  water_glasses int  check (water_glasses >= 0),
  moved         boolean,
  cycle_phase   text,                          -- 'menstrual','follicular','ovulation','luteal','na'
  symptoms      text[] default '{}',
  note          text,
  created_at    timestamptz not null default now(),
  unique (user_id, entry_date)                  -- one check-in per day, upsert-friendly
);
create index if not exists idx_tracking_user_date on public.tracking_entries(user_id, entry_date desc);

-- =============================================================================
--  RESOURCES  (static crisis/support now; geolocated directory later)
-- =============================================================================
create table if not exists public.resources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null,
  region     text default 'Global',
  contact    text,
  is_dynamic boolean not null default false,    -- HOOK: dynamic clinic/specialist rows later
  lat        numeric, lng numeric,              -- HOOK: geolocation querying later
  sort       int default 0
);

-- =============================================================================
--  PROFESSIONALS  (light hook so the marketplace isn't an afterthought)
--  Intentionally minimal — booking/payments tables are deferred until needed.
-- =============================================================================
create table if not exists public.professionals (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references public.profiles(id) on delete cascade,
  disciplines    text[] default '{}',           -- references domains.slug values
  bio            text,
  verified       boolean not null default false,
  accepts_probono boolean not null default false,
  created_at     timestamptz not null default now()
);

-- =============================================================================
--  ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles         enable row level security;
alter table public.consents         enable row level security;
alter table public.content          enable row level security;
alter table public.content_stages   enable row level security;
alter table public.tracking_entries enable row level security;
alter table public.resources        enable row level security;
alter table public.domains          enable row level security;
alter table public.professionals    enable row level security;

-- Profiles: a user sees and edits only their own row
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

-- Consents: fully owned by the user
create policy "consents_owner" on public.consents
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference data: readable by everyone (anon + authed)
create policy "domains_read"   on public.domains   for select using (true);
create policy "resources_read" on public.resources for select using (true);

-- Content: anyone can read PUBLISHED articles; writes go through service role / admin only
create policy "content_read_published" on public.content for select using (status = 'published');
create policy "content_stages_read"    on public.content_stages for select using (true);

-- Tracking: a user has full control of only their own entries
create policy "tracking_owner" on public.tracking_entries
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Professionals: verified profiles are public; owners manage their own
create policy "pros_read_verified" on public.professionals for select using (verified = true or auth.uid() = profile_id);
create policy "pros_self_manage"   on public.professionals using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- NOTE: editorial content is inserted/updated with the service-role key (server side)
--       or via an admin policy you add when the admin dashboard is built. Keeping
--       write policies out of the client is deliberate and safer.
