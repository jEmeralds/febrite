import { supabase } from "./supabase";

export const PERIOD_TYPES = {
  week:    { label: "Week",    minEntries: 4,   days: 7   },
  month:   { label: "Month",   minEntries: 15,  days: 30  },
  quarter: { label: "Quarter", minEntries: 50,  days: 90  },
  year:    { label: "Year",    minEntries: 200, days: 365 },
};

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
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
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

export function getWeekRange(date) {
  const start = startOfWeek(date);
  const end   = new Date(start);
  end.setDate(end.getDate() + 6);
  const yr = start.getFullYear();
  return {
    start: isoDate(start), end: isoDate(end),
    label: `Week of ${shortDate(start)} – ${shortDate(end)}, ${yr}`,
    key: `week:${yr}-W${String(weekNumber(start)).padStart(2, "0")}`,
  };
}

export function getMonthRange(date) {
  const d     = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: isoDate(start), end: isoDate(end),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    key: `month:${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export function getQuarterRange(date) {
  const d     = new Date(date);
  const q     = Math.floor(d.getMonth() / 3);
  const start = new Date(d.getFullYear(), q * 3, 1);
  const end   = new Date(d.getFullYear(), q * 3 + 3, 0);
  return {
    start: isoDate(start), end: isoDate(end),
    label: `Q${q + 1} ${start.getFullYear()}`,
    key: `quarter:${start.getFullYear()}-Q${q + 1}`,
  };
}

export function getYearRange(date) {
  const d     = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const end   = new Date(d.getFullYear(), 11, 31);
  return {
    start: isoDate(start), end: isoDate(end),
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

export function shiftRange(type, currentRange, direction = -1) {
  const ref = new Date(currentRange.start);
  switch (type) {
    case "week":    ref.setDate(ref.getDate() + 7 * direction); break;
    case "month":   ref.setMonth(ref.getMonth() + direction); break;
    case "quarter": ref.setMonth(ref.getMonth() + 3 * direction); break;
    case "year":    ref.setFullYear(ref.getFullYear() + direction); break;
  }
  return getCurrentRange(type, ref);
}

export function rangeIsFuture(range) {
  return range.start > isoDate(new Date());
}

export async function fetchEntriesInRange(userId, range) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("tracking_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("entry_date", range.start)
    .lte("entry_date", range.end)
    .order("entry_date", { ascending: true });
  if (error) { console.error("entries fetch", error); return []; }
  return data || [];
}

export function assessReadiness(entries, type) {
  const minNeeded = PERIOD_TYPES[type]?.minEntries ?? 4;
  const logged    = entries.length;
  const ready     = logged >= minNeeded;
  let message;
  if (ready)         message = `Based on ${logged} check-ins.`;
  else if (!logged)  message = `No check-ins logged in this period.`;
  else               message = `${logged} of ${minNeeded} check-ins needed for a full report.`;
  return { ready, logged, minNeeded, message };
}

function avg(arr, key) {
  const vals = arr.map((e) => e[key]).filter((v) => v != null && !isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function counts(arr) {
  const c = {};
  for (const v of arr) { if (v != null) c[v] = (c[v] || 0) + 1; }
  return c;
}

/* Severity labels for the report */
export const SEVERITY_LABEL = { 1: "Mild", 2: "Moderate", 3: "Severe" };

export function computeStats(entries) {
  const moodAvg           = avg(entries, "mood");
  const energyAvg         = avg(entries, "energy");
  const sleepAvg          = avg(entries, "sleep_hours");
  const waterAvg          = avg(entries, "water_glasses");
  const workStressAvg     = avg(entries, "work_stress");
  const personalStressAvg = avg(entries, "personal_stress");

  const movedDays = entries.filter((e) => e.moved).length;
  const movedPct  = entries.length ? Math.round((movedDays / entries.length) * 100) : null;

  // Symptom frequency + average severity
  const symptomCountMap    = {};
  const symptomSeverityMap = {};
  for (const e of entries) {
    for (const s of (e.symptoms || [])) {
      symptomCountMap[s] = (symptomCountMap[s] || 0) + 1;
      const sev = (e.symptom_severity || {})[s];
      if (sev != null) {
        symptomSeverityMap[s] = symptomSeverityMap[s] || [];
        symptomSeverityMap[s].push(sev);
      }
    }
  }
  const topSymptoms = Object.entries(symptomCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => {
      const sevVals = symptomSeverityMap[symptom] || [];
      const avgSev  = sevVals.length ? sevVals.reduce((a, b) => a + b, 0) / sevVals.length : null;
      return {
        symptom, count,
        pct:    Math.round((count / entries.length) * 100),
        avgSev,
        sevLabel: avgSev ? SEVERITY_LABEL[Math.round(avgSev)] : null,
      };
    });

  // Flow intensity breakdown (menstrual entries only)
  const flowEntries = entries.filter((e) => e.flow_intensity);
  const flowCounts  = counts(flowEntries.map((e) => e.flow_intensity));

  // Phase distribution
  const phaseCounts    = counts(entries.map((e) => e.cycle_phase).filter(Boolean));
  const phaseTotal     = Object.values(phaseCounts).reduce((a, b) => a + b, 0);
  const phaseBreakdown = Object.entries(phaseCounts).map(([phase, count]) => ({
    phase, count,
    pct: phaseTotal ? Math.round((count / phaseTotal) * 100) : 0,
  }));

  // Mood + energy by phase
  const moodByPhase   = {};
  const energyByPhase = {};
  for (const e of entries) {
    if (!e.cycle_phase) continue;
    moodByPhase[e.cycle_phase]   = moodByPhase[e.cycle_phase]   || [];
    energyByPhase[e.cycle_phase] = energyByPhase[e.cycle_phase] || [];
    if (e.mood   != null) moodByPhase[e.cycle_phase].push(e.mood);
    if (e.energy != null) energyByPhase[e.cycle_phase].push(e.energy);
  }
  const moodByPhaseAvg = Object.fromEntries(
    Object.entries(moodByPhase).map(([p, vals]) => [p, vals.reduce((a, b) => a + b, 0) / vals.length])
  );
  const energyByPhaseAvg = Object.fromEntries(
    Object.entries(energyByPhase).map(([p, vals]) => [p, vals.reduce((a, b) => a + b, 0) / vals.length])
  );

  return {
    moodAvg, energyAvg, sleepAvg, waterAvg,
    workStressAvg, personalStressAvg,
    movedDays, movedPct,
    topSymptoms,
    flowCounts,
    phaseBreakdown,
    moodByPhaseAvg, energyByPhaseAvg,
    daysLogged:  entries.length,
    firstEntry:  entries[0]?.entry_date   || null,
    lastEntry:   entries[entries.length - 1]?.entry_date || null,
  };
}

export const fmtAvg        = (v, suffix = "") => v == null ? "—" : `${v.toFixed(1)}${suffix}`;
export const fmtSleep      = (v) => v == null ? "—" : `${v.toFixed(1)} h`;
export const fmtMoodEnergy = (v) => v == null ? "—" : `${v.toFixed(1)} / 5`;
