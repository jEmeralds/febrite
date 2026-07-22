import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smile, Meh, Frown, Zap, Battery, BatteryLow, Droplet, Footprints,
  Briefcase, Heart, Sparkles, CalendarHeart, CheckCircle2,
  Activity, ChevronDown, ChevronUp, Flower2, Plus, Minus,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useAuth } from "../lib/auth";
import { Card, SectionHead, C } from "../components/ui";
import { saveTodayEntry, getRecentEntries, getEntryForDate, buildChartData } from "../lib/trackingApi";
import { parseCheckinText } from "../lib/companion";
import { currentPhase, getPhaseLogs, computeCycleStats, buildCurrentCycleWheelData, logPhaseForToday } from "../lib/cyclePhases";
import RealCycleWheel from "../components/RealCycleWheel";
import { useCurrentDate } from "../lib/useCurrentDate";
import CycleCalendarV2 from "../components/CycleCalendarV2";
import ReportsPanel from "./track/ReportsPanel";

const MOODS = [
  { icon: Frown,  label: "Low",   v: 1 },
  { icon: Meh,    label: "Flat",  v: 2 },
  { icon: Smile,  label: "Okay",  v: 3 },
  { icon: Smile,  label: "Good",  v: 4 },
  { icon: Smile,  label: "Great", v: 5 },
];
const ENERGY = [
  { icon: BatteryLow, label: "Drained", v: 1 },
  { icon: Battery,    label: "Low",     v: 2 },
  { icon: Battery,    label: "Steady",  v: 3 },
  { icon: Zap,        label: "Strong",  v: 4 },
  { icon: Zap,        label: "Vibrant", v: 5 },
];
const SYMPTOMS = ["Cramps","Fatigue","Headache","Bloating","Hot flash","Anxious","Poor sleep","Irritable"];
const PHASES   = ["Menstrual","Follicular","Ovulation","Luteal","N/A"];
const FLOW_OPTIONS = [
  { v: "spotting", label: "Spotting" },
  { v: "light",    label: "Light"    },
  { v: "medium",   label: "Medium"   },
  { v: "heavy",    label: "Heavy"    },
];
const SEVERITY_OPTIONS = [
  { v: 1, label: "Mild"     },
  { v: 2, label: "Moderate" },
  { v: 3, label: "Severe"   },
];

const MOOD_LABELS   = ["","Low","Flat","Okay","Good","Great"];
const ENERGY_LABELS = ["","Drained","Low","Steady","Strong","Vibrant"];
const STRESS_LABELS = ["","Low","Manageable","Notable","Heavy","Very heavy"];

const PHASE_COLOR = {
  Menstrual:  "#C44A4A",
  Follicular: "#3F7B5A",
  Ovulation:  "#D08C3B",
  Luteal:     "#7E5FA4",
};
// lowercase enum -> display label, since cycle_phase_logs stores lowercase
const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };

/* ── Phase status (replaces the fixed-proportion cycle wheel) ───────────
   No wheel, because a wheel implies every phase is a fixed slice of a
   fixed-length cycle — exactly the assumption we're removing. Instead:
   a plain, honest readout of what's actually been logged. */
function PhaseStatusEmpty({ onLog }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 10px" }}>
      <Flower2 size={32} style={{ color: "rgba(44,35,32,.4)", marginBottom: 10 }} />
      <div style={{ fontFamily: "Fraunces,serif", fontSize: 18, color: C.ink, marginBottom: 6 }}>No phase logged yet</div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5, maxWidth: 240, margin: "0 auto 14px" }}>
        Tap a day on the calendar to log when your period (or another phase) actually started.
      </div>
      <button onClick={onLog} style={{ fontSize: 13, fontWeight: 700, background: C.clay, color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, cursor: "pointer" }}>
        Log today
      </button>
    </div>
  );
}

function PhaseStatusCard({ phaseNow, stats, accent }) {
  const nav = useNavigate();
  if (!phaseNow) return <PhaseStatusEmpty onLog={() => {}} />;

  const color = PHASE_COLOR[PHASE_TITLE[phaseNow.phase]] || accent;
  const avgForThisPhase = stats?.byPhase?.[phaseNow.phase];

  return (
    <div style={{ textAlign: "center", padding: "10px 6px" }}>
      <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 10 }}>
        Day {phaseNow.dayInPhase} of this phase
      </div>
      <div style={{ width: 132, height: 132, borderRadius: "50%", margin: "0 auto 16px", display: "grid", placeItems: "center", background: `${color}14`, border: `3px solid ${color}` }}>
        <div>
          <div style={{ fontFamily: "Fraunces,serif", fontSize: 40, color: "#2C2320", lineHeight: 1 }}>{phaseNow.dayInPhase}</div>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
        {PHASE_TITLE[phaseNow.phase]}
      </div>
      {avgForThisPhase && (
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>
          Your {PHASE_TITLE[phaseNow.phase].toLowerCase()} phase usually runs ~{Math.round(avgForThisPhase.avgDays)} day{Math.round(avgForThisPhase.avgDays)===1?"":"s"} ({avgForThisPhase.count} logged)
        </div>
      )}
      {!avgForThisPhase && (
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>Log a few more cycles and we'll show your real average here.</div>
      )}
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────── */
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

function TrackHero({ entries, accent, todayLogged, phaseNow, stats, wheelData }) {
  const phaseColor = phaseNow ? (PHASE_COLOR[PHASE_TITLE[phaseNow.phase]] || accent) : accent;
  const streak     = useMemo(() => weeklyStreak(entries), [entries]);

  const phraseFor = (phase) => {
    if (!phase)                return "Your cycle, your read of you.";
    if (phase === "menstrual") return "Your period is here. Be gentle with yourself.";
    if (phase === "follicular")return "Energy and clarity are usually rising now.";
    if (phase === "ovulation") return "You're at the peak of your cycle.";
    return "PMS, mood, fatigue — your luteal phase is showing.";
  };

  return (
    <Card style={{ marginBottom:22, padding:"32px 28px", background:phaseNow?`radial-gradient(120% 80% at 18% 50%, ${phaseColor}18, ${C.card} 65%)`:C.card, position:"relative", overflow:"hidden" }}>
      <div className="fb-track-hero-grid" style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:36, alignItems:"center" }}>
        <div style={{ display:"grid", placeItems:"center" }}>
          {wheelData
            ? <RealCycleWheel wheelData={wheelData} currentPhase={phaseNow} accent={accent} />
            : <PhaseStatusCard phaseNow={phaseNow} stats={stats} accent={accent} />}
        </div>
        <div>
          <div style={{ fontSize:12, color:C.inkSoft, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>
            Today · {new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}
          </div>
          <h1 style={{ fontFamily:"Fraunces,serif", fontWeight:400, fontSize:"clamp(24px,3.5vw,34px)", lineHeight:1.15, margin:"0 0 14px", color:C.ink, letterSpacing:"-.01em" }}>
            {phraseFor(phaseNow?.phase)}
          </h1>
          {stats?.avgCycleLength && (
            <div style={{ fontSize:15, color:C.inkSoft, lineHeight:1.6, marginBottom:20, maxWidth:380 }}>
              Your cycles have averaged <b style={{ color:phaseColor }}>~{Math.round(stats.avgCycleLength)} days</b>{" "}
              across {stats.cyclesObserved} logged cycle{stats.cyclesObserved===1?"":"s"} — an observation, not a prediction.
            </div>
          )}
          <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11.5, color:C.inkSoft, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:7 }}>This week</div>
              <div style={{ display:"flex", gap:5 }}>
                {Array.from({length:7}).map((_,i) => (
                  <div key={i} style={{ width:10, height:28, borderRadius:3, background:i<streak?phaseColor:"rgba(44,35,32,.09)" }}/>
                ))}
              </div>
              <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:7 }}>{streak}/7 days logged</div>
            </div>
            {todayLogged && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 14px", borderRadius:99, background:`${phaseColor}1A`, color:phaseColor, fontSize:13, fontWeight:700 }}>
                <CheckCircle2 size={14}/> Today logged
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:760px){.fb-track-hero-grid{grid-template-columns:1fr!important;justify-items:center;text-align:center;gap:22px!important;}}`}</style>
    </Card>
  );
}

/* ── Check-in panel ───────────────────────────────────────── */
function CheckInPanel({ today, set, toggleSymptom, setSeverity, save, saving, logged, accent, showsCycle, checkinDate, todayDate, manualDate, setManualDate, setCheckinDate, backToToday, interpretNote, interpreting }) {
  const [expanded, setExpanded] = useState(false);
  const canSave = today.mood != null;
  const isMenstrual = today.phase === "Menstrual";
  const isToday = checkinDate === todayDate;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:6 }}>
        <div style={{ fontSize:12, color:C.inkSoft, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" }}>
          {isToday ? "Today's check-in" : `Check-in for ${checkinDate}`}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input
            type="date"
            value={checkinDate}
            max={todayDate}
            onChange={(e) => { if (!e.target.value) return; setManualDate(true); setCheckinDate(e.target.value); }}
            style={{ fontSize:12.5, padding:"6px 8px", borderRadius:8, border:`1px solid ${C.line}`, background:"#fff", color:C.ink, fontFamily:"Karla,sans-serif" }}
          />
          {!isToday && (
            <button onClick={backToToday} style={{ fontSize:12, color:accent, background:"none", border:"none", cursor:"pointer", fontWeight:600, textDecoration:"underline" }}>
              Back to today
            </button>
          )}
        </div>
      </div>
      <h2 style={{ fontFamily:"Fraunces,serif", fontWeight:400, fontSize:"clamp(22px,3.5vw,28px)", margin:"0 0 6px", color:C.ink, letterSpacing:"-.01em" }}>
        {isToday ? "How are you, today?" : "How were you, that day?"}
      </h2>
      <p style={{ fontSize:14.5, color:C.inkSoft, lineHeight:1.55, margin:"0 0 18px" }}>
        {isToday
          ? "The three essentials below take 30 seconds. Add more when you want a deeper read."
          : "Didn't log this day at the time? That's fine — log it now, as best you remember."}
      </p>

      <Card style={{ padding:22, marginBottom:16 }}>
        <Lbl>In your own words <span style={{ color:C.inkSoft, fontWeight:400 }}>(optional — describe anything that's not in the list below)</span></Lbl>
        <textarea
          value={today.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="e.g. Rough week, barely slept, lower back's been sore, and I've been snapping at people more than usual…"
          rows={3}
          style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontFamily:"Karla,sans-serif", fontSize:13.5, color:C.ink, resize:"vertical", boxSizing:"border-box" }}
        />
        <button onClick={interpretNote} disabled={!today.note?.trim() || interpreting} style={{
          marginTop:10, padding:"9px 14px", borderRadius:10, border:"none",
          background: today.note?.trim() ? accent : "rgba(44,35,32,.15)", color:"#fff",
          fontSize:13, fontWeight:700, cursor: today.note?.trim() && !interpreting ? "pointer" : "not-allowed",
          fontFamily:"Karla,sans-serif", display:"inline-flex", alignItems:"center", gap:7,
        }}>
          <Sparkles size={14}/> {interpreting ? "Reading that…" : "Let AI suggest the fields below"}
        </button>
        <div style={{ fontSize:11.5, color:C.inkSoft, marginTop:8, lineHeight:1.5 }}>
          This only pre-fills suggestions — nothing saves until you tap Save below, and you can adjust anything first.
        </div>
      </Card>

      <Card style={{ padding:22 }}>
        <Lbl>Mood</Lbl>
        <EmojiRow items={MOODS} value={today.mood} onPick={(v) => set("mood",v)} accent={accent}/>

        <Lbl top>Energy</Lbl>
        <EmojiRow items={ENERGY} value={today.energy} onPick={(v) => set("energy",v)} accent={accent}/>


        <Lbl top>Sleep last night · <b style={{ color:C.ink }}>{today.sleep}h</b></Lbl>
        <Stepper
          onMinus={() => set("sleep", Math.max(0, today.sleep - 1))}
          onPlus={()  => set("sleep", Math.min(12, today.sleep + 1))}
          mid={
            <div style={{ flex:1, height:8, borderRadius:99, background:"rgba(44,35,32,.08)" }}>
              <div style={{ width:`${(today.sleep/12)*100}%`, height:"100%", borderRadius:99, background:accent }}/>
            </div>
          }
        />

        <button onClick={() => setExpanded((e) => !e)} style={{ marginTop:18, padding:"10px 14px", borderRadius:11, border:`1px dashed ${C.line}`, background:"transparent", color:C.ink, fontSize:13.5, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, fontFamily:"Karla,sans-serif" }}>
          {expanded ? <><ChevronUp size={15}/> Hide deeper log</> : <><ChevronDown size={15}/> Log more — symptoms, stress, cycle, more</>}
        </button>

        {expanded && (
          <div style={{ marginTop:22, paddingTop:22, borderTop:`1px solid ${C.line}` }}>
            {showsCycle && (
              <>
                <Lbl>Cycle phase <span style={{ color:C.inkSoft, fontWeight:400 }}>(this logs it, same as tapping the calendar)</span></Lbl>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {PHASES.map((p) => (
                    <Chip key={p} active={today.phase===p} onClick={() => set("phase", today.phase===p ? null : p)} accent={accent}>{p}</Chip>
                  ))}
                </div>

                {isMenstrual && (
                  <div style={{ marginTop:14, padding:"14px 16px", borderRadius:12, background:"rgba(196,74,74,.06)", border:"1px solid rgba(196,74,74,.18)" }}>
                    <Lbl>Flow intensity</Lbl>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {FLOW_OPTIONS.map((o) => (
                        <Chip key={o.v} active={today.flowIntensity===o.v} onClick={() => set("flowIntensity", today.flowIntensity===o.v ? null : o.v)} accent="#C44A4A">{o.label}</Chip>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <Lbl top>Anything you noticed?</Lbl>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {SYMPTOMS.map((x) => (
                <Chip key={x} active={today.symptoms.includes(x)} onClick={() => toggleSymptom(x)} accent={accent}>{x}</Chip>
              ))}
            </div>

            {today.symptoms.length > 0 && (
              <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
                {today.symptoms.map((sym) => (
                  <div key={sym} style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <div style={{ fontSize:13, color:C.ink, width:90, fontWeight:600, textTransform:"capitalize" }}>{sym}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {SEVERITY_OPTIONS.map((o) => {
                        const active = (today.symptomSeverity[sym] ?? null) === o.v;
                        return (
                          <button key={o.v} onClick={() => setSeverity(sym, active ? null : o.v)} style={{ padding:"5px 11px", borderRadius:99, border:`1px solid ${active ? accent : C.line}`, background:active?`${accent}1A`:"#fff", color:active?accent:C.inkSoft, fontSize:12, fontWeight:active?700:500, cursor:"pointer", fontFamily:"Karla,sans-serif" }}>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:18 }} className="fb-stress-grid">
              <div>
                <Lbl>Work stress · <b style={{ color:C.ink }}>{today.workStress==null?"tap to set":STRESS_LABELS[today.workStress]}</b></Lbl>
                <ScaleRow icon={Briefcase} value={today.workStress} onPick={(v) => set("workStress",v)} accent="#B25A38"/>
              </div>
              <div>
                <Lbl>Personal stress · <b style={{ color:C.ink }}>{today.personalStress==null?"tap to set":STRESS_LABELS[today.personalStress]}</b></Lbl>
                <ScaleRow icon={Heart} value={today.personalStress} onPick={(v) => set("personalStress",v)} accent="#9A4E5B"/>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:18 }} className="fb-water-grid">
              <div>
                <Lbl>Water · <b style={{ color:C.ink }}>{today.water} glasses</b></Lbl>
                <Stepper
                  onMinus={() => set("water", Math.max(0, today.water - 1))}
                  onPlus={()  => set("water", today.water + 1)}
                  mid={<div style={{ display:"flex", gap:3 }}>{Array.from({length:Math.min(today.water,8)}).map((_,i)=>(<Droplet key={i} size={15} style={{ color:accent }}/>))}</div>}
                />
              </div>
              <div>
                <Lbl>Did you move today?</Lbl>
                <YesNo value={today.moved} onPick={(v) => set("moved",v)} accent={accent}/>
              </div>
            </div>
          </div>
        )}

        <button onClick={save} disabled={!canSave||saving} style={{ marginTop:22, width:"100%", padding:"13px", borderRadius:12, border:"none", background:canSave?accent:"rgba(44,35,32,.15)", color:"#fff", fontSize:15, fontWeight:700, cursor:canSave&&!saving?"pointer":"not-allowed", display:"flex", justifyContent:"center", alignItems:"center", gap:8, opacity:saving?.7:1, fontFamily:"Karla,sans-serif" }}>
          {saving ? "Saving…" : logged ? <><CheckCircle2 size={16}/> {isToday ? "Logged for today" : `Logged for ${checkinDate}`} · update</> : <><CalendarHeart size={16}/> Save check-in</>}
        </button>
      </Card>
      <style>{`@media(max-width:540px){.fb-stress-grid,.fb-water-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}

/* ── Chart tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:10, padding:"9px 12px", boxShadow:"0 4px 14px -8px rgba(60,30,20,.18)" }}>
      <div style={{ fontWeight:700, fontSize:12.5, color:C.ink, marginBottom:6 }}>{label}</div>
      {payload.map((p) => {
        let valueLabel = p.value;
        if (p.dataKey==="mood")   valueLabel = `${p.value} · ${MOOD_LABELS[Math.round(p.value)]||""}`;
        if (p.dataKey==="energy") valueLabel = `${p.value} · ${ENERGY_LABELS[Math.round(p.value)]||""}`;
        if (p.dataKey==="sleep")  valueLabel = `${p.value}h`;
        return (
          <div key={p.dataKey} style={{ fontSize:12, color:C.inkSoft, lineHeight:1.5 }}>
            <span style={{ color:p.color, fontWeight:700, marginRight:5 }}>●</span>
            {p.name}: {valueLabel}
          </div>
        );
      })}
    </div>
  );
}

/* ── Patterns card ────────────────────────────────────────── */
function calculatePatterns(entries) {
  const real = entries.filter((e) => e.mood != null);
  const out  = { totalDays:real.length, phaseStats:null, sleepEnergy:null, bestWorstPhase:null };
  if (real.length < 8) return out;
  const groups = {};
  real.forEach((e) => { const p = e.cycle_phase; if (!p||p==="N/A") return; (groups[p]=groups[p]||[]).push(e); });
  const phaseStats = {};
  Object.entries(groups).forEach(([phase,list]) => {
    const av = (key) => { const vals=list.filter((e)=>e[key]!=null).map((e)=>e[key]); return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null; };
    phaseStats[phase] = { count:list.length, mood:av("mood"), energy:av("energy"), sleep:av("sleep_hours") };
  });
  out.phaseStats = phaseStats;
  const moodByPhase = Object.entries(phaseStats).filter(([,s])=>s.count>=2&&s.mood!=null).sort((a,b)=>b[1].mood-a[1].mood);
  if (moodByPhase.length>=2) {
    const diff = moodByPhase[0][1].mood - moodByPhase[moodByPhase.length-1][1].mood;
    if (diff>=0.5) out.bestWorstPhase = { best:moodByPhase[0][0], worst:moodByPhase[moodByPhase.length-1][0], diff };
  }
  const pairs = real.filter((e)=>e.sleep_hours!=null&&e.energy!=null);
  if (pairs.length>=6) {
    const shortP=pairs.filter((e)=>e.sleep_hours<6.5), longP=pairs.filter((e)=>e.sleep_hours>=6.5);
    if (shortP.length>=2&&longP.length>=2) {
      const shortAvg=shortP.reduce((s,e)=>s+e.energy,0)/shortP.length;
      const longAvg =longP.reduce((s,e)=>s+e.energy,0)/longP.length;
      const diff=longAvg-shortAvg;
      if (Math.abs(diff)>=0.4) out.sleepEnergy={shortAvg,longAvg,diff};
    }
  }
  return out;
}

function PatternsCard({ entries, accent }) {
  const p    = useMemo(() => calculatePatterns(entries), [entries]);
  const need = Math.max(0, 8 - p.totalDays);
  const phasePillStyle = (color) => ({ display:"inline-block", padding:"2px 9px", borderRadius:99, background:`${color}22`, color, fontSize:12, fontWeight:700 });

  if (p.totalDays < 8) {
    return (
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10 }}>
          <Sparkles size={16} style={{ color:accent }}/>
          <div style={{ fontFamily:"Fraunces,serif", fontSize:"clamp(17px,4vw,20px)", color:C.ink }}>Your patterns</div>
        </div>
        <div style={{ fontSize:14, color:C.inkSoft, lineHeight:1.55, marginBottom:14 }}>
          {p.totalDays===0
            ? "Once you've logged a few days, real patterns will surface here — your mood across phases, what sleep does to your energy, which symptoms cluster when."
            : `${p.totalDays} day${p.totalDays===1?"":"s"} logged. ${need} more to start measuring patterns honestly.`}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {Array.from({length:8}).map((_,i)=>(<div key={i} style={{ flex:1, height:4, borderRadius:99, background:i<p.totalDays?accent:"rgba(44,35,32,.08)" }}/>))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
        <Sparkles size={16} style={{ color:accent }}/>
        <div style={{ fontFamily:"Fraunces,serif", fontSize:"clamp(17px,4vw,20px)", color:C.ink }}>Your patterns</div>
        <div style={{ marginLeft:"auto", fontSize:12, color:C.inkSoft }}>{p.totalDays} days · measured</div>
      </div>
      {p.bestWorstPhase && (
        <div style={{ marginBottom:16, padding:"12px 14px", borderRadius:12, background:"rgba(44,35,32,.03)" }}>
          <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>
            Your mood runs about <b>{p.bestWorstPhase.diff.toFixed(1)} points higher</b> in your{" "}
            <span style={phasePillStyle(PHASE_COLOR[p.bestWorstPhase.best])}>{p.bestWorstPhase.best}</span>{" "}
            phase than in your{" "}
            <span style={phasePillStyle(PHASE_COLOR[p.bestWorstPhase.worst])}>{p.bestWorstPhase.worst}</span>{" "}
            phase — worth knowing as you plan ahead.
          </div>
        </div>
      )}
      {p.phaseStats && Object.keys(p.phaseStats).length>=2 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:C.inkSoft, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Mood by phase</div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {Object.entries(p.phaseStats).filter(([,s])=>s.count>=2&&s.mood!=null).sort((a,b)=>b[1].mood-a[1].mood).map(([phase,s])=>(
              <div key={phase} style={{ display:"flex", alignItems:"center", gap:11 }}>
                <div style={{ width:80, fontSize:13, color:C.ink, fontWeight:600 }}>{phase}</div>
                <div style={{ flex:1, height:8, borderRadius:99, background:"rgba(44,35,32,.07)", overflow:"hidden" }}>
                  <div style={{ width:`${(s.mood/5)*100}%`, height:"100%", background:PHASE_COLOR[phase]||accent }}/>
                </div>
                <div style={{ width:38, fontSize:12, color:C.inkSoft, textAlign:"right" }}>{s.mood.toFixed(1)}/5</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {p.sleepEnergy && (
        <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(44,35,32,.03)" }}>
          <div style={{ fontSize:13, color:C.ink, lineHeight:1.6 }}>
            On days you sleep <b>7 hours or more</b>, your energy runs <b>{Math.abs(p.sleepEnergy.diff).toFixed(1)} points {p.sleepEnergy.diff>0?"higher":"lower"}</b> than on shorter nights.
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function Tracking({ stage, accent }) {
  const { user, profile } = useAuth();
  const [today, setToday] = useState({
    mood:null, sleep:7, water:4, moved:false, energy:null,
    workStress:null, personalStress:null, phase:null, symptoms:[],
    flowIntensity:null, symptomSeverity:{}, note:"",
  });
  const [logged,  setLogged]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [entries, setEntries] = useState([]);
  const [phaseLogs, setPhaseLogs] = useState([]);
  const [phaseNow, setPhaseNow] = useState(null);
  const [interpreting, setInterpreting] = useState(false);
  const showsCycle = !["elder"].includes(stage);
  const todayDate  = useCurrentDate();
  // The date this check-in form is currently editing. Defaults to today,
  // but "Log a different day" can point it at any past date — the whole
  // form (load + save) follows this instead of always being locked to today.
  const [checkinDate, setCheckinDate] = useState(todayDate);
  // Keep checkinDate following today's real date UNLESS the person has
  // manually picked a different day to edit.
  const [manualDate, setManualDate] = useState(false);
  useEffect(() => { if (!manualDate) setCheckinDate(todayDate); }, [todayDate, manualDate]);

  const stats = useMemo(() => computeCycleStats(phaseLogs), [phaseLogs]);
  const wheelData = useMemo(() => buildCurrentCycleWheelData(phaseLogs, todayDate), [phaseLogs, todayDate]);

  const reloadPhaseData = useCallback(async () => {
    if (!user) return;
    const [logs, now] = await Promise.all([getPhaseLogs(user.id, null, null), currentPhase(user.id)]);
    setPhaseLogs(logs);
    setPhaseNow(now);
  }, [user]);

  useEffect(() => { reloadPhaseData(); }, [reloadPhaseData]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const data = await getRecentEntries(user.id, 28);
        if (active) setEntries(data);
      } catch (e) { console.error("load entries", e); }
    })();
    return () => { active = false; };
  }, [user, todayDate]);

  useEffect(() => {
    if (!user || !checkinDate) return;
    let active = true;
    (async () => {
      // Prefer the already-loaded 28-day cache (covers today and the recent
      // past); fall back to a direct fetch for dates further back (e.g.
      // "log last month").
      const cached = entries.find((e) => e.entry_date === checkinDate);
      const row = cached || await getEntryForDate(user.id, checkinDate);
      if (!active) return;
      if (row) {
        setToday({
          mood:           row.mood,
          sleep:          row.sleep_hours       ?? 7,
          water:          row.water_glasses      ?? 4,
          moved:          !!row.moved,
          energy:         row.energy,
          workStress:     row.work_stress,
          personalStress: row.personal_stress,
          phase:          row.cycle_phase        || null,
          symptoms:       row.symptoms           || [],
          flowIntensity:  row.flow_intensity     || null,
          symptomSeverity:row.symptom_severity   || {},
          note:           row.note               || "",
        });
        setLogged(true);
      } else {
        setToday({ mood:null, sleep:7, water:4, moved:false, energy:null, workStress:null, personalStress:null, phase:null, symptoms:[], flowIntensity:null, symptomSeverity:{}, note:"" });
        setLogged(false);
      }
    })();
    return () => { active = false; };
  }, [user, checkinDate, entries]);

  const chartData = useMemo(() => buildChartData(entries.slice(-14), 14), [entries]);
  const realDays  = entries.filter((e) => e.mood != null).length;

  const set            = (k, v) => { setToday((t) => ({...t, [k]:v})); setLogged(false); };
  const toggleSymptom  = (x)    => set("symptoms", today.symptoms.includes(x) ? today.symptoms.filter((i)=>i!==x) : [...today.symptoms, x]);
  const setSeverity    = (sym, val) => {
    setToday((t) => {
      const updated = {...t.symptomSeverity};
      if (val == null) delete updated[sym];
      else updated[sym] = val;
      return {...t, symptomSeverity:updated};
    });
    setLogged(false);
  };

  const PHASE_TO_ENUM = { Menstrual:"menstrual", Follicular:"follicular", Ovulation:"ovulation", Luteal:"luteal" };

  const save = async () => {
    if (!user || saving || today.mood == null) return;
    setSaving(true);
    try {
      const row = await saveTodayEntry(user.id, today, checkinDate);
      setEntries((prev) => {
        const others = prev.filter((e) => e.entry_date !== row.entry_date);
        return [...others, row].sort((a,b) => a.entry_date.localeCompare(b.entry_date));
      });
      setLogged(true);
      // The check-in's phase chip is another way of saying "log this phase" —
      // it should count the same as tapping the calendar, not silently write
      // to a different place. "N/A" or no selection means nothing to log.
      const enumPhase = PHASE_TO_ENUM[today.phase];
      if (enumPhase) {
        await logPhaseForToday(user.id, enumPhase, checkinDate);
        reloadPhaseData();
      }
    } catch (e) { console.error("save", e); }
    finally { setSaving(false); }
  };

  const backToToday = () => { setManualDate(false); setCheckinDate(todayDate); };

  // Natural-language interpretation: send her free text to the companion,
  // pre-fill whatever it could confidently extract. Nothing is saved here —
  // she still reviews the (now pre-filled) form and taps Save herself.
  const interpretNote = async () => {
    if (!today.note?.trim() || interpreting) return;
    setInterpreting(true);
    try {
      const result = await parseCheckinText({ text: today.note, userId: user?.id });
      setToday((t) => {
        const next = { ...t };
        if (result.mood != null)   next.mood = result.mood;
        if (result.energy != null) next.energy = result.energy;
        if (result.sleep_hours != null) next.sleep = result.sleep_hours;
        if (result.work_stress != null) next.workStress = result.work_stress;
        if (result.personal_stress != null) next.personalStress = result.personal_stress;
        if (result.phase) {
          const titleCase = result.phase.charAt(0).toUpperCase() + result.phase.slice(1);
          next.phase = titleCase;
        }
        if (Array.isArray(result.symptoms) && result.symptoms.length) {
          next.symptoms = Array.from(new Set([...(t.symptoms || []), ...result.symptoms]));
        }
        if (Array.isArray(result.extra_symptoms) && result.extra_symptoms.length) {
          // Freeform symptoms with no matching preset chip — fold into the
          // note itself so nothing she said gets silently dropped.
          next.note = `${t.note}${t.note.endsWith(".") || t.note.endsWith("\n") ? "" : "."} (Also: ${result.extra_symptoms.join(", ")})`;
        }
        setLogged(false);
        return next;
      });
    } catch (e) { console.error("interpretNote", e); }
    finally { setInterpreting(false); }
  };

  return (
    <div style={{ paddingBottom:60 }}>
      <TrackHero entries={entries} accent={accent} todayLogged={logged} phaseNow={phaseNow} stats={stats} wheelData={wheelData}/>
      <div className="fb-track-mid" style={{ display:"grid", gap:18, gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr)" }}>
        <div>
          <CheckInPanel today={today} set={set} toggleSymptom={toggleSymptom} setSeverity={setSeverity} save={save} saving={saving} logged={logged} accent={accent} showsCycle={showsCycle} checkinDate={checkinDate} todayDate={todayDate} manualDate={manualDate} setManualDate={setManualDate} setCheckinDate={setCheckinDate} backToToday={backToToday} interpretNote={interpretNote} interpreting={interpreting}/>
        </div>
        {showsCycle && (
          <div>
            <Card>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
                <CalendarHeart size={16} style={{ color:accent }}/>
                <div style={{ fontFamily:"Fraunces,serif", fontSize:"clamp(17px,3.5vw,20px)", color:C.ink }}>Your cycle calendar</div>
              </div>
              <CycleCalendarV2 userId={user?.id} logs={phaseLogs} accent={accent} onChanged={reloadPhaseData} todayDate={todayDate}/>
            </Card>
          </div>
        )}
      </div>
      <style>{`@media(max-width:900px){.fb-track-mid{grid-template-columns:1fr!important;}}`}</style>

      {realDays > 0 && (
        <Card style={{ marginTop:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
            <Activity size={16} style={{ color:accent }}/>
            <div style={{ fontFamily:"Fraunces,serif", fontSize:"clamp(17px,4vw,20px)", color:C.ink }}>Your last two weeks</div>
            <div style={{ marginLeft:"auto", fontSize:12, color:C.inkSoft }}>{realDays} day{realDays===1?"":"s"} logged</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top:8, right:8, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="g-mood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={.4}/><stop offset="100%" stopColor={accent} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g-energy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9893F" stopOpacity={.3}/><stop offset="100%" stopColor="#C9893F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.line} vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize:11, fill:C.inkSoft }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis domain={[1,5]} ticks={[1,3,5]} tick={{ fontSize:10, fill:C.inkSoft }} axisLine={false} tickLine={false} width={18}/>
              <Tooltip content={<ChartTooltip/>} cursor={{ stroke:C.line, strokeWidth:1 }}/>
              <Area type="monotone" dataKey="mood"   stroke={accent}   strokeWidth={2.4} fill="url(#g-mood)"   name="Mood"/>
              <Area type="monotone" dataKey="energy" stroke="#C9893F" strokeWidth={2.2} fill="url(#g-energy)" name="Energy"/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:18, marginTop:10, fontSize:12, color:C.inkSoft }}>
            <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:9, height:9, borderRadius:"50%", background:accent }}/>Mood</span>
            <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:9, height:9, borderRadius:"50%", background:"#C9893F" }}/>Energy</span>
          </div>
        </Card>
      )}

      <div style={{ marginTop:18 }}>
        <PatternsCard entries={entries} accent={accent}/>
      </div>

      <ReportsPanel accent={accent} showsCycle={showsCycle}/>
    </div>
  );
}

/* ── Form atoms ───────────────────────────────────────────── */
const Lbl = ({ children, top }) => (
  <div style={{ fontSize:13.5, color:C.inkSoft, margin:top?"18px 0 10px":"0 0 10px" }}>{children}</div>
);

const Chip = ({ children, active, onClick, accent }) => (
  <button onClick={onClick} style={{ padding:"8px 12px", borderRadius:99, border:`1px solid ${active?accent:C.line}`, background:active?`${accent}1A`:"#fff", color:active?accent:C.ink, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"Karla,sans-serif" }}>{children}</button>
);

const Stepper = ({ onMinus, onPlus, mid }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <button onClick={onMinus} style={btnStyle}><Minus size={14}/></button>
    {mid}
    <button onClick={onPlus} style={btnStyle}><Plus size={14}/></button>
  </div>
);

const btnStyle = { width:32, height:32, borderRadius:9, border:`1px solid ${C.line}`, background:"transparent", cursor:"pointer", display:"grid", placeItems:"center", color:C.ink };

const EmojiRow = ({ items, value, onPick, accent }) => (
  <div style={{ display:"grid", gridTemplateColumns:`repeat(${items.length},1fr)`, gap:8 }}>
    {items.map(({ icon:Icon, label, v }) => {
      const active = value===v;
      return (
        <button key={v} onClick={() => onPick(v)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"10px 4px", borderRadius:12, border:`1px solid ${active?accent:C.line}`, background:active?`${accent}14`:"#fff", color:active?accent:C.ink, cursor:"pointer", fontFamily:"Karla,sans-serif" }}>
          <Icon size={20}/><span style={{ fontSize:11.5, fontWeight:active?700:500 }}>{label}</span>
        </button>
      );
    })}
  </div>
);

const YesNo = ({ value, onPick, accent }) => (
  <div style={{ display:"flex", gap:8 }}>
    {[{k:true,l:"Yes"},{k:false,l:"Not yet"}].map((o) => {
      const active = value===o.k;
      return (
        <button key={String(o.k)} onClick={() => onPick(o.k)} style={{ flex:1, padding:"12px", borderRadius:12, border:`1px solid ${active?accent:C.line}`, background:active?`${accent}14`:"#fff", color:active?accent:C.ink, fontSize:13.5, fontWeight:active?700:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, fontFamily:"Karla,sans-serif" }}>
          <Footprints size={15}/> {o.l}
        </button>
      );
    })}
  </div>
);

const ScaleRow = ({ icon:Icon, value, onPick, accent }) => (
  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
    {[1,2,3,4,5].map((n) => {
      const active    = value===n;
      const intensity = active ? 1 : 0.16+(n-1)*0.08;
      return (
        <button key={n} onClick={() => onPick(n)} style={{ padding:10, borderRadius:11, border:`1px solid ${active?accent:C.line}`, background:`${accent}${Math.round(intensity*22).toString(16).padStart(2,"0")}`, color:active?accent:C.inkSoft, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <Icon size={14}/><span style={{ fontSize:10, fontWeight:active?700:500 }}>{n===1?"Low":n===5?"Heavy":""}</span>
        </button>
      );
    })}
  </div>
);
