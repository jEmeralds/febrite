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

const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (y, m, day) => `${y}-${pad2(m + 1)}-${pad2(day)}`;

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Builds a lookup: "YYYY-MM-DD" -> the log covering that day, but ONLY up
// through todayKey for open-ended (still-ongoing) logs. This is computed
// as an explicit whitelist of valid keys per log — deliberately avoiding
// any date-object arithmetic or comparison operators on strings, since
// that's the class of bug we spent a long time chasing without proof.
function buildDayMap(logs, todayKey) {
  const map = {};
  for (const log of logs) {
    let cursor = new Date(log.start_date + "T00:00:00");
    const hardStop = log.end_date
      ? new Date(log.end_date + "T00:00:00")
      : new Date(todayKey + "T00:00:00");
    // safety valve: never walk more than 400 days for one log, so a bad
    // row can't hang the browser
    let guard = 0;
    while (cursor.getTime() <= hardStop.getTime() && guard < 400) {
      const key = toKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      map[key] = log;
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
  }
  return map;
}

export default function CycleCalendarV2({ userId, logs, accent, onChanged, todayDate }) {
  const now = new Date();
  const todayKey = todayDate || toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(() => Number(todayKey.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(todayKey.slice(5, 7)) - 1); // 0-indexed
  const [pickerFor, setPickerFor] = useState(null);
  const [dayInfo, setDayInfo] = useState(null);
  const [saving, setSaving] = useState(false);

  const dayMap = useMemo(() => buildDayMap(logs, todayKey), [logs, todayKey]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = new Date(viewYear, viewMonth, 1).getDay();

  const goMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
  };

  const handleDayClick = (dateKey) => {
    const existing = dayMap[dateKey];
    if (existing) { setDayInfo({ dateKey, log: existing }); return; }
    setPickerFor({ start: dateKey, end: dateKey });
  };

  const extendPickerEnd = (delta) => {
    setPickerFor((p) => {
      if (!p) return p;
      const d = new Date(p.end + "T00:00:00");
      d.setDate(d.getDate() + delta);
      const newEnd = toKey(d.getFullYear(), d.getMonth(), d.getDate());
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

  const dayCountLabel = (() => {
    if (!pickerFor) return "";
    const a = new Date(pickerFor.start + "T00:00:00");
    const b = new Date(pickerFor.end + "T00:00:00");
    const n = Math.round((b - a) / 86400000) + 1;
    return `${n} day${n === 1 ? "" : "s"}`;
  })();

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
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dateKey = toKey(viewYear, viewMonth, dayNum);
          const log = dayMap[dateKey] || null;
          const color = log ? PHASE_COLOR[log.phase] : null;
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;
          return (
            <button
              key={dateKey}
              onClick={() => handleDayClick(dateKey)}
              title={log ? `${dateKey} · ${PHASE_LABEL[log.phase]}${!log.end_date ? " · ongoing" : ""}` : dateKey}
              style={{
                aspectRatio: "1", minHeight: 34, borderRadius: 10,
                border: isToday ? `2px solid ${accent}` : "1px solid transparent",
                background: color ? `${color}2A` : "rgba(44,35,32,.035)",
                color: isFuture ? "rgba(44,35,32,.4)" : C.ink,
                fontSize: 12, fontWeight: isToday ? 700 : 500, cursor: "pointer",
                display: "grid", placeItems: "center", position: "relative", fontFamily: "Karla,sans-serif",
              }}
            >
              {dayNum}
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

      {pickerFor && (
        <Overlay onClose={() => setPickerFor(null)}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 4 }}>This day isn't logged yet — starting</div>
          <div style={{ fontSize: 15, color: C.ink, marginBottom: 14, fontWeight: 600 }}>{pickerFor.start}</div>

          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>How many days did it last?</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => extendPickerEnd(-1)} disabled={pickerFor.end === pickerFor.start}
              style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Minus size={14} />
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.ink }}>
              {dayCountLabel}
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

      {dayInfo && (
        <Overlay onClose={() => setDayInfo(null)}>
          <div style={{ fontSize: 14, color: C.ink, marginBottom: 4, fontWeight: 600 }}>{dayInfo.dateKey}</div>
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
