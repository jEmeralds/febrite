import { supabase } from "./supabase";

/* reports.js
   ----------------------------------------------------------------
   The foundation of the Reports & Insights feature.

   Three jobs:
   1. PERIOD MATH — given a date and a period type, compute the
      start/end dates and a human label ("Week of Jun 9-15, 2026").
      Supports prev/next navigation in any direction so a user can
      browse back through their history.
   2. READINESS — given the entries in a period, decide whether
      there's enough data to call it a "report" vs an "early
      reading." Thresholds are deliberately conservative.
   3. STATS — given entries, compute averages, frequencies, and
      patterns. Pure data work, no Gemini. Used by ReportsPanel.

   What this file does NOT do:
   - Narrative generation (that's Gemini, next phase)
   - PDF rendering (browser-native print, handled in the component)
   - Trend comparisons (next phase, needs two periods)
*/

/* ============================================================
   PERIOD TYPES
   Each describes a unit of time, a minimum entries threshold to
   be considered "report-ready," and how to compute its range.
   ============================================================ */
export const PERIOD_TYPES = {
  week:    { label: "Week",    minEntries: 4,   days: 7 },
  month:   { label: "Month",   minEntries: 15,  days: 30 },
  quarter: { label: "Quarter", minEntries: 50,  days: 90 },
  year:    { label: "Year",    minEntries: 200, days: 365 },
};

/* ============================================================
   PERIOD RANGE COMPUTATION
   All functions return { start, end, label, key } where:
   - start, end are YYYY-MM-DD strings (inclusive)
   - label is a human-readable string
   - key is a stable ID for caching ("week:2026-W24")
   ============================================================ */

// Returns the Monday of the week containing `date`, in local time.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const offset = day === 0 ? -6 : 1 - day; // shift so Monday is start
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekNumber(d) {
  // ISO week number — used for stable keys
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function getWeekRange(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const yr = start.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: `Week of ${shortDate(start)} – ${shortDate(end)}${sameYear ? `, ${yr}` : ""}`,
    key: `week:${yr}-W${String(weekNumber(start)).padStart(2, "0")}`,
  };
}

export function getMonthRange(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    key: `month:${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export function getQuarterRange(date) {
  const d = new Date(date);
  const q = Math.floor(d.getMonth() / 3); // 0..3
  const start = new Date(d.getFullYear(), q * 3, 1);
  const end = new Date(d.getFullYear(), q * 3 + 3, 0);
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: `Q${q + 1} ${start.getFullYear()}`,
    key: `quarter:${start.getFullYear()}-Q${q + 1}`,
  };
}

export function getYearRange(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return {
    start: isoDate(start),
    end: isoDate(end),
    label: String(d.getFullYear()),
    key: `year:${d.getFullYear()}`,
  };
}

export function getCurrentRange(type, date = new Date()) {
  switch (type) {
    case "week":    return getWeekRange(date);
    case "month":   return getMonthRange(date);
    case "quarter": return getQuarterRange(date);
    case "year":    return getYearRange(date);
    default:        return getWeekRange(date);
  }
}

/* Returns the range one step earlier (or later if direction = 1). */
export function shiftRange(type, currentRange, direction = -1) {
  const ref = new Date(currentRange.start);
  switch (type) {
    case "week":    ref.setDate(ref.getDate() + 7 * direction); break;
    case "month":   ref.setMonth(ref.getMonth() + 1 * direction); break;
    case "quarter": ref.setMonth(ref.getMonth() + 3 * direction); break;
    case "year":    ref.setFullYear(ref.getFullYear() + 1 * direction); break;
  }
  return getCurrentRange(type, ref);
}

/* Returns true if the given range starts in the future (after today).
   Used to disable the "next" button when there's no future to navigate to. */
export function rangeIsFuture(range) {
  const today = isoDate(new Date());
  return range.start > today;
}

/* ============================================================
   FETCH ENTRIES FOR A RANGE
   ============================================================ */

export async function fetchEntriesInRange(userId, range) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("tracking_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("entry_date", range.start)
    .lte("entry_date", range.end)
    .order("entry_date", { ascending: true });
  if (error) {
    console.error("entries fetch", error);
    return [];
  }
  return data || [];
}

/* ============================================================
   READINESS
   "How much data is in this period vs. how much is needed
   to call it a real report?"
   ============================================================ */

export function assessReadiness(entries, type) {
  const minNeeded = PERIOD_TYPES[type]?.minEntries ?? 4;
  const logged = entries.length;
  const ready = logged >= minNeeded;
  let message;
  if (ready) {
    message = `Based on ${logged} check-ins.`;
  } else if (logged === 0) {
    message = `No check-ins logged in this period.`;
  } else {
    message = `${logged} of ${minNeeded} check-ins needed for a full report.`;
  }
  return { ready, logged, minNeeded, message };
}

/* ============================================================
   STATS
   Pure computation over the entries in a period. Used for both
   the in-app summary and the printable doctor-prep version.
   ============================================================ */

function avg(arr, key) {
  const vals = arr.map((e) => e[key]).filter((v) => v != null && !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function counts(arr) {
  const c = {};
  for (const v of arr) {
    if (v == null) continue;
    c[v] = (c[v] || 0) + 1;
  }
  return c;
}

export function computeStats(entries) {
  const moodAvg   = avg(entries, "mood");
  const energyAvg = avg(entries, "energy");
  const sleepAvg  = avg(entries, "sleep_hours");
  const waterAvg  = avg(entries, "water_glasses");
  const workStressAvg     = avg(entries, "work_stress");
  const personalStressAvg = avg(entries, "personal_stress");

  // % of logged days where user moved
  const movedDays = entries.filter((e) => e.moved).length;
  const movedPct = entries.length ? Math.round((movedDays / entries.length) * 100) : null;

  // Symptom frequency — flatten arrays and count
  const allSymptoms = entries.flatMap((e) => e.symptoms || []);
  const symptomCounts = counts(allSymptoms);
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      symptom,
      count,
      pct: Math.round((count / entries.length) * 100),
    }));

  // Phase distribution (if user tracks cycles)
  const phaseCounts = counts(entries.map((e) => e.cycle_phase).filter(Boolean));
  const phaseTotal = Object.values(phaseCounts).reduce((a, b) => a + b, 0);
  const phaseBreakdown = Object.entries(phaseCounts).map(([phase, count]) => ({
    phase,
    count,
    pct: phaseTotal ? Math.round((count / phaseTotal) * 100) : 0,
  }));

  // Mood/energy by phase — only meaningful if user tracks cycles
  const moodByPhase = {};
  const energyByPhase = {};
  for (const e of entries) {
    if (!e.cycle_phase) continue;
    moodByPhase[e.cycle_phase]   = moodByPhase[e.cycle_phase]   || [];
    energyByPhase[e.cycle_phase] = energyByPhase[e.cycle_phase] || [];
    if (e.mood   != null) moodByPhase[e.cycle_phase].push(e.mood);
    if (e.energy != null) energyByPhase[e.cycle_phase].push(e.energy);
  }
  const moodByPhaseAvg = Object.fromEntries(
    Object.entries(moodByPhase).map(([p, vals]) => [p, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null])
  );
  const energyByPhaseAvg = Object.fromEntries(
    Object.entries(energyByPhase).map(([p, vals]) => [p, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null])
  );

  return {
    moodAvg, energyAvg, sleepAvg, waterAvg,
    workStressAvg, personalStressAvg,
    movedDays, movedPct,
    topSymptoms,
    phaseBreakdown,
    moodByPhaseAvg, energyByPhaseAvg,
    daysLogged: entries.length,
    firstEntry: entries[0]?.entry_date || null,
    lastEntry:  entries[entries.length - 1]?.entry_date || null,
  };
}

/* ============================================================
   FORMATTING HELPERS
   Used by both the in-app render and the print version.
   ============================================================ */

export const fmtAvg = (v, suffix = "") =>
  v == null ? "—" : `${v.toFixed(1)}${suffix}`;

export const fmtSleep = (v) =>
  v == null ? "—" : `${v.toFixed(1)} h`;

export const fmtMoodEnergy = (v) =>
  v == null ? "—" : `${v.toFixed(1)} / 5`;
