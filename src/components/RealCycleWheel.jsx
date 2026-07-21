import { C } from "./ui";

const PHASE_COLOR = {
  menstrual:  "#C44A4A",
  follicular: "#3F7B5A",
  ovulation:  "#D08C3B",
  luteal:     "#7E5FA4",
};
const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };

/* RealCycleWheel
   ----------------------------------------------------------------
   Draws THIS cycle's actual shape: each arc's length is proportional
   to how many days that phase was really logged for — not a fixed
   28-day/5-day assumption. A 6-day period draws a visibly bigger arc
   than a 4-day one. Gaps with nothing logged render as a plain gray
   arc labeled "unlogged" rather than being hidden or guessed at.
*/
export default function RealCycleWheel({ wheelData, currentPhase, accent, size = 320 }) {
  if (!wheelData) return null;
  const { totalDays, segments } = wheelData;

  const cx = size / 2, cy = size / 2, r = (size / 2) - 22, sw = 22;
  const dayToDeg = (d) => ((d - 1) / totalDays) * 360;
  const polar = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (startDeg, endDeg) => {
    const [x1, y1] = polar(startDeg, r), [x2, y2] = polar(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const todayDeg = dayToDeg(totalDays);
  const [mx, my] = polar(todayDeg === 0 ? 359.9 : todayDeg, r);
  const phaseColor = currentPhase ? (PHASE_COLOR[currentPhase.phase] || accent) : accent;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(44,35,32,.05)" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const startDeg = dayToDeg(seg.startDay);
        const endDeg = dayToDeg(seg.endDay + 1);
        const color = seg.phase ? PHASE_COLOR[seg.phase] : "rgba(44,35,32,.14)";
        const isCurrent = seg.phase && currentPhase && seg.phase === currentPhase.phase && seg.endDay >= totalDays - (currentPhase.dayInPhase - 1);
        return (
          <path key={i} d={arc(startDeg, Math.max(endDeg, startDeg + 1))} fill="none"
            stroke={color} strokeWidth={sw}
            opacity={seg.phase ? (isCurrent ? 1 : 0.35) : 0.5}
            filter={isCurrent ? "url(#wheel-glow)" : undefined}
            strokeDasharray={seg.phase ? undefined : "3,3"} />
        );
      })}
      <circle cx={mx} cy={my} r={18} fill={`${phaseColor}33`} />
      <circle cx={mx} cy={my} r={13} fill="#fff" stroke={phaseColor} strokeWidth={3.5} />
      <circle cx={mx} cy={my} r={5} fill={phaseColor} />
      <text x={cx} y={cy - 28} textAnchor="middle" fontFamily="Karla,sans-serif" fontSize={11} fontWeight={700} fill="rgba(44,35,32,.5)" letterSpacing=".18em">CYCLE DAY</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontFamily="Fraunces,serif" fontSize={68} fill="#2C2320" letterSpacing="-.02em">{totalDays}</text>
      <text x={cx} y={cy + 48} textAnchor="middle" fontFamily="Karla,sans-serif" fontSize={13.5} fontWeight={700} fill={phaseColor} letterSpacing=".12em">
        {currentPhase ? PHASE_TITLE[currentPhase.phase].toUpperCase() : ""}
      </text>
      <text x={cx} y={cy + 70} textAnchor="middle" fontFamily="Karla,sans-serif" fontSize={11.5} fill="rgba(44,35,32,.5)">this cycle, as logged</text>
    </svg>
  );
}
