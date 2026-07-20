import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Trash2, Plus, Minus } from "lucide-react";
import { Card, C } from "./ui";
import { logPhaseRange, deletePhaseLog, PHASES } from "../lib/cyclePhases";

const PHASE_COLOR = {
  menstrual:  "#C44A4A",
  follicular: "#3F7B5A",
  ovulation:  "#D08C3B",
  luteal:     "#7E5FA4",
};
const PHASE_LABEL = {
  menstrual: "Menstrual", follicular: "Follicular", ovulation: "Ovulation", luteal: "Luteal",
};

const iso = (d) => d.toISOString().slice(0, 10);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/* Build a real month grid: correct weekday offset for day 1, correct
   number of days for THIS month (28/29/30/31), no assumptions. */
function buildMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const totalDays = daysInMonth(monthDate);
  const leadingBlanks = first.getDay(); // 0=Sun
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  return cells;
}

// Which phase (if any) covers a given date, from the real logs.
function phaseForDate(logs, dateStr) {
  const log = logs.find((l) => l.start_date <= dateStr && (!l.end_date || l.end_date >= dateStr));
  return log || null;
}

export default function CycleMonthCalendar({ userId, logs, accent, onChanged, todayDate }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [pickerFor, setPickerFor] = useState(null); // { start, end } — single tap opens this immediately
  const [dayInfo, setDayInfo] = useState(null); // clicked an already-logged day -> show edit/delete
  const [saving, setSaving] = useState(false);

  // Always defer to the same date source as the rest of the page (useCurrentDate),
  // so "today" never disagrees between the hero and the calendar.
  const todayStr = todayDate || iso(new Date());
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const goMonth = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  // Single tap: if the day already has a log, show it (with edit/delete).
  // Otherwise open the phase picker immediately for that single day — the
  // person can widen it to a range right there in the picker, no drag needed.
  const handleDayClick = (dateStr) => {
    const existing = phaseForDate(logs, dateStr);
    if (existing) { setDayInfo({ dateStr, log: existing }); return; }
    setPickerFor({ start: dateStr, end: dateStr });
  };

  const extendPickerEnd = (delta) => {
    setPickerFor((p) => {
      if (!p) return p;
      const d = new Date(p.end + "T00:00:00");
      d.setDate(d.getDate() + delta);
      const newEnd = iso(d);
      if (newEnd < p.start) return p;
      return { ...p, end: newEnd };
    });
  };

  const confirmPhase = async (phase) => {
    if (!pickerFor) return;
    setSaving(true);
    try {
      await logPhaseRange(userId, phase, pickerFor.start, pickerFor.end);
      onChanged?.();
    } finally {
      setSaving(false);
      setPickerFor(null);
    }
  };

  const removeLog = async (logId) => {
    setSaving(true);
    try {
      await deletePhaseLog(logId);
      onChanged?.();
    } finally {
      setSaving(false);
      setDayInfo(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => goMonth(-1)} style={navBtn}><ChevronLeft size={16} /></button>
        <div style={{ fontFamily: "Fraunces,serif", fontSize: 16, color: C.ink }}>{monthLabel}</div>
        <button onClick={() => goMonth(1)} style={navBtn}><ChevronRight size={16} /></button>
      </div>

      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
        Tap any day to log a phase — you can extend it to more days in the next step.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const dateStr = iso(date);
          const log = phaseForDate(logs, dateStr);
          const color = log ? PHASE_COLOR[log.phase] : null;
          const isToday = dateStr === todayStr;
          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              title={log ? `${dateStr} · ${PHASE_LABEL[log.phase]}${!log.end_date ? " · ongoing" : ""}` : dateStr}
              style={{
                aspectRatio: "1", minHeight: 34, borderRadius: 10, border: isToday ? `2px solid ${accent}` : "1px solid transparent",
                background: color ? `${color}2A` : "rgba(44,35,32,.035)",
                color: C.ink, fontSize: 12, fontWeight: isToday ? 700 : 500, cursor: "pointer",
                display: "grid", placeItems: "center", position: "relative", fontFamily: "Karla,sans-serif",
              }}
            >
              {date.getDate()}
              {log && !log.end_date && (
                <div style={{ position: "absolute", top: 3, right: 4, width: 5, height: 5, borderRadius: "50%", background: color }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap", fontSize: 11.5, color: C.inkSoft }}>
        {Object.entries(PHASE_COLOR).map(([phase, color]) => (
          <div key={phase} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
            <span>{PHASE_LABEL[phase]}</span>
          </div>
        ))}
      </div>

      {/* Phase picker — opens on a single tap; range is adjustable right here */}
      {pickerFor && (
        <Overlay onClose={() => setPickerFor(null)}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 4 }}>Logging phase starting</div>
          <div style={{ fontSize: 15, color: C.ink, marginBottom: 14, fontWeight: 600 }}>{pickerFor.start}</div>

          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>How many days did it last?</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => extendPickerEnd(-1)} disabled={pickerFor.end === pickerFor.start}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Minus size={14} />
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.ink }}>
              {Math.round((new Date(pickerFor.end) - new Date(pickerFor.start)) / 86400000) + 1} day
              {Math.round((new Date(pickerFor.end) - new Date(pickerFor.start)) / 86400000) === 0 ? "" : "s"}
              {pickerFor.end !== pickerFor.start && <span style={{ color: C.inkSoft, fontWeight: 400 }}> · through {pickerFor.end}</span>}
            </div>
            <button onClick={() => extendPickerEnd(1)}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Plus size={14} />
            </button>
          </div>

          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>What phase was this?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PHASES.map((p) => (
              <button key={p} disabled={saving} onClick={() => confirmPhase(p)}
                style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${PHASE_COLOR[p]}55`, background: `${PHASE_COLOR[p]}14`, color: PHASE_COLOR[p], fontWeight: 700, fontSize: 13.5, cursor: "pointer", textAlign: "left" }}>
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>
        </Overlay>
      )}

      {/* Info / edit / delete for an already-logged day */}
      {dayInfo && (
        <Overlay onClose={() => setDayInfo(null)}>
          <div style={{ fontSize: 14, color: C.ink, marginBottom: 4, fontWeight: 600 }}>{dayInfo.dateStr}</div>
          <div style={{ fontSize: 13, color: PHASE_COLOR[dayInfo.log.phase], fontWeight: 700, marginBottom: 4 }}>
            {PHASE_LABEL[dayInfo.log.phase]}
          </div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>
            {dayInfo.log.start_date} → {dayInfo.log.end_date || "ongoing"}
          </div>
          <button disabled={saving} onClick={() => removeLog(dayInfo.log.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(196,74,74,.3)", background: "rgba(196,74,74,.08)", color: "#C44A4A", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Trash2 size={14} /> Delete this log
          </button>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,15,12,.35)", display: "grid", placeItems: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 22, minWidth: 260, maxWidth: 320, position: "relative", boxShadow: "0 20px 60px -20px rgba(0,0,0,.3)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#999" }}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

const navBtn = { width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(44,35,32,.12)", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "#2C2320" };
