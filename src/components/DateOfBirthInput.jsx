import { useMemo } from "react";
import { C } from "../theme/tokens";

/* DateOfBirthInput
   ----------------------------------------------------------------
   Three side-by-side <select> dropdowns: month / day / year.
   Replaces <input type="date"> for date-of-birth specifically,
   because the native picker on Android forces year-by-year scrolling
   which is painful for selecting a year 30-60 years back.

   Value format: "YYYY-MM-DD" (matches the existing profile field
   so we can drop this in without touching the data layer). */
export default function DateOfBirthInput({ value, onChange, disabled = false }) {
  const [y0, m0, d0] = (value || "").split("-");
  const year = y0 || "";
  const month = m0 || "";
  const day = d0 || "";

  const now = new Date();
  const years = useMemo(() => {
    const arr = [];
    // 1925 through current year, newest first (most people are 0–100)
    for (let y = now.getFullYear(); y >= 1925; y--) arr.push(y);
    return arr;
  }, [now]);

  const months = [
    { v: "01", n: "January" }, { v: "02", n: "February" }, { v: "03", n: "March" },
    { v: "04", n: "April" }, { v: "05", n: "May" }, { v: "06", n: "June" },
    { v: "07", n: "July" }, { v: "08", n: "August" }, { v: "09", n: "September" },
    { v: "10", n: "October" }, { v: "11", n: "November" }, { v: "12", n: "December" },
  ];

  // Days adjust to selected month + year (Feb 28/29, etc.)
  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0")), [daysInMonth]);

  const update = (next) => {
    // Always pad to ISO 2-digit, only emit a value when all three are set.
    const y = next.year ?? year;
    const m = next.month ?? month;
    let d = next.day ?? day;
    // Clamp day if month change made it invalid (e.g. Feb 30 → Feb 28)
    if (y && m) {
      const max = new Date(Number(y), Number(m), 0).getDate();
      if (Number(d) > max) d = String(max).padStart(2, "0");
    }
    if (y && m && d) onChange(`${y}-${m}-${d}`);
    else onChange("");
  };

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
      <select disabled={disabled} value={month} onChange={(e) => update({ month: e.target.value })} style={sel} aria-label="Month">
        <option value="">Month</option>
        {months.map((m) => <option key={m.v} value={m.v}>{m.n}</option>)}
      </select>
      <select disabled={disabled} value={day} onChange={(e) => update({ day: e.target.value })} style={{ ...sel, maxWidth: 92 }} aria-label="Day">
        <option value="">Day</option>
        {days.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
      </select>
      <select disabled={disabled} value={year} onChange={(e) => update({ year: e.target.value })} style={{ ...sel, maxWidth: 110 }} aria-label="Year">
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}
