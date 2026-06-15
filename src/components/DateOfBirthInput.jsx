import { useEffect, useMemo, useState } from "react";
import { C } from "../theme/tokens";

/* DateOfBirthInput
   ----------------------------------------------------------------
   Three side-by-side <select> dropdowns: month / day / year.

   IMPORTANT: this component keeps its own internal state for the
   three fields. We only call onChange(YYYY-MM-DD) once all three
   are set. If we instead read the values back from `value` on
   every render, a partial selection (just a month, not yet a year)
   would immediately be wiped when the empty value is round-tripped
   through the parent. */
export default function DateOfBirthInput({ value, onChange, disabled = false }) {
  const init = (value || "").split("-");
  const [year, setYear]   = useState(init[0] || "");
  const [month, setMonth] = useState(init[1] || "");
  const [day, setDay]     = useState(init[2] || "");

  // Sync internal state when parent value changes (profile loads async,
  // form gets reset, etc.).
  useEffect(() => {
    if (!value) { setYear(""); setMonth(""); setDay(""); return; }
    const [y, m, d] = value.split("-");
    setYear(y || ""); setMonth(m || ""); setDay(d || "");
  }, [value]);

  // Emit to parent only when all three are filled. (Emitting on
  // partial state would cause the parent to immediately overwrite
  // back to "" and erase the user's selection.)
  useEffect(() => {
    if (year && month && day) onChange(`${year}-${month}-${day}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, day]);

  // Clamp day if month/year change makes it invalid (Feb 30 -> Feb 28).
  useEffect(() => {
    if (year && month && day) {
      const max = new Date(Number(year), Number(month), 0).getDate();
      if (Number(day) > max) setDay(String(max).padStart(2, "0"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const now = new Date();
  const years = useMemo(() => {
    const arr = [];
    for (let y = now.getFullYear(); y >= 1925; y--) arr.push(y);
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const months = [
    { v: "01", n: "January" }, { v: "02", n: "February" }, { v: "03", n: "March" },
    { v: "04", n: "April" },   { v: "05", n: "May" },      { v: "06", n: "June" },
    { v: "07", n: "July" },    { v: "08", n: "August" },   { v: "09", n: "September" },
    { v: "10", n: "October" }, { v: "11", n: "November" }, { v: "12", n: "December" },
  ];

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0")),
    [daysInMonth]
  );

  const sel = {
    flex: 1, minWidth: 0, padding: "11px 10px", borderRadius: 11,
    border: `1px solid ${C.line}`, background: "#fff", fontSize: 14.5,
    color: year || month || day ? C.ink : C.inkSoft,
    fontFamily: "Karla, sans-serif", outline: "none",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%2399897F' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 28,
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select disabled={disabled} value={month} onChange={(e) => setMonth(e.target.value)} style={sel} aria-label="Month">
        <option value="">Month</option>
        {months.map((m) => <option key={m.v} value={m.v}>{m.n}</option>)}
      </select>
      <select disabled={disabled} value={day} onChange={(e) => setDay(e.target.value)} style={{ ...sel, maxWidth: 92 }} aria-label="Day">
        <option value="">Day</option>
        {days.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
      </select>
      <select disabled={disabled} value={year} onChange={(e) => setYear(e.target.value)} style={{ ...sel, maxWidth: 110 }} aria-label="Year">
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
