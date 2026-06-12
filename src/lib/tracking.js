import { supabase, hasSupabase } from "./supabase";

const LS_KEY = "febrite_demo_tracking";
const today = () => new Date().toISOString().slice(0, 10);

/* Map the in-app form shape to the DB column names. */
function toRow(userId, form) {
  return {
    user_id: userId,
    entry_date: today(),
    mood: form.mood ?? null,
    sleep_hours: form.sleep ?? null,
    water_glasses: form.water ?? null,
    moved: form.moved ?? null,
    energy: form.energy ?? null,
    work_stress: form.workStress ?? null,
    personal_stress: form.personalStress ?? null,
    cycle_phase: form.phase || null,
    symptoms: form.symptoms || [],
  };
}

/* Has the user logged a check-in for today's date? */
export async function hasCheckedInToday(userId) {
  if (!userId) return false;
  if (hasSupabase) {
    const { data } = await supabase
      .from("tracking_entries")
      .select("entry_date")
      .eq("user_id", userId)
      .eq("entry_date", today())
      .maybeSingle();
    return !!data;
  }
  const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  return !!all[userId]?.[today()];
}

/* Today's check-in — upserts on (user_id, entry_date) so re-saving updates the row.
   If the user marks themselves as Menstrual, we also update cycle_start_date on
   her profile (when it's missing or more than ~10 days old), so the cycle
   math always reflects her real most-recent period. */
export async function saveTodayEntry(userId, form) {
  const row = toRow(userId, form);
  if (hasSupabase) {
    const { data, error } = await supabase
      .from("tracking_entries")
      .upsert(row, { onConflict: "user_id,entry_date" })
      .select()
      .single();
    if (error) throw error;
    // Auto-update cycle_start_date when she logs the start of her period.
    if (form.phase === "Menstrual") {
      const { data: prof } = await supabase
        .from("profiles")
        .select("cycle_start_date")
        .eq("id", userId)
        .maybeSingle();
      const last = prof?.cycle_start_date ? new Date(prof.cycle_start_date) : null;
      const daysAgo = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 999;
      if (daysAgo > 10) {
        await supabase.from("profiles").update({ cycle_start_date: today() }).eq("id", userId);
      }
    }
    return data;
  }
  // demo fallback
  const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  const map = all[userId] || {};
  map[row.entry_date] = row;
  all[userId] = map;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return row;
}

/* Last N days of entries. */
export async function getRecentEntries(userId, days = 14) {
  if (hasSupabase) {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const { data, error } = await supabase
      .from("tracking_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", since.toISOString().slice(0, 10))
      .order("entry_date", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  const map = all[userId] || {};
  return Object.values(map).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}

/* Build a 14-day window for the chart; missing days are null so recharts skips them. */
export function buildChartData(entries, days = 14) {
  const byDate = Object.fromEntries(entries.map((e) => [e.entry_date, e]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const e = byDate[date];
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      date,
      mood: e?.mood ?? null,
      energy: e?.energy ?? null,
      sleep: e?.sleep_hours ?? null,
      workStress: e?.work_stress ?? null,
      personalStress: e?.personal_stress ?? null,
    });
  }
  return out;
}

/* Insights — only generated when we have enough real data to mean something. */
export function deriveInsights(entries) {
  const real = entries.filter((e) => e.mood != null);
  if (real.length < 4) {
    return [{ kind: "empty", text: "Keep logging — your patterns will start to surface here after a few days." }];
  }
  const out = [];

  // Sleep <-> mood
  const shortSleep = real.filter((e) => e.sleep_hours != null && e.sleep_hours < 6.5);
  if (shortSleep.length >= 2) {
    const avgShort = shortSleep.reduce((s, e) => s + e.mood, 0) / shortSleep.length;
    const avgAll = real.reduce((s, e) => s + e.mood, 0) / real.length;
    if (avgShort < avgAll - 0.3) {
      out.push({ kind: "sleep", text: "Your mood tends to dip on shorter-sleep nights. A consistent wind-down may be one of your highest-value habits." });
    }
  }

  // Sustained work stress
  const highWork = real.filter((e) => (e.work_stress ?? 0) >= 4);
  if (highWork.length >= 3) {
    out.push({ kind: "work", text: "Work stress has been high several days running. Small recovery rituals — a real lunch, a short walk — compound." });
  }

  // Cycle phase mood (if logged)
  const luteal = real.filter((e) => e.cycle_phase === "Luteal");
  if (luteal.length >= 2) {
    const avg = luteal.reduce((s, e) => s + e.mood, 0) / luteal.length;
    if (avg < 3) out.push({ kind: "cycle", text: "Your mood tends to be lower in your luteal phase. Knowing it's coming can help you plan gentleness in." });
  }

  if (out.length === 0) {
    out.push({ kind: "ok", text: "Nothing stands out as a concern in your recent entries. Keep noticing — quiet stretches matter too." });
  }
  return out.slice(0, 3);
}

/* Short-term forward-looking signals based on the last few days of real data. */
export function trendSignals(entries) {
  const real = entries.filter((e) => e.mood != null);
  if (real.length < 3) return [];
  const recent = real.slice(-3);
  const signals = [];

  if (recent.length === 3 && recent[0].mood - recent[2].mood >= 1) {
    signals.push({ kind: "watch", text: "Mood has been gently declining over the last few days. Today is a good time to notice what's changed." });
  }
  if (recent.length === 3 && recent[2].mood - recent[0].mood >= 1) {
    signals.push({ kind: "good", text: "Your mood is trending up — whatever you're doing this week is working." });
  }
  const sleeps = recent.filter((e) => e.sleep_hours != null);
  if (sleeps.length >= 2 && sleeps.every((e) => e.sleep_hours < 6.5)) {
    signals.push({ kind: "watch", text: "Sleep has been short several nights running. Energy and mood often dip after this — be gentle with today's expectations." });
  }
  const works = recent.filter((e) => e.work_stress != null);
  if (works.length >= 2 && works.every((e) => e.work_stress >= 4)) {
    signals.push({ kind: "watch", text: "Work stress has been heavy multiple days running. Short recovery moments — a real lunch, a walk between meetings — matter more than they feel like they do." });
  }
  const ens = recent.filter((e) => e.energy != null);
  if (ens.length >= 2 && ens.every((e) => e.energy <= 2)) {
    signals.push({ kind: "watch", text: "Energy has been low for a stretch. Rest is productive — not a failure." });
  }

  return signals.slice(0, 3);
}
