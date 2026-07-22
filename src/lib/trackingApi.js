import { supabase } from "./supabase";

/* =============================================================================
   trackingApi.js
   Real Supabase read/write for daily check-in entries (tracking_entries).
   Deliberately NOT named tracking.js/tracking.jsx — that name collided with
   the page component that imports these functions, causing a self-import.
============================================================================= */

// Local Y-M-D string — NOT toISOString(), which converts to UTC first and
// silently shifts the date by a day for anyone east of UTC (e.g. Doha, UTC+3).
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ---------- save (upsert) ---------- */

// Upserts on the (user_id, entry_date) unique key — re-saving the same
// date just updates the existing row. dateStr defaults to today, but any
// caller can pass a past date to log/edit a backdated check-in.
export async function saveTodayEntry(userId, today, dateStr = null) {
  try {
    const row = {
      user_id:          userId,
      entry_date:       dateStr || todayStr(),
      mood:             today.mood,
      sleep_hours:      today.sleep,
      water_glasses:    today.water,
      moved:            today.moved,
      energy:           today.energy,
      work_stress:      today.workStress,
      personal_stress:  today.personalStress,
      cycle_phase:      today.phase,
      symptoms:         today.symptoms,
      flow_intensity:   today.flowIntensity,
      symptom_severity: today.symptomSeverity,
      note:             today.note || null,
    };
    const { data, error } = await supabase
      .from("tracking_entries")
      .upsert(row, { onConflict: "user_id,entry_date" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("saveTodayEntry failed", e);
    throw e;
  }
}

// Fetch a single entry for an arbitrary date — used by the "log a
// different day" flow, since getRecentEntries only covers the last N days
// and backdated entry needs to reach further back (e.g. "last month").
export async function getEntryForDate(userId, dateStr) {
  try {
    const { data, error } = await supabase
      .from("tracking_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", dateStr)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.error("getEntryForDate failed", e);
    return null;
  }
}

/* ---------- read ---------- */

// Most recent N days of entries, oldest first (matches how Tracking.jsx
// consumes it — chartData/streak logic expects ascending order).
export async function getRecentEntries(userId, days = 28) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const { data, error } = await supabase
      .from("tracking_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", todayStr(since))
      .order("entry_date", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getRecentEntries failed", e);
    return [];
  }
}

// Quick boolean check — used by Home/DailyNudge to show a nudge if not logged.
export async function hasCheckedInToday(userId) {
  try {
    const { data, error } = await supabase
      .from("tracking_entries")
      .select("entry_date")
      .eq("user_id", userId)
      .eq("entry_date", todayStr())
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch (e) {
    console.error("hasCheckedInToday failed", e);
    return false;
  }
}

// Builds the last-N-days chart series for the mood/energy area chart.
// Fills gaps with nulls so recharts draws breaks instead of false zeros.
export function buildChartData(entries, days = 14) {
  const byDate = new Map(entries.map((e) => [e.entry_date, e]));
  const out = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = todayStr(d);
    const e = byDate.get(ds);
    out.push({
      day:    d.toLocaleDateString(undefined, { weekday: "short" }),
      date:   ds,
      mood:   e?.mood   ?? null,
      energy: e?.energy ?? null,
      sleep:  e?.sleep_hours ?? null,
    });
  }
  return out;
}
