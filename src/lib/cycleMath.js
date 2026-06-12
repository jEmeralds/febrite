/* Compute the user's CURRENT cycle phase from her cycle data.
   This is the source of truth for "where she is today" — not the
   `cycle_phase` field on a tracking entry, which only records what
   she said WHEN SHE LOGGED that day.

   If the stored cycle_start_date is in the future (common with locale
   confusion in date inputs — DD/MM vs MM/DD), we walk back by full
   cycle lengths until we land on a real past start. The math still
   works; the user isn't punished for a date-format typo. */
export function currentCyclePhase(profile, today = new Date()) {
  if (!profile?.cycle_start_date) return null;
  let start = new Date(profile.cycle_start_date);
  if (Number.isNaN(start.getTime())) return null;

  const cycleLen = Math.max(20, Math.min(45, Number(profile.cycle_length) || 28));
  const periodLen = Math.max(2, Math.min(10, Number(profile.period_length) || 5));
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Handle future-dated cycle starts (locale confusion / typo) by
  // walking back to the most recent past start in this cycle's rhythm.
  let guard = 0;
  while (start.getTime() > today.getTime() && guard++ < 100) {
    start = new Date(start.getTime() - cycleLen * DAY_MS);
  }

  const ms = today.getTime() - start.getTime();
  if (ms < 0) return null;
  const dayInCycle = (Math.floor(ms / DAY_MS) % cycleLen) + 1;

  // Ovulation is biologically ~14 days BEFORE the next period (not from day 1)
  const ovulationDay = cycleLen - 14;

  let phase;
  if (dayInCycle <= periodLen) phase = "Menstrual";
  else if (dayInCycle >= ovulationDay - 1 && dayInCycle <= ovulationDay + 1) phase = "Ovulation";
  else if (dayInCycle < ovulationDay) phase = "Follicular";
  else phase = "Luteal";

  const daysUntilPeriod = cycleLen - dayInCycle + 1;
  return { phase, dayInCycle, cycleLen, daysUntilPeriod };
}

/* Friendly one-line summary for showing to the user or sending to the LLM. */
export function cyclePhaseSummary(profile, today = new Date()) {
  const c = currentCyclePhase(profile, today);
  if (!c) return null;
  return `Currently in ${c.phase} phase — day ${c.dayInCycle} of a ~${c.cycleLen}-day cycle; about ${c.daysUntilPeriod} day(s) until her next period.`;
}
