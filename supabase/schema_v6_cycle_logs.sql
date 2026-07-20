-- =============================================================================
--  febrite — Cycle phase logs (v6)
--  Replaces the fixed cycle_length/period_length math with REAL, user-entered
--  phase ranges. A phase is whatever the user says it is, for however many
--  days she says it lasted. No preset 28-day model anywhere in this table.
-- =============================================================================

do $$ begin
  create type cycle_phase_name as enum ('menstrual','follicular','ovulation','luteal');
exception when duplicate_object then null; end $$;

create table if not exists public.cycle_phase_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  phase      cycle_phase_name not null,
  start_date date not null,
  end_date   date,                          -- null = ongoing (phase hasn't been closed out yet)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= start_date)
);

drop trigger if exists trg_cycle_phase_logs_updated on public.cycle_phase_logs;
create trigger trg_cycle_phase_logs_updated before update on public.cycle_phase_logs
  for each row execute function set_updated_at();

create index if not exists idx_cycle_phase_logs_user_start
  on public.cycle_phase_logs(user_id, start_date desc);

-- RLS: a user owns and fully controls only her own phase logs
alter table public.cycle_phase_logs enable row level security;

create policy "cycle_phase_logs_owner" on public.cycle_phase_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
--  Guardrail: prevent two OPEN (end_date is null) logs for the same user.
--  Starting a new phase should always close out whatever was previously open —
--  the app enforces this in cyclePhases.js, this is the DB-level backstop.
-- =============================================================================
create unique index if not exists uniq_one_open_phase_per_user
  on public.cycle_phase_logs(user_id)
  where (end_date is null);

-- =============================================================================
--  NOTE ON MIGRATION FROM OLD MODEL
--  profiles.cycle_start_date / cycle_length / period_length are left in place
--  (harmless, unused going forward) so nothing breaks for existing users while
--  you migrate. They are no longer read by currentCyclePhase() after this
--  patch — real phase state now comes entirely from cycle_phase_logs.
-- =============================================================================
