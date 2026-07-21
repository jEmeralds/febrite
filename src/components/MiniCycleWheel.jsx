import { C } from "../components/ui";

const PHASE_COLOR = {
  menstrual:  "#C44A4A",
  follicular: "#3F7B5A",
  ovulation:  "#D08C3B",
  luteal:     "#7E5FA4",
};
const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };

// Compact wheel for Home's snapshot card. Same real-logged-segment data as
// the full wheel on Track — arcs are NOT fixed proportions, they're sized
// from how many days each phase actually ran this cycle.
export default function MiniCycleWheel({ wheelData, currentPhase, size = 130 }) {
  if (!wheelData || !currentPhase) return null;
  const { totalDays, segments } = wheelData;

  const cx = size / 2, cy = size / 2, r = size / 2 - 11, sw = 11;
  const dayToDeg = (d) => ((d - 1) / totalDays) * 360;
  const polar = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arc = (a, b) => {
    const [x1, y1] = polar(a, r), [x2, y2] = polar(b, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const phaseColor = PHASE_COLOR[currentPhase.phase] || C.clay;
  const todayDeg = dayToDeg(totalDays);
  const [mx, my] = polar(todayDeg === 0 ? 359.9 : todayDeg, r);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(44,35,32,.05)" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const a = dayToDeg(seg.startDay);
        const b = dayToDeg(seg.endDay + 1);
        const color = seg.phase ? PHASE_COLOR[seg.phase] : "rgba(44,35,32,.14)";
        const isCurrent = seg.phase === currentPhase.phase && seg.endDay === totalDays;
        return (
          <path key={i} d={arc(a, Math.max(b, a + 1))} fill="none"
            stroke={color} strokeWidth={sw} opacity={seg.phase ? (isCurrent ? 1 : 0.3) : 0.45} />
        );
      })}
      <circle cx={mx} cy={my} r={8} fill="#fff" stroke={phaseColor} strokeWidth={2.5} />
      <circle cx={mx} cy={my} r={3} fill={phaseColor} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="Fraunces, serif" fontSize={28} fill={C.ink}>
        {currentPhase.dayInPhase}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontFamily="Karla, sans-serif" fontSize={9.5} fontWeight={700} fill={phaseColor} letterSpacing=".1em">
        {PHASE_TITLE[currentPhase.phase].toUpperCase()}
      </text>
    </svg>
  );
}
