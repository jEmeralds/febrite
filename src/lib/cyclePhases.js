import { supabase } from "./supabase";

/* =============================================================================
   cyclePhases.js
   Real, user-logged cycle phases — no fixed-length preset math.

   A "phase log" is: { id, phase, start_date, end_date }.
   end_date === null means the phase is still open (ongoing).

   currentPhase(userId) tells you what's true TODAY by looking at the logs
   themselves, never by counting days from a single start date + assumed
   cycle length. Two different users (or the same user in two different
   cycles) can have completely different phase lengths and it just works.
============================================================================= */

const PHASES = ["menstrual", "follicular", "ovulation", "luteal"];
// Local Y-M-D string — NOT toISOString(), which converts to UTC first and
// silently shifts the date by a day for anyone east of UTC (e.g. Doha, UTC+3).
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ---------- reads ---------- */

// All phase logs in a date range (inclusive), oldest first.
// Used to paint a calendar month and to compute historical averages.
export async function getPhaseLogs(userId, fromDate, toDate) {
  try {
    let q = supabase
      .from("cycle_phase_logs")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: true });
    if (fromDate) q = q.gte("start_date", fromDate);
    // include logs that started before the window but end inside/after it
    const { data, error } = await q;
    if (error) throw error;
    if (!toDate) return data;
    return data.filter((log) => !log.end_date || log.start_date <= toDate);
  } catch (e) {
    console.error("getPhaseLogs failed", e);
    return [];
  }
}

// The single open (end_date IS NULL) log, if any — this IS "today's phase."
export async function getOpenPhaseLog(userId) {
  try {
    const { data, error } = await supabase
      .from("cycle_phase_logs")
      .select("*")
      .eq("user_id", userId)
      .is("end_date", null)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.error("getOpenPhaseLog failed", e);
    return null;
  }
}

// What phase is she in today, and for how many days has she been in it?
// This replaces currentCyclePhase() from cycleMath.js. No cycle length,
// no modular arithmetic — just "what did she actually log."
export async function currentPhase(userId) {
  const open = await getOpenPhaseLog(userId);
  if (!open) return null;
  const start = new Date(open.start_date + "T00:00:00");
  const days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  return { phase: open.phase, dayInPhase: days, startDate: open.start_date, logId: open.id };
}

/* ---------- writes ---------- */

// Start a new phase. Closes out whatever phase was previously open by
// setting its end_date to the day before the new phase's start_date
// (matches the DB's "only one open log" constraint).
export async function startPhase(userId, phase, startDate = todayStr()) {
  if (!PHASES.includes(phase)) throw new Error(`Unknown phase: ${phase}`);
  try {
    const open = await getOpenPhaseLog(userId);
    if (open && open.start_date < startDate) {
      const dayBefore = new Date(startDate + "T00:00:00");
      dayBefore.setDate(dayBefore.getDate() - 1);
      await endPhase(open.id, todayStr(dayBefore));
    } else if (open) {
      // new phase starts same day or earlier than the currently-open one —
      // treat as a correction: just delete the now-superseded open log
      await deletePhaseLog(open.id);
    }
    const { data, error } = await supabase
      .from("cycle_phase_logs")
      .insert({ user_id: userId, phase, start_date: startDate, end_date: null })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("startPhase failed", e);
    throw e;
  }
}

// Close out a phase — either the open one, or a past one being corrected.
export async function endPhase(logId, endDate = todayStr()) {
  try {
    const { data, error } = await supabase
      .from("cycle_phase_logs")
      .update({ end_date: endDate })
      .eq("id", logId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("endPhase failed", e);
    throw e;
  }
}

// Directly log a complete phase range (used by the calendar's drag-select —
// e.g. "menstrual, June 3 to June 8"). Does not touch other logs unless the
// new range overlaps an existing one, in which case the overlapping log's
// edges are trimmed rather than left to silently conflict.
export async function logPhaseRange(userId, phase, startDate, endDate) {
  if (!PHASES.includes(phase)) throw new Error(`Unknown phase: ${phase}`);
  if (endDate < startDate) throw new Error("end_date cannot be before start_date");
  try {
    const overlapping = await getPhaseLogs(userId, null, null);
    for (const log of overlapping) {
      const logEnd = log.end_date || todayStr();
      const overlaps = log.start_date <= endDate && logEnd >= startDate;
      if (!overlaps) continue;
      if (log.start_date >= startDate && logEnd <= endDate) {
        // fully covered by the new range — remove it
        await deletePhaseLog(log.id);
      } else if (log.start_date < startDate && logEnd > endDate) {
        // new range sits inside an existing one — trim the existing one to
        // end right before the new range starts (keeps the earlier part)
        const before = new Date(startDate + "T00:00:00");
        before.setDate(before.getDate() - 1);
        await endPhase(log.id, todayStr(before));
      } else if (log.start_date < startDate) {
        const before = new Date(startDate + "T00:00:00");
        before.setDate(before.getDate() - 1);
        await endPhase(log.id, todayStr(before));
      } else if (logEnd > endDate) {
        await editPhaseLog(log.id, { start_date: nextDay(endDate) });
      }
    }
    const { data, error } = await supabase
      .from("cycle_phase_logs")
      .insert({ user_id: userId, phase, start_date: startDate, end_date: endDate })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("logPhaseRange failed", e);
    throw e;
  }
}

export async function editPhaseLog(logId, patch) {
  try {
    const { data, error } = await supabase
      .from("cycle_phase_logs")
      .update(patch)
      .eq("id", logId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("editPhaseLog failed", e);
    throw e;
  }
}

export async function deletePhaseLog(logId) {
  try {
    const { error } = await supabase.from("cycle_phase_logs").delete().eq("id", logId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("deletePhaseLog failed", e);
    throw e;
  }
}

/* ---------- derived stats (display-only, never used to predict/override) ---------- */

// Average length of each phase type + average full-cycle length, computed
// purely from what's actually been logged. Returns null fields until there's
// enough history — never falls back to a guessed default like 28/5.
export function computeCycleStats(logs) {
  const closed = logs.filter((l) => l.end_date);
  const lengthOf = (l) => {
    const d = (new Date(l.end_date) - new Date(l.start_date)) / 86400000 + 1;
    return d;
  };

  const byPhase = {};
  for (const p of PHASES) {
    const list = closed.filter((l) => l.phase === p).map(lengthOf);
    byPhase[p] = list.length ? { avgDays: avg(list), count: list.length } : null;
  }

  // Full-cycle length: menstrual-start to next menstrual-start
  const menstrualStarts = logs
    .filter((l) => l.phase === "menstrual")
    .map((l) => l.start_date)
    .sort();
  const cycleLengths = [];
  for (let i = 1; i < menstrualStarts.length; i++) {
    const d = (new Date(menstrualStarts[i]) - new Date(menstrualStarts[i - 1])) / 86400000;
    if (d > 0 && d < 90) cycleLengths.push(d); // sanity bound, not a preset
  }

  return {
    byPhase,
    avgCycleLength: cycleLengths.length ? avg(cycleLengths) : null,
    cyclesObserved: cycleLengths.length,
  };
}

function avg(nums) {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return todayStr(d);
}

export { PHASES };

// Sync version of currentPhase() for callers that already have the full
// logs array loaded (e.g. Home.jsx, which fetches once and derives
// everything from the same list — keeping every card on the page in
// agreement instead of each firing its own DB call).
export function derivePhaseNow(logs, todayStr) {
  const open = logs.find((l) => !l.end_date);
  if (!open) return null;
  const start = new Date(open.start_date + "T00:00:00");
  const today = new Date((todayStr || open.start_date) + "T00:00:00");
  const days = Math.floor((today - start) / 86400000) + 1;
  return { phase: open.phase, dayInPhase: days, startDate: open.start_date, logId: open.id };
}

/* ---------- current-cycle wheel data (real segments, no fixed math) ---------- */

// Builds the shape of THIS cycle so far, purely from what's been logged.
// Finds the most recent menstrual start on/before today, then walks every
// log from there forward. Gaps between logs (days nothing was recorded)
// are represented honestly as "unlogged" segments rather than silently
// compressed away or guessed at — the wheel should never claim to know
// something that wasn't actually logged.
export function buildCurrentCycleWheelData(logs, todayStr) {
  const sorted = [...logs].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const menstrualStarts = sorted.filter((l) => l.phase === "menstrual").map((l) => l.start_date);
  const cycleStart = [...menstrualStarts].reverse().find((d) => d <= todayStr);
  if (!cycleStart) return null;

  const dayIndex = (dateStr) =>
    Math.round((new Date(dateStr + "T00:00:00") - new Date(cycleStart + "T00:00:00")) / 86400000) + 1;
  const totalDays = dayIndex(todayStr);
  if (totalDays < 1) return null;

  const relevant = sorted.filter((l) => l.start_date >= cycleStart && l.start_date <= todayStr);

  const segments = [];
  let cursor = 1;
  for (const log of relevant) {
    const segStart = dayIndex(log.start_date);
    if (segStart > cursor) {
      segments.push({ phase: null, startDay: cursor, endDay: segStart - 1 }); // unlogged gap
    }
    const rawEnd = log.end_date ? dayIndex(log.end_date) : totalDays;
    const segEnd = Math.min(Math.max(rawEnd, segStart), totalDays);
    segments.push({ phase: log.phase, startDay: Math.max(segStart, cursor), endDay: segEnd, logId: log.id });
    cursor = segEnd + 1;
  }
  if (cursor <= totalDays) {
    segments.push({ phase: null, startDay: cursor, endDay: totalDays });
  }

  return { cycleStart, totalDays, segments };
}
