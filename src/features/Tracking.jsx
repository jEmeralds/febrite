import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smile, Meh, Frown, Zap, Battery, BatteryLow, Droplet, Footprints,
  Briefcase, Heart, Sparkles, CalendarHeart, CheckCircle2, ExternalLink,
  Activity, ChevronDown, ChevronUp, Flower2, Plus, Minus,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useAuth } from "../lib/auth";
import { Card, SectionHead, C } from "../components/ui";
import { saveTodayEntry, getRecentEntries, buildChartData } from "../lib/tracking";
import { currentCyclePhase } from "../lib/cycleMath";

/* ============================================================
   CONSTANTS
   ============================================================ */
const MOODS  = [
  { icon: Frown,  label: "Low",   v: 1 }, { icon: Meh, label: "Flat",  v: 2 },
  { icon: Smile,  label: "Okay",  v: 3 }, { icon: Smile, label: "Good", v: 4 },
  { icon: Smile,  label: "Great", v: 5 },
];
const ENERGY = [
  { icon: BatteryLow, label: "Drained", v: 1 }, { icon: Battery, label: "Low",    v: 2 },
  { icon: Battery,    label: "Steady",  v: 3 }, { icon: Zap,     label: "Strong", v: 4 },
  { icon: Zap,        label: "Vibrant", v: 5 },
];
const SYMPTOMS = ["Cramps","Fatigue","Headache","Bloating","Hot flash","Anxious","Poor sleep","Irritable"];
const PHASES   = ["Menstrual","Follicular","Ovulation","Luteal","N/A"];

const MOOD_LABELS   = ["", "Low", "Flat", "Okay", "Good", "Great"];
const ENERGY_LABELS = ["", "Drained", "Low", "Steady", "Strong", "Vibrant"];
const STRESS_LABELS = ["", "Low", "Manageable", "Notable", "Heavy", "Very heavy"];

const PHASE_COLOR = {
  Menstrual:  "#C44A4A",
  Follicular: "#3F7B5A",
  Ovulation:  "#D08C3B",
  Luteal:     "#7E5FA4",
};

/* ============================================================
   BIG CYCLE WHEEL — page hero. Bigger and more luxurious than
   the earlier compact version. Inner shadow ring + soft outer
   ring give it depth. Phase arcs are bolder, the active one
   sits fully saturated while others quietly recede.
   ============================================================ */
function BigCycleWheel({ profile, accent, size = 320 }) {
  const cyc = currentCyclePhase(profile);
  if (!cyc) return <CycleWheelEmpty size={size}/>;

  const cycleLen   = cyc.cycleLen;
  const periodLen  = Math.max(2, Math.min(10, profile?.period_length || 5));
  const ovDay      = cycleLen - 14;
  const phaseColor = PHASE_COLOR[cyc.phase] || accent;

  const phases = [
    { name: "Menstrual",  start: 1,             end: periodLen },
    { name: "Follicular", start: periodLen + 1, end: ovDay - 2 },
    { name: "Ovulation",  start: ovDay - 1,     end: ovDay + 1 },
    { name: "Luteal",     start: ovDay + 2,     end: cycleLen },
  ];

  const cx = size / 2;
  const cy = size / 2;
  const r  = (size / 2) - 22;
  const sw = 22; // stroke width — slightly thicker for presence

  const dayToDeg = (d) => ((d - 1) / cycleLen) * 360;
  const polar = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (startDeg, endDeg) => {
    const [x1, y1] = polar(startDeg, r);
    const [x2, y2] = polar(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const todayDeg = dayToDeg(cyc.dayInCycle);
  const [mx, my] = polar(todayDeg, r);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Background ring (track) */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(44,35,32,.05)" strokeWidth={sw}/>
      {/* Phase arcs — inactive ones dimmed, active one full */}
      {phases.map((p) => {
        const startDeg = dayToDeg(p.start);
        const endDeg = p.end >= cycleLen ? 360 : dayToDeg(p.end + 1);
        const isCurrent = p.name === cyc.phase;
        return (
          <path
            key={p.name}
            d={arc(startDeg, endDeg)}
            fill="none"
            stroke={PHASE_COLOR[p.name]}
            strokeWidth={sw}
            opacity={isCurrent ? 1 : 0.22}
            filter={isCurrent ? "url(#wheel-glow)" : undefined}
          />
        );
      })}
      {/* Tick marks every 7 days for orientation */}
      {Array.from({ length: Math.ceil(cycleLen / 7) }).map((_, i) => {
        const day = (i + 1) * 7;
        if (day > cycleLen) return null;
        const deg = dayToDeg(day);
        const [tx1, ty1] = polar(deg, r - sw / 2 - 2);
        const [tx2, ty2] = polar(deg, r - sw / 2 - 8);
        return (
          <line key={day} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
            stroke="rgba(44,35,32,.25)" strokeWidth={1.5}/>
        );
      })}
      {/* Today marker — outer halo ring, white circle, inner dot */}
      <circle cx={mx} cy={my} r={18} fill={`${phaseColor}33`}/>
      <circle cx={mx} cy={my} r={13} fill="#fff" stroke={phaseColor} strokeWidth={3.5}/>
      <circle cx={mx} cy={my} r={5} fill={phaseColor}/>
      {/* Center stack */}
      <text x={cx} y={cy - 28} textAnchor="middle" fontFamily="Karla, sans-serif"
            fontSize={11} fontWeight={700} fill="rgba(44,35,32,.5)" letterSpacing=".18em">
        CYCLE DAY
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="Fraunces, serif"
            fontSize={68} fill="#2C2320" letterSpacing="-.02em">
        {cyc.dayInCycle}
      </text>
      <text x={cx} y={cy + 48} textAnchor="middle" fontFamily="Karla, sans-serif"
            fontSize={13.5} fontWeight={700} fill={phaseColor} letterSpacing=".12em">
        {cyc.phase.toUpperCase()}
      </text>
      <text x={cx} y={cy + 70} textAnchor="middle" fontFamily="Karla, sans-serif"
            fontSize={11.5} fill="rgba(44,35,32,.5)">
        of ~{cycleLen}
      </text>
    </svg>
  );
}

function CycleWheelEmpty({ size = 320 }) {
  const nav = useNavigate();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "2px dashed rgba(44,35,32,.18)",
      display: "grid", placeItems: "center", textAlign: "center", padding: 32,
    }}>
      <div>
        <Flower2 size={36} style={{ color: "rgba(44,35,32,.4)", marginBottom: 12 }}/>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, marginBottom: 6 }}>
          Tell us your cycle start
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5, maxWidth: 200, margin: "0 auto 14px" }}>
          Add the date your last period started, and your wheel comes alive.
        </div>
        <button onClick={() => nav("/profile")} style={{
          fontSize: 13, fontWeight: 700, background: C.clay,
          color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, cursor: "pointer",
        }}>Open profile</button>
      </div>
    </div>
  );
}

/* ============================================================
   HERO — wheel on the left, today's narrative + status on the right
   ============================================================ */
function TrackHero({ profile, entries, accent, todayLogged }) {
  const cyc = currentCyclePhase(profile);
  const phaseColor = cyc ? PHASE_COLOR[cyc.phase] || accent : accent;
  const streak = useMemo(() => weeklyStreak(entries), [entries]);

  // Headline copy that changes by phase
  const phraseFor = (phase) => {
    if (!phase) return "Your cycle, your read of you.";
    if (phase === "Menstrual")  return "Your period is here. Be gentle with yourself.";
    if (phase === "Follicular") return "Energy and clarity are usually rising now.";
    if (phase === "Ovulation")  return "You're at the peak of your cycle.";
    return "PMS, mood, fatigue — your luteal phase is showing.";
  };

  return (
    <Card style={{
      marginBottom: 22,
      padding: "32px 28px",
      background: cyc
        ? `radial-gradient(120% 80% at 18% 50%, ${phaseColor}18, ${C.card} 65%)`
        : C.card,
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="fb-track-hero-grid" style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 36,
        alignItems: "center",
      }}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <BigCycleWheel profile={profile} accent={accent}/>
        </div>

        <div>
          <div style={{
            fontSize: 12, color: C.inkSoft, fontWeight: 700,
            letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>

          <h1 style={{
            fontFamily: "Fraunces, serif", fontWeight: 400,
            fontSize: "clamp(24px,3.5vw,34px)", lineHeight: 1.15,
            margin: "0 0 14px", color: C.ink, letterSpacing: "-.01em",
          }}>
            {phraseFor(cyc?.phase)}
          </h1>

          {cyc && (
            <div style={{
              fontSize: 15, color: C.inkSoft, lineHeight: 1.6, marginBottom: 20,
              maxWidth: 380,
            }}>
              Day {cyc.dayInCycle} of a ~{cyc.cycleLen}-day cycle.{" "}
              <b style={{ color: phaseColor }}>~{cyc.daysUntilPeriod} day{cyc.daysUntilPeriod === 1 ? "" : "s"}</b>{" "}
              until your next period begins.
            </div>
          )}

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700,
                            letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 7 }}>
                This week
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{
                    width: 10, height: 28, borderRadius: 3,
                    background: i < streak ? phaseColor : "rgba(44,35,32,.09)",
                  }}/>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 7 }}>
                {streak}/7 days logged
              </div>
            </div>

            {todayLogged && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 99,
                background: `${phaseColor}1A`, color: phaseColor,
                fontSize: 13, fontWeight: 700,
              }}>
                <CheckCircle2 size={14}/> Today logged
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .fb-track-hero-grid {
            grid-template-columns: 1fr !important;
            justify-items: center;
            text-align: center;
            gap: 22px !important;
          }
        }
      `}</style>
    </Card>
  );
}

/* ============================================================
   STREAK helper
   ============================================================ */
function weeklyStreak(entries) {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (entries.find((e) => e.entry_date === ds && e.mood != null)) count++;
  }
  return count;
}

/* ============================================================
   CYCLE CALENDAR — 28-day grid
   ============================================================ */
function CycleCalendar({ profile, entries, accent }) {
  const today = new Date();
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const phase = currentCyclePhase(profile, d)?.phase;
    const entry = entries.find((e) => e.entry_date === dateStr);
    days.push({ date: d, dateStr, phase, entry, isToday: i === 0 });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d) => {
          const color = d.phase ? PHASE_COLOR[d.phase] : null;
          return (
            <div key={d.dateStr}
              title={`${d.dateStr}${d.phase ? " · " + d.phase : ""}${d.entry ? " · logged" : ""}`}
              style={{
                aspectRatio: "1", minHeight: 36, borderRadius: "50%",
                background: color ? `${color}22` : "rgba(44,35,32,.04)",
                border: d.isToday ? `2px solid ${accent}` : "2px solid transparent",
                display: "grid", placeItems: "center", position: "relative",
                fontSize: 11.5, color: C.ink,
                fontWeight: d.isToday ? 700 : 500,
              }}>
              {d.date.getDate()}
              {d.entry && (
                <div style={{
                  position: "absolute", bottom: 3,
                  width: 4, height: 4, borderRadius: "50%",
                  background: color || C.ink,
                }}/>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap", fontSize: 11.5, color: C.inkSoft }}>
        {Object.entries(PHASE_COLOR).map(([name, color]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }}/>
            <span>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   TIERED CHECK-IN — 3 essentials always visible, "log more"
   expands the rest (phase, symptoms, stress, water, movement).
   ============================================================ */
function CheckInPanel({ today, set, toggleSymptom, save, saving, logged, accent, showsCycle }) {
  const [expanded, setExpanded] = useState(false);
  const canSave = today.mood != null;

  return (
    <div>
      <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700,
                    letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
        Today's check-in
      </div>
      <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 400,
                   fontSize: "clamp(22px,3.5vw,28px)", margin: "0 0 6px", color: C.ink,
                   letterSpacing: "-.01em" }}>
        How are you, today?
      </h2>
      <p style={{ fontSize: 14.5, color: C.inkSoft, lineHeight: 1.55, margin: "0 0 18px" }}>
        The three essentials below take 30 seconds. Add more when you want a deeper read.
      </p>

      {/* THREE ESSENTIALS */}
      <Card style={{ padding: 22 }}>
        <Lbl>Mood</Lbl>
        <EmojiRow items={MOODS} value={today.mood} onPick={(v) => set("mood", v)} accent={accent}/>

        <Lbl top>Energy</Lbl>
        <EmojiRow items={ENERGY} value={today.energy} onPick={(v) => set("energy", v)} accent={accent}/>

        <Lbl top>Sleep last night · <b style={{ color: C.ink }}>{today.sleep}h</b></Lbl>
        <Stepper
          onMinus={() => set("sleep", Math.max(0, today.sleep - 1))}
          onPlus={()  => set("sleep", Math.min(12, today.sleep + 1))}
          mid={
            <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(44,35,32,.08)" }}>
              <div style={{ width: `${(today.sleep / 12) * 100}%`, height: "100%", borderRadius: 99, background: accent }}/>
            </div>
          }
        />

        {/* EXPAND TOGGLE */}
        <button onClick={() => setExpanded((e) => !e)} style={{
          marginTop: 18, padding: "10px 14px", borderRadius: 11,
          border: `1px dashed ${C.line}`, background: "transparent",
          color: C.ink, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 7,
          fontFamily: "Karla, sans-serif",
        }}>
          {expanded
            ? <><ChevronUp size={15}/> Hide deeper log</>
            : <><ChevronDown size={15}/> Log more — symptoms, stress, cycle, more</>}
        </button>

        {/* EXPANDED FIELDS */}
        {expanded && (
          <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
            {showsCycle && (
              <>
                <Lbl>Cycle phase <span style={{ color:C.inkSoft, fontWeight:400 }}>(only if it feels different from what we're showing)</span></Lbl>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PHASES.map((p) => (
                    <Chip key={p} active={today.phase === p} onClick={() => set("phase", p)} accent={accent}>{p}</Chip>
                  ))}
                </div>
              </>
            )}

            <Lbl top>Anything you noticed?</Lbl>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SYMPTOMS.map((x) => (
                <Chip key={x} active={today.symptoms.includes(x)} onClick={() => toggleSymptom(x)} accent={accent}>{x}</Chip>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }} className="fb-stress-grid">
              <div>
                <Lbl>Work stress · <b style={{ color: C.ink }}>{today.workStress == null ? "tap to set" : STRESS_LABELS[today.workStress]}</b></Lbl>
                <ScaleRow icon={Briefcase} value={today.workStress} onPick={(v) => set("workStress", v)} accent="#B25A38"/>
              </div>
              <div>
                <Lbl>Personal stress · <b style={{ color: C.ink }}>{today.personalStress == null ? "tap to set" : STRESS_LABELS[today.personalStress]}</b></Lbl>
                <ScaleRow icon={Heart} value={today.personalStress} onPick={(v) => set("personalStress", v)} accent="#9A4E5B"/>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }} className="fb-water-grid">
              <div>
                <Lbl>Water · <b style={{ color: C.ink }}>{today.water} glasses</b></Lbl>
                <Stepper
                  onMinus={() => set("water", Math.max(0, today.water - 1))}
                  onPlus={()  => set("water", today.water + 1)}
                  mid={<div style={{ display: "flex", gap: 3 }}>{Array.from({ length: Math.min(today.water, 8) }).map((_, i) => (<Droplet key={i} size={15} style={{ color: accent }}/>))}</div>}
                />
              </div>
              <div>
                <Lbl>Did you move today?</Lbl>
                <YesNo value={today.moved} onPick={(v) => set("moved", v)} accent={accent}/>
              </div>
            </div>
          </div>
        )}

        <button onClick={save} disabled={!canSave || saving} style={{
          marginTop: 22, width: "100%", padding: "13px", borderRadius: 12, border: "none",
          background: canSave ? accent : "rgba(44,35,32,.15)", color: "#fff",
          fontSize: 15, fontWeight: 700,
          cursor: canSave && !saving ? "pointer" : "not-allowed",
          display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
          opacity: saving ? 0.7 : 1,
          fontFamily: "Karla, sans-serif",
        }}>
          {saving ? "Saving…" : logged ? <><CheckCircle2 size={16}/> Logged for today · update</> : <><CalendarHeart size={16}/> Save check-in</>}
        </button>
      </Card>
      <style>{`
        @media (max-width: 540px) {
          .fb-stress-grid, .fb-water-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   CHART tooltip — translates numbers back to words
   ============================================================ */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", boxShadow: "0 4px 14px -8px rgba(60,30,20,.18)" }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, color: C.ink, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => {
        let valueLabel = p.value;
        if (p.dataKey === "mood")    valueLabel = `${p.value} · ${MOOD_LABELS[Math.round(p.value)] || ""}`;
        if (p.dataKey === "energy")  valueLabel = `${p.value} · ${ENERGY_LABELS[Math.round(p.value)] || ""}`;
        if (p.dataKey === "sleep")   valueLabel = `${p.value}h`;
        return (
          <div key={p.dataKey} style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
            <span style={{ color: p.color, fontWeight: 700, marginRight: 5 }}>●</span>
            {p.name}: {valueLabel}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   PATTERN ANALYSIS — only shown when ≥8 entries
   ============================================================ */
function calculatePatterns(entries) {
  const real = entries.filter((e) => e.mood != null);
  const out = { totalDays: real.length, phaseStats: null, sleepEnergy: null, bestWorstPhase: null };
  if (real.length < 8) return out;

  const groups = {};
  real.forEach((e) => {
    const p = e.cycle_phase;
    if (!p || p === "N/A") return;
    (groups[p] = groups[p] || []).push(e);
  });
  const phaseStats = {};
  Object.entries(groups).forEach(([phase, list]) => {
    const avg = (key) => {
      const vals = list.filter((e) => e[key] != null).map((e) => e[key]);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    phaseStats[phase] = { count: list.length, mood: avg("mood"), energy: avg("energy"), sleep: avg("sleep_hours") };
  });
  out.phaseStats = phaseStats;

  const moodByPhase = Object.entries(phaseStats)
    .filter(([, s]) => s.count >= 2 && s.mood != null)
    .sort((a, b) => b[1].mood - a[1].mood);
  if (moodByPhase.length >= 2) {
    const diff = moodByPhase[0][1].mood - moodByPhase[moodByPhase.length - 1][1].mood;
    if (diff >= 0.5) {
      out.bestWorstPhase = { best: moodByPhase[0][0], worst: moodByPhase[moodByPhase.length - 1][0], diff };
    }
  }

  const pairs = real.filter((e) => e.sleep_hours != null && e.energy != null);
  if (pairs.length >= 6) {
    const shortP = pairs.filter((e) => e.sleep_hours < 6.5);
    const longP  = pairs.filter((e) => e.sleep_hours >= 6.5);
    if (shortP.length >= 2 && longP.length >= 2) {
      const shortAvg = shortP.reduce((s, e) => s + e.energy, 0) / shortP.length;
      const longAvg  = longP.reduce((s, e) => s + e.energy, 0) / longP.length;
      const diff = longAvg - shortAvg;
      if (Math.abs(diff) >= 0.4) out.sleepEnergy = { shortAvg, longAvg, diff };
    }
  }
  return out;
}

function PatternsCard({ entries, accent }) {
  const p = useMemo(() => calculatePatterns(entries), [entries]);
  const need = Math.max(0, 8 - p.totalDays);

  const phasePillStyle = (color) => ({
    display: "inline-block", padding: "2px 9px", borderRadius: 99,
    background: `${color}22`, color, fontSize: 12, fontWeight: 700,
  });

  if (p.totalDays < 8) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <Sparkles size={16} style={{ color: accent }}/>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(17px,4vw,20px)", color: C.ink }}>Your patterns</div>
        </div>
        <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
          {p.totalDays === 0
            ? "Once you've logged a few days, real patterns will surface here — your mood across phases, what sleep does to your energy, which symptoms cluster when."
            : `${p.totalDays} day${p.totalDays === 1 ? "" : "s"} logged. ${need} more to start measuring patterns honestly.`}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 99,
              background: i < p.totalDays ? accent : "rgba(44,35,32,.08)",
            }}/>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <Sparkles size={16} style={{ color: accent }}/>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(17px,4vw,20px)", color: C.ink }}>Your patterns</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.inkSoft }}>{p.totalDays} days · measured</div>
      </div>

      {p.bestWorstPhase && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(44,35,32,.03)" }}>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
            Your mood runs about <b>{p.bestWorstPhase.diff.toFixed(1)} points higher</b> in your{" "}
            <span style={phasePillStyle(PHASE_COLOR[p.bestWorstPhase.best])}>{p.bestWorstPhase.best}</span>{" "}
            phase than in your{" "}
            <span style={phasePillStyle(PHASE_COLOR[p.bestWorstPhase.worst])}>{p.bestWorstPhase.worst}</span>{" "}
            phase — worth knowing as you plan ahead.
          </div>
        </div>
      )}

      {p.phaseStats && Object.keys(p.phaseStats).length >= 2 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Mood by phase</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {Object.entries(p.phaseStats)
              .filter(([, s]) => s.count >= 2 && s.mood != null)
              .sort((a, b) => b[1].mood - a[1].mood)
              .map(([phase, s]) => (
                <div key={phase} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 80, fontSize: 13, color: C.ink, fontWeight: 600 }}>{phase}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(44,35,32,.07)", overflow: "hidden" }}>
                    <div style={{ width: `${(s.mood / 5) * 100}%`, height: "100%", background: PHASE_COLOR[phase] || accent }}/>
                  </div>
                  <div style={{ width: 38, fontSize: 12, color: C.inkSoft, textAlign: "right" }}>{s.mood.toFixed(1)}/5</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {p.sleepEnergy && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(44,35,32,.03)" }}>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
            On days you sleep <b>7 hours or more</b>, your energy runs <b>{Math.abs(p.sleepEnergy.diff).toFixed(1)} points {p.sleepEnergy.diff > 0 ? "higher" : "lower"}</b>{" "}
            than on shorter nights. The relationship is consistent enough to notice.
          </div>
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Tracking({ stage, accent }) {
  const { user, profile } = useAuth();
  const [today, setToday] = useState({
    mood: null, sleep: 7, water: 4, moved: false, energy: null,
    workStress: null, personalStress: null, phase: null, symptoms: [],
  });
  const [logged, setLogged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const showsCycle = !["elder"].includes(stage);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const data = await getRecentEntries(user.id, 28);
        if (!active) return;
        setEntries(data);
        const todayStr = new Date().toISOString().slice(0, 10);
        const row = data.find((e) => e.entry_date === todayStr);
        if (row) {
          setToday({
            mood: row.mood, sleep: row.sleep_hours ?? 7, water: row.water_glasses ?? 4,
            moved: !!row.moved, energy: row.energy, workStress: row.work_stress,
            personalStress: row.personal_stress, phase: row.cycle_phase || null,
            symptoms: row.symptoms || [],
          });
          setLogged(true);
        }
      } catch (e) { console.error("load entries", e); }
    })();
    return () => { active = false; };
  }, [user]);

  const chartData = useMemo(() => buildChartData(entries.slice(-14), 14), [entries]);
  const realDays = entries.filter((e) => e.mood != null).length;

  const set = (k, v) => { setToday((t) => ({ ...t, [k]: v })); setLogged(false); };
  const toggleSymptom = (x) => set("symptoms", today.symptoms.includes(x) ? today.symptoms.filter((i) => i !== x) : [...today.symptoms, x]);

  const save = async () => {
    if (!user || saving || today.mood == null) return;
    setSaving(true);
    try {
      const row = await saveTodayEntry(user.id, today);
      setEntries((prev) => {
        const others = prev.filter((e) => e.entry_date !== row.entry_date);
        return [...others, row].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      });
      setLogged(true);
    } catch (e) { console.error("save", e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* ── 1. HERO ───────────────────────────────────────── */}
      <TrackHero profile={profile} entries={entries} accent={accent} todayLogged={logged}/>

      {/* ── 2. CHECK-IN + CALENDAR (2-col on desktop) ────── */}
      <div className="fb-track-mid" style={{
        display: "grid", gap: 18,
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
      }}>
        <div>
          <CheckInPanel
            today={today} set={set} toggleSymptom={toggleSymptom}
            save={save} saving={saving} logged={logged}
            accent={accent} showsCycle={showsCycle}
          />
        </div>
        {showsCycle && currentCyclePhase(profile) && (
          <div>
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <CalendarHeart size={16} style={{ color: accent }}/>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(17px,3.5vw,20px)", color: C.ink }}>
                  Last 28 days
                </div>
              </div>
              <CycleCalendar profile={profile} entries={entries} accent={accent}/>
            </Card>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .fb-track-mid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── 3. CHART (only if we have data) ──────────────── */}
      {realDays > 0 && (
        <Card style={{ marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <Activity size={16} style={{ color: accent }}/>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(17px,4vw,20px)", color: C.ink }}>
              Your last two weeks
            </div>
            <div style={{ marginLeft: "auto", fontSize: 12, color: C.inkSoft }}>{realDays} day{realDays === 1 ? "" : "s"} logged</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-mood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={.4}/>
                  <stop offset="100%" stopColor={accent} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g-energy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9893F" stopOpacity={.3}/>
                  <stop offset="100%" stopColor="#C9893F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.line} vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fontSize: 10, fill: C.inkSoft }} axisLine={false} tickLine={false} width={18}/>
              <Tooltip content={<ChartTooltip/>} cursor={{ stroke: C.line, strokeWidth: 1 }}/>
              <Area type="monotone" dataKey="mood"   stroke={accent}   strokeWidth={2.4} fill="url(#g-mood)"   name="Mood"/>
              <Area type="monotone" dataKey="energy" stroke="#C9893F" strokeWidth={2.2} fill="url(#g-energy)" name="Energy"/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12, color: C.inkSoft }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: accent }}/>Mood
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#C9893F" }}/>Energy
            </span>
          </div>
        </Card>
      )}

      {/* ── 4. PATTERNS ──────────────────────────────────── */}
      <div style={{ marginTop: 18 }}>
        <PatternsCard entries={entries} accent={accent}/>
      </div>

      <Card style={{ marginTop: 16, display: "flex", gap: 9, alignItems: "center", borderStyle: "dashed" }}>
        <ExternalLink size={16} style={{ color: C.inkSoft }}/>
        <div style={{ fontSize: 13, color: C.inkSoft }}>
          In the full app, this becomes a shareable summary you can send to your doctor.
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   FORM ATOMS
   ============================================================ */
const Lbl = ({ children, top }) => (
  <div style={{ fontSize: 13.5, color: C.inkSoft, margin: top ? "18px 0 10px" : "0 0 10px" }}>{children}</div>
);

const Chip = ({ children, active, onClick, accent }) => (
  <button onClick={onClick} style={{
    padding: "8px 12px", borderRadius: 99, border: `1px solid ${active ? accent : C.line}`,
    background: active ? `${accent}1A` : "#fff", color: active ? accent : C.ink,
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Karla, sans-serif",
  }}>{children}</button>
);

const Stepper = ({ onMinus, onPlus, mid }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <button onClick={onMinus} style={btnStyle}><Minus size={14}/></button>
    {mid}
    <button onClick={onPlus} style={btnStyle}><Plus size={14}/></button>
  </div>
);

const btnStyle = {
  width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.line}`,
  background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: C.ink,
};

const EmojiRow = ({ items, value, onPick, accent }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
    {items.map(({ icon: Icon, label, v }) => {
      const active = value === v;
      return (
        <button key={v} onClick={() => onPick(v)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
          padding: "10px 4px", borderRadius: 12, border: `1px solid ${active ? accent : C.line}`,
          background: active ? `${accent}14` : "#fff", color: active ? accent : C.ink,
          cursor: "pointer", fontFamily: "Karla, sans-serif",
        }}>
          <Icon size={20}/>
          <span style={{ fontSize: 11.5, fontWeight: active ? 700 : 500 }}>{label}</span>
        </button>
      );
    })}
  </div>
);

const YesNo = ({ value, onPick, accent }) => (
  <div style={{ display: "flex", gap: 8 }}>
    {[{ k: true, l: "Yes" }, { k: false, l: "Not yet" }].map((o) => {
      const active = value === o.k;
      return (
        <button key={String(o.k)} onClick={() => onPick(o.k)} style={{
          flex: 1, padding: "12px", borderRadius: 12,
          border: `1px solid ${active ? accent : C.line}`,
          background: active ? `${accent}14` : "#fff", color: active ? accent : C.ink,
          fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          fontFamily: "Karla, sans-serif",
        }}>
          <Footprints size={15}/> {o.l}
        </button>
      );
    })}
  </div>
);

const ScaleRow = ({ icon: Icon, value, onPick, accent }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
    {[1, 2, 3, 4, 5].map((n) => {
      const active = value === n;
      const intensity = active ? 1 : 0.16 + (n - 1) * 0.08;
      return (
        <button key={n} onClick={() => onPick(n)} style={{
          padding: 10, borderRadius: 11,
          border: `1px solid ${active ? accent : C.line}`,
          background: `${accent}${Math.round(intensity * 22).toString(16).padStart(2, "0")}`,
          color: active ? accent : C.inkSoft,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        }}>
          <Icon size={14}/>
          <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>
            {n === 1 ? "Low" : n === 5 ? "Heavy" : ""}
          </span>
        </button>
      );
    })}
  </div>
);
