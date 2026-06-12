-- =============================================================================
--  FeBrite — schema v3 patch
--  Adds the missing daily check-in dimensions to tracking_entries.
--  Additive and idempotent.
-- =============================================================================

alter table public.tracking_entries add column if not exists energy          int check (energy between 1 and 5);
alter table public.tracking_entries add column if not exists work_stress     int check (work_stress between 1 and 5);
alter table public.tracking_entries add column if not exists personal_stress int check (personal_stress between 1 and 5);
