/* Light-weight plain-language observations for Home's "What's been
   going on" strip. Rule-based on recent entries — no LLM call. */
export function recentObservations(entries = []) {
  const out = [];
  const real = entries.filter((e) => e.mood != null);
  if (real.length === 0) return out;
  const last3 = real.slice(-3);
  const last7 = real.slice(-7);

  // Sleep streak
  const sleeps = last3.filter((e) => e.sleep_hours != null);
  if (sleeps.length >= 2 && sleeps.every((e) => e.sleep_hours < 6.5)) {
    out.push({ tone: "watch",  text: "Your sleep has been short for a few nights running." });
  } else if (sleeps.length >= 2 && sleeps.every((e) => e.sleep_hours >= 7.5)) {
    out.push({ tone: "good",   text: "Sleep has been solid this week." });
  }

  // Mood trend
  if (last3.length >= 3) {
    const first = last3[0].mood, last = last3[last3.length - 1].mood;
    if (last - first >= 1)      out.push({ tone: "good",  text: "Your mood has been climbing over the last few days." });
    else if (first - last >= 1) out.push({ tone: "watch", text: "Your mood has drifted down a bit over the last few days." });
    else if (last3.every((e) => e.mood >= 4))
      out.push({ tone: "good",  text: "You've been having a pretty good stretch." });
    else if (last3.every((e) => e.mood <= 2))
      out.push({ tone: "watch", text: "Your mood has been low for a stretch — worth paying attention to." });
  }

  // Energy streak
  const energies = last3.filter((e) => e.energy != null);
  if (energies.length >= 2 && energies.every((e) => e.energy <= 2)) {
    out.push({ tone: "watch", text: "Energy has been running low this week." });
  }

  // Work stress
  const works = last3.filter((e) => e.work_stress != null);
  if (works.length >= 2 && works.every((e) => e.work_stress >= 4)) {
    out.push({ tone: "watch", text: "Work stress has been heavy lately." });
  }

  // Recurring symptoms across the last 7 days
  const symCounts = {};
  last7.forEach((e) => (e.symptoms || []).forEach((s) => {
    symCounts[s] = (symCounts[s] || 0) + 1;
  }));
  const recurring = Object.entries(symCounts).filter(([, n]) => n >= 2).map(([s]) => s);
  if (recurring.length === 1) {
    out.push({ tone: "watch", text: `${recurring[0]} has shown up more than once this week.` });
  } else if (recurring.length > 1) {
    out.push({ tone: "watch", text: `${recurring.slice(0, 2).join(" and ")} have both been recurring this week.` });
  }

  // Movement
  const moved = last3.filter((e) => e.moved === true).length;
  if (last3.length >= 3 && moved >= 2) {
    out.push({ tone: "good", text: "You've been moving your body most days. That tends to show up everywhere." });
  }

  // Dedupe and cap at 3
  const seen = new Set();
  return out.filter((o) => seen.has(o.text) ? false : (seen.add(o.text), true)).slice(0, 3);
}
