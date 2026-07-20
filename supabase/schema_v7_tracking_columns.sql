-- =============================================================================
--  febrite — tracking_entries column additions (v7)
--  The Tracking UI reads/writes energy, work_stress, personal_stress,
--  flow_intensity, and symptom_severity, but the original schema never
--  defined them. Adding them here so saveTodayEntry() can actually persist
--  everything the check-in form collects.
-- =============================================================================

alter table public.tracking_entries
  add column if not exists energy           int  check (energy between 1 and 5),
  add column if not exists work_stress      int  check (work_stress between 1 and 5),
  add column if not exists personal_stress  int  check (personal_stress between 1 and 5),
  add column if not exists flow_intensity   text,                    -- 'spotting'|'light'|'medium'|'heavy'
  add column if not exists symptom_severity jsonb not null default '{}'::jsonb; -- { "Cramps": 2, ... }
