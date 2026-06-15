import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, MessageCircle, BookOpen, CalendarHeart, Phone, ChevronRight,
  CheckCircle2, ThumbsUp, ThumbsDown, RefreshCw, TrendingUp, TrendingDown,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Card, C } from "../components/ui";
import { fetchDailyRead } from "../lib/companion";
import { getRecentEntries, hasCheckedInToday } from "../lib/tracking";
import { recentObservations } from "../lib/observations";
import { currentCyclePhase } from "../lib/cycleMath";
import { useCurrentDate } from "../lib/useCurrentDate";

const PHASE_COLOR = {
  Menstrual: "#C44A4A", Follicular: "#3F7B5A", Ovulation: "#D08C3B", Luteal: "#7E5FA4",
};

/* ============================================================
   MINI CYCLE WHEEL — compact version for Home's cycle snapshot
   ============================================================ */
function MiniCycleWheel({ profile, size = 130 }) {
  const cyc = currentCyclePhase(profile);
  if (!cyc) return null;
  const cycleLen  = cyc.cycleLen;
  const periodLen = Math.max(2, Math.min(10, profile?.period_length || 5));
  const ovDay     = cycleLen - 14;
  const phaseColor = PHASE_COLOR[cyc.phase] || C.clay;

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 11;
  const sw = 11;

  const phases = [
    { name: "Menstrual",  start: 1,             end: periodLen },
    { name: "Follicular", start: periodLen + 1, end: ovDay - 2 },
    { name: "Ovulation",  start: ovDay - 1,     end: ovDay + 1 },
    { name: "Luteal",     start: ovDay + 2,     end: cycleLen },
  ];
  const dayToDeg = (d) => ((d - 1) / cycleLen) * 360;
  const polar = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (a, b) => {
    const [x1, y1] = polar(a, r);
    const [x2, y2] = polar(b, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const todayDeg = dayToDeg(cyc.dayInCycle);
  const [mx, my] = polar(todayDeg, r);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(44,35,32,.05)" strokeWidth={sw}/>
      {phases.map((p) => {
        const a = dayToDeg(p.start);
        const b = p.end >= cycleLen ? 360 : dayToDeg(p.end + 1);
        return (
          <path key={p.name} d={arc(a, b)} fill="none"
                stroke={PHASE_COLOR[p.name]} strokeWidth={sw}
                opacity={p.name === cyc.phase ? 1 : 0.25}/>
        );
      })}
      <circle cx={mx} cy={my} r={8} fill="#fff" stroke={phaseColor} strokeWidth={2.5}/>
      <circle cx={mx} cy={my} r={3} fill={phaseColor}/>
      <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="Fraunces, serif"
            fontSize={28} fill={C.ink}>{cyc.dayInCycle}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontFamily="Karla, sans-serif"
            fontSize={9.5} fontWeight={700} fill={phaseColor} letterSpacing=".1em">
        {cyc.phase.toUpperCase()}
      </text>
    </svg>
  );
}

/* ============================================================
   DAILY READ — the Gemini paragraph at the top of Home

   The card's background tint comes from the user's current cycle
   phase (rose / sage / amber / plum). This is the variety the user
   was asking for — the card "feels alive" because its color
   subtly shifts as her body moves through the month — without
   the visual chaos of randomizing the whole card every load.
   ============================================================ */
const PHASE_TINT = {
  Menstrual:  "#C44A4A",
  Follicular: "#3F7B5A",
  Ovulation:  "#D08C3B",
  Luteal:     "#7E5FA4",
};

function DailyReadCard({ profile, accent }) {
  const { user } = useAuth();
  const [state, setState] = useState({ text: "", loading: true });
  const [feedback, setFeedback] = useState(null); // null | "up" | "down"
  const todayDate = useCurrentDate(); // ticks at midnight

  // The tint color = current phase color, or default accent if
  // we don't know a phase (elder users, or anyone without
  // cycle_start_date set).
  const cyc = currentCyclePhase(profile);
  const tint = cyc ? (PHASE_TINT[cyc.phase] || accent) : accent;

  useEffect(() => {
    let alive = true;
    setState({ text: "", loading: true });
    fetchDailyRead({ profile, userId: user?.id }).then((res) => {
      if (alive) setState({ text: res.text, loading: false });
    });
    return () => { alive = false; };
  }, [user?.id, profile?.life_stage, profile?.cycle_start_date, todayDate]);

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
function QuickActions({ go, accent, profile, todayLogged }) {
  const cyc = currentCyclePhase(profile);
  const phase = cyc?.phase;

  // Phase-aware support-person pick: if she has support people configured,
  // surface one matching the current phase, else pick the first.
  const supportPick = useMemo(() => {
    const people = profile?.support_people || [];
    if (!people.length) return null;
    const lower = (s) => (s || "").toLowerCase();
    const phaseHint = {
      Menstrual: ["period","cramps","menstrual","pain"],
      Luteal:    ["pms","anxious","anxiety","mood","sad"],
      Ovulation: ["energy","social"],
      Follicular:["plan","motivat"],
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
function CycleAndObservations({ profile, entries, accent, go }) {
  const cyc = currentCyclePhase(profile);
  const observations = useMemo(() => recentObservations(entries), [entries]);
  const phaseColor = cyc ? PHASE_COLOR[cyc.phase] || accent : accent;

  // For elder users (post-menopause), the cycle snapshot is not
  // relevant. Hide the cycle card and let the observations panel
  // take the full row instead. The cycle math is a non-event for
  // someone who finished menstruating years ago, and surfacing it
  // is a small daily reminder of something they may have come to
  // peace with. Observations + daily read are still meaningful.
  const isElder = profile?.life_stage === "elder";

  return (
    <div style={{
      display: "grid", gap: 18,
      gridTemplateColumns: isElder ? "1fr" : "minmax(0, 1fr) minmax(0, 1.4fr)",
    }} className="fb-home-bottom">
      {!isElder && (
      <Card style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {cyc ? (
          <>
            <MiniCycleWheel profile={profile} size={130}/>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                Your cycle
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, lineHeight: 1.25, marginBottom: 6 }}>
                Day {cyc.dayInCycle} · <span style={{ color: phaseColor }}>{cyc.phase}</span>
              </div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
                ~{cyc.daysUntilPeriod} day{cyc.daysUntilPeriod === 1 ? "" : "s"} until your next period.
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px",
                borderRadius: 99, background: `${phaseColor}14`, color: phaseColor,
                fontSize: 12, fontWeight: 700, marginBottom: 12,
              }}>
                <CalendarHeart size={12}/>
                Period predicted {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + cyc.daysUntilPeriod);
                  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                })()}
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
              Set your cycle date
            </div>
            <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              Add your last period's start date in your profile and the rest of FeBrite shapes around it.
            </div>
            <button onClick={() => go("track")} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 14px",
              background: C.clay, color: "#fff", border: "none",
              borderRadius: 10, cursor: "pointer", fontFamily: "Karla, sans-serif",
            }}>
              Set up
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

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const data = await getRecentEntries(user.id, 14);
        if (!alive) return;
        setEntries(data);
        const logged = await hasCheckedInToday(user.id);
        if (alive) setTodayLogged(logged);
      } catch (e) { console.error("home load", e); }
    })();
    return () => { alive = false; };
  }, [user?.id]);

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

      <DailyReadCard profile={profile} accent={accent}/>
      <QuickActions go={go} accent={accent} profile={profile} todayLogged={todayLogged}/>
      <CycleAndObservations profile={profile} entries={entries} accent={accent} go={go}/>
    </div>
  );
}
