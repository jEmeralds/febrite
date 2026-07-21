import { useEffect, useState } from "react";
import { CalendarCheck, ChevronRight, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { hasCheckedInToday } from "../lib/trackingApi";
import { currentPhase } from "../lib/cyclePhases";
import { C } from "../theme/tokens";

const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };

/* Banner shown at the top of the Shell when the user hasn't logged
   today's check-in. Dismissable per session — but reappears tomorrow. */
export function DailyNudge({ accent, onCheckIn }) {
  const { user, profile } = useAuth();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phaseNow, setPhaseNow] = useState(null);

  // Default to ON for any user who hasn't explicitly opted out.
  const remindersOn = profile?.reminders_enabled !== false;

  useEffect(() => {
    if (!user?.id) return;
    if (!remindersOn) { setShow(false); return; }
    let alive = true;
    hasCheckedInToday(user.id).then((done) => {
      if (alive) setShow(!done);
    });
    currentPhase(user.id).then((p) => { if (alive) setPhaseNow(p); });
    return () => { alive = false; };
  }, [user?.id, remindersOn]);

  if (!show || dismissed || !remindersOn) return null;

  const phaseLine = phaseNow ? `Day ${phaseNow.dayInPhase} · ${PHASE_TITLE[phaseNow.phase]} phase` : null;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${accent}14, ${accent}08)`,
      border: `1px solid ${accent}33`,
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 18,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${accent}22`, color: accent,
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <CalendarCheck size={20}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: C.ink, fontSize: 14.5, marginBottom: 2 }}>
          How are you, really? <span style={{ color: C.inkSoft, fontWeight: 400 }}>· today's check-in</span>
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.45 }}>
          {phaseLine ? `${phaseLine}. ` : ""}A two-minute log keeps your companion's read of you accurate.
        </div>
      </div>
      <button onClick={onCheckIn} style={{
        background: accent, color: "#fff", border: "none",
        padding: "10px 16px", borderRadius: 11, fontSize: 13.5, fontWeight: 700,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        flexShrink: 0, fontFamily: "Karla, sans-serif",
      }}>
        Check in <ChevronRight size={15}/>
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={{
        background: "transparent", border: "none", color: C.inkSoft,
        cursor: "pointer", padding: 6, marginLeft: -4,
      }}>
        <X size={16}/>
      </button>
    </div>
  );
}

/* Small chip used in the sidebar showing the CURRENT logged phase.
   Renders nothing (not a guess) until at least one phase has actually
   been logged — no fixed-math fallback, since that's exactly what
   caused it to disagree with the Track page. */
export function CycleChip({ accent }) {
  const { user } = useAuth();
  const [phaseNow, setPhaseNow] = useState(null);

  useEffect(() => {
    if (!user?.id) { setPhaseNow(null); return; }
    let alive = true;
    currentPhase(user.id).then((p) => { if (alive) setPhaseNow(p); });
    return () => { alive = false; };
  }, [user?.id]);

  if (!phaseNow) return null;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "6px 11px", borderRadius: 99,
      background: `${accent}14`, border: `1px solid ${accent}33`,
      color: accent, fontSize: 12, fontWeight: 600,
      fontFamily: "Karla, sans-serif",
    }}
    title={`Day ${phaseNow.dayInPhase} of your current ${PHASE_TITLE[phaseNow.phase]} phase, as logged`}
    >
      <span>Day {phaseNow.dayInPhase}</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span>{PHASE_TITLE[phaseNow.phase]}</span>
    </div>
  );
}
