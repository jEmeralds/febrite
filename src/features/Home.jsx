import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, MessageCircle, BookOpen, CalendarHeart, Phone, ChevronRight,
  CheckCircle2, ThumbsUp, ThumbsDown, RefreshCw, TrendingUp, TrendingDown,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Card, C } from "../components/ui";
import { fetchDailyRead } from "../lib/companion";
import { getRecentEntries, hasCheckedInToday } from "../lib/trackingApi";
import { recentObservations } from "../lib/observations";
import { getPhaseLogs, derivePhaseNow, buildCurrentCycleWheelData, computeCycleStats } from "../lib/cyclePhases";
import MiniCycleWheel from "../components/MiniCycleWheel";
import { useCurrentDate } from "../lib/useCurrentDate";

const PHASE_COLOR = {
  menstrual: "#C44A4A", follicular: "#3F7B5A", ovulation: "#D08C3B", luteal: "#7E5FA4",
};
const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };

/* ============================================================
   DAILY READ — the Gemini paragraph at the top of Home

   The card's background tint comes from the user's current cycle
   phase (rose / sage / amber / plum), now sourced from real logs
   instead of fixed-math prediction.
   ============================================================ */
function DailyReadCard({ profile, accent, phaseNow }) {
  const { user } = useAuth();
  const [state, setState] = useState({ text: "", loading: true });
  const [feedback, setFeedback] = useState(null); // null | "up" | "down"
  const todayDate = useCurrentDate(); // ticks at midnight

  const tint = phaseNow ? (PHASE_COLOR[phaseNow.phase] || accent) : accent;

  useEffect(() => {
    let alive = true;
    setState({ text: "", loading: true });
    fetchDailyRead({ profile, userId: user?.id }).then((res) => {
      if (alive) setState({ text: res.text, loading: false });
    });
    return () => { alive = false; };
  }, [user?.id, profile?.life_stage, todayDate]);

  const regenerate = async () => {
    setState({ text: "", loading: true });
    const res = await fetchDailyRead({ profile, userId: user?.id, force: true });
    setState({ text: res.text, loading: false });
    setFeedback(null);
  };

  return (
    <Card style={{
      marginBottom: 22, padding: "28px 28px 22px",
      background: `radial-gradient(110% 60% at 80% 0%, ${tint}1F, ${C.card} 70%)`,
      borderColor: `${tint}26`,
      transition: "background .6s ease, border-color .6s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${tint}1F`, color: tint,
          display: "grid", placeItems: "center",
          transition: "background .6s ease, color .6s ease",
        }}>
          <Sparkles size={15}/>
        </div>
        <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Your read for today
        </div>
        {!state.loading && (
          <button onClick={regenerate} title="Regenerate" style={{
            marginLeft: "auto", background: "transparent", border: "none",
            color: C.inkSoft, cursor: "pointer", padding: 6,
            display: "inline-flex", alignItems: "center",
          }}>
            <RefreshCw size={14}/>
          </button>
        )}
      </div>

      {state.loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 14, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "92%" }}/>
          <div style={{ height: 14, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "85%" }}/>
          <div style={{ height: 14, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "60%" }}/>
        </div>
      ) : (
        <div style={{
          fontFamily: "Fraunces, serif", fontWeight: 400,
          fontSize: "clamp(19px,2.6vw,24px)", lineHeight: 1.5,
          color: C.ink, letterSpacing: "-.005em",
        }}>
          {state.text}
        </div>
      )}

      {!state.loading && state.text && feedback === null && (
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: C.inkSoft }}>How does that read?</span>
          <button onClick={() => setFeedback("up")} style={feedbackBtn(C.inkSoft)} aria-label="Good read"><ThumbsUp size={13}/></button>
          <button onClick={() => setFeedback("down")} style={feedbackBtn(C.inkSoft)} aria-label="Bad read"><ThumbsDown size={13}/></button>
        </div>
      )}
      {feedback && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: C.inkSoft, fontStyle: "italic" }}>
          {feedback === "up" ? "Thanks — I'll keep this tone." : "Got it — try Regenerate above for a different angle."}
        </div>
      )}
    </Card>
  );
}

const feedbackBtn = (color) => ({
  background: "transparent", border: `1px solid ${C.line}`,
  width: 28, height: 28, borderRadius: 8,
  cursor: "pointer", color, display: "grid", placeItems: "center",
});

/* ============================================================
   QUICK ACTIONS — three or four meaningful one-taps from Home
   ============================================================ */
function QuickActions({ go, accent, profile, todayLogged, phaseNow }) {
  const phase = phaseNow?.phase;

  const supportPick = useMemo(() => {
    const people = profile?.support_people || [];
    if (!people.length) return null;
    const lower = (s) => (s || "").toLowerCase();
    const phaseHint = {
      menstrual: ["period","cramps","menstrual","pain"],
      luteal:    ["pms","anxious","anxiety","mood","sad"],
      ovulation: ["energy","social"],
      follicular:["plan","motivat"],
    }[phase] || [];
    const hit = people.find((p) => phaseHint.some((h) => lower(p.when_to_reach).includes(h)));
    return hit || people[0];
  }, [profile?.support_people, phase]);

  const actions = [
    todayLogged
      ? { icon: CheckCircle2, label: "Today's check-in", sub: "Logged · open Track", on: () => go("track"), tone: "done" }
      : { icon: CalendarHeart, label: "Today's check-in", sub: "30 seconds keeps the read accurate", on: () => go("track"), tone: "primary" },
    { icon: BookOpen,      label: "Ask FeBrite",       sub: "Answers shaped by you",          on: () => go("library") },
    { icon: MessageCircle, label: "Talk to companion", sub: "When you'd rather just talk",    on: () => go("companion") },
    supportPick && {
      icon: Phone,
      label: `Reach ${supportPick.name}`,
      sub: supportPick.when_to_reach || supportPick.relationship || "Your support person",
      on: () => go("resources"),
    },
  ].filter(Boolean);

  return (
    <div style={{
      display: "grid", gap: 12,
      gridTemplateColumns: `repeat(auto-fit, minmax(min(220px,100%),1fr))`,
      marginBottom: 22,
    }}>
      {actions.map((a) => (
        <button key={a.label} onClick={a.on} style={{
          textAlign: "left", padding: "16px 16px", borderRadius: 14,
          border: `1px solid ${a.tone === "primary" ? accent : C.line}`,
          background: a.tone === "primary" ? `${accent}10` : C.card,
          cursor: "pointer", fontFamily: "Karla, sans-serif",
          display: "flex", alignItems: "center", gap: 12,
          transition: ".15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: a.tone === "primary" ? accent : `${accent}14`,
            color: a.tone === "primary" ? "#fff" : accent,
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <a.icon size={17}/>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{a.label}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.35 }}>{a.sub}</div>
          </div>
          <ChevronRight size={16} style={{ color: C.inkSoft, flexShrink: 0 }}/>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   CYCLE SNAPSHOT + OBSERVATIONS — paired panel
   ============================================================ */
function CycleAndObservations({ profile, entries, accent, go, phaseNow, wheelData, stats }) {
  const observations = useMemo(() => recentObservations(entries), [entries]);
  const phaseColor = phaseNow ? PHASE_COLOR[phaseNow.phase] || accent : accent;
  const isElder = profile?.life_stage === "elder";

  // Only shown if we actually have enough logged history to know an
  // average cycle length — never a guessed/preset date.
  const predictedNextPeriod = (wheelData && stats?.avgCycleLength)
    ? (() => {
        const d = new Date(wheelData.cycleStart + "T00:00:00");
        d.setDate(d.getDate() + Math.round(stats.avgCycleLength));
        return d;
      })()
    : null;

  return (
    <div style={{
      display: "grid", gap: 18,
      gridTemplateColumns: isElder ? "1fr" : "minmax(0, 1fr) minmax(0, 1.4fr)",
    }} className="fb-home-bottom">
      {!isElder && (
      <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {phaseNow ? (
          <>
            {wheelData && <MiniCycleWheel wheelData={wheelData} currentPhase={phaseNow} size={130}/>}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                Your cycle
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, lineHeight: 1.25, marginBottom: 6 }}>
                Day {phaseNow.dayInPhase} · <span style={{ color: phaseColor }}>{PHASE_TITLE[phaseNow.phase]}</span>
              </div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
                {predictedNextPeriod
                  ? <>Period predicted around <b style={{ color: C.ink }}>{predictedNextPeriod.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</b>, based on your {stats.cyclesObserved} logged cycle{stats.cyclesObserved===1?"":"s"}.</>
                  : wheelData
                    ? "Log a couple more cycles and we'll estimate your next period from your real average — not a guess."
                    : "Log a menstrual (period) start on the calendar and we'll start showing your full cycle picture here."}
              </div>
              <button onClick={() => go("track")} style={{
                fontSize: 13, fontWeight: 700, padding: "8px 14px",
                background: "transparent", border: `1px solid ${C.line}`,
                color: C.ink, borderRadius: 10, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "Karla, sans-serif",
              }}>
                Open Track <ChevronRight size={14}/>
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "10px 4px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, color: C.ink, marginBottom: 6 }}>
              Log your first phase
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Tap a day on your Track calendar to log when your period (or another phase) actually started — the rest of FeBrite shapes around it.
            </div>
            <button onClick={() => go("track")} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 14px",
              background: C.clay, color: "#fff", border: "none",
              borderRadius: 10, cursor: "pointer", fontFamily: "Karla, sans-serif",
            }}>
              Log today
            </button>
          </div>
        )}
      </Card>
      )}

      {/* Observations */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <Sparkles size={15} style={{ color: accent }}/>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(16px,3.5vw,19px)", color: C.ink }}>
            What's been going on
          </div>
        </div>
        {observations.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
            Once you've logged a few days, real observations from your data will show up here — things like sleep streaks, mood trends, and symptoms that have been recurring.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {observations.map((o, i) => (
              <li key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 9,
                padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7,
                  background: o.tone === "good" ? "#3F7B5A14" : "#B25A381A",
                  color: o.tone === "good" ? "#3F7B5A" : "#B25A38",
                  display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1,
                }}>
                  {o.tone === "good" ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                </div>
                <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.55 }}>{o.text}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <style>{`
        @media (max-width: 880px) {
          .fb-home-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Home({ stage, accent, go }) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [todayLogged, setTodayLogged] = useState(false);
  const [phaseLogs, setPhaseLogs] = useState([]);
  const todayDate = useCurrentDate();

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const [data, logged, logs] = await Promise.all([
          getRecentEntries(user.id, 14),
          hasCheckedInToday(user.id),
          getPhaseLogs(user.id, null, null),
        ]);
        if (!alive) return;
        setEntries(data);
        setTodayLogged(logged);
        setPhaseLogs(logs);
      } catch (e) { console.error("home load", e); }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // Single source of truth, derived once, shared by every card below —
  // nothing on this page can disagree with the Track page again.
  const phaseNow = useMemo(() => derivePhaseNow(phaseLogs, todayDate), [phaseLogs, todayDate]);
  const wheelData = useMemo(() => buildCurrentCycleWheelData(phaseLogs, todayDate), [phaseLogs, todayDate]);
  const stats = useMemo(() => computeCycleStats(phaseLogs), [phaseLogs]);

  return (
    <div style={{ paddingBottom: 50 }}>
      {/* Greeting line */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 style={{
          fontFamily: "Fraunces, serif", fontWeight: 400,
          fontSize: "clamp(28px,4.5vw,40px)", margin: 0, color: C.ink,
          letterSpacing: "-.015em", lineHeight: 1.1,
        }}>
          {profile?.display_name ? `Hi, ${profile.display_name.split(" ")[0]}.` : "Welcome back."}
        </h1>
      </div>

      <DailyReadCard profile={profile} accent={accent} phaseNow={phaseNow}/>
      <QuickActions go={go} accent={accent} profile={profile} todayLogged={todayLogged} phaseNow={phaseNow}/>
      <CycleAndObservations profile={profile} entries={entries} accent={accent} go={go} phaseNow={phaseNow} wheelData={wheelData} stats={stats}/>
    </div>
  );
}
