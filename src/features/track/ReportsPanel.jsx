import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Printer, AlertCircle, BarChart3 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import {
  PERIOD_TYPES, getCurrentRange, shiftRange, rangeIsFuture,
  fetchEntriesInRange, assessReadiness, computeStats,
  fmtSleep, fmtMoodEnergy,
} from "../../lib/reports";
import { Card, C } from "../../components/ui";

const PHASE_LABEL = {
  Menstrual: "Menstrual",
  Follicular: "Follicular",
  Ovulation: "Ovulation",
  Luteal: "Luteal",
};

const PHASE_COLOR = {
  Menstrual: "#C44A4A",
  Follicular: "#3F7B5A",
  Ovulation: "#D08C3B",
  Luteal: "#7E5FA4",
};

/* ============================================================
   Builds a complete HTML string for the print window
   ============================================================ */
function buildPrintHTML({ profile, range, stats, readiness, type, accent, showsCycle }) {
  const phaseRows = showsCycle && stats.phaseBreakdown.length > 0
    ? stats.phaseBreakdown.map(p => `
        <span class="phase-chip" style="background:${PHASE_COLOR[p.phase] || accent}1A;color:${PHASE_COLOR[p.phase] || accent}">
          ${PHASE_LABEL[p.phase] || p.phase} · ${p.count} days
        </span>`).join("")
    : "";

  const moodPhaseRows = showsCycle && Object.keys(stats.moodByPhaseAvg).length > 1
    ? Object.entries(stats.moodByPhaseAvg).map(([phase, val]) => `
        <div class="bar-row">
          <div class="bar-label">${PHASE_LABEL[phase] || phase}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${val ? (val / 5) * 100 : 0}%;background:${PHASE_COLOR[phase] || accent}"></div>
          </div>
          <div class="bar-value">${val != null ? val.toFixed(1) : "—"}</div>
        </div>`).join("")
    : "";

  const symptomRows = stats.topSymptoms.length > 0
    ? stats.topSymptoms.map(s => `
        <div class="bar-row">
          <div class="bar-label" style="flex:1;text-transform:capitalize">${s.symptom}</div>
          <div class="bar-track" style="flex:2">
            <div class="bar-fill" style="width:${s.pct}%;background:${accent}"></div>
          </div>
          <div class="bar-value" style="width:80px">${s.count}× · ${s.pct}%</div>
        </div>`).join("")
    : "";

  const stressSection = (stats.workStressAvg != null || stats.personalStressAvg != null) ? `
    <div class="section">
      <div class="section-title">Stress</div>
      <div class="stats-grid cols2">
        <div class="stat-card">
          <div class="stat-label">Work stress</div>
          <div class="stat-value">${fmtMoodEnergy(stats.workStressAvg)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Personal stress</div>
          <div class="stat-value">${fmtMoodEnergy(stats.personalStressAvg)}</div>
        </div>
      </div>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>FeBrite Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Karla:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Karla', sans-serif;
      color: #2c2320;
      background: white;
      padding: 18mm;
      font-size: 13px;
      line-height: 1.5;
    }

    /* Header */
    .report-title {
      font-family: 'Fraunces', serif;
      font-size: 26px;
      color: #2c2320;
      margin-bottom: 4px;
    }
    .report-meta {
      font-size: 13px;
      color: #7a6e6b;
      margin-bottom: 2px;
    }
    .report-divider {
      border: none;
      border-top: 1px solid #ddd;
      margin: 14px 0 20px;
    }

    /* Readiness banner */
    .banner {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 13px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .banner.ready {
      background: ${accent}10;
      border: 1px solid ${accent}33;
    }
    .banner.early {
      background: rgba(212,154,75,.12);
      border: 1px solid rgba(212,154,75,.4);
    }

    /* Sections */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 11px;
      color: #7a6e6b;
      font-weight: 700;
      letter-spacing: .07em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .stats-grid.cols2 {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat-card {
      padding: 11px 13px;
      border-radius: 10px;
      background: rgba(44,35,32,.03);
      border: 1px solid #e8e2e0;
    }
    .stat-label {
      font-size: 11px;
      color: #7a6e6b;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .stat-value {
      font-family: 'Fraunces', serif;
      font-size: 19px;
      color: #2c2320;
      line-height: 1.1;
    }
    .stat-suffix {
      font-size: 11px;
      color: #7a6e6b;
      font-weight: 500;
      font-family: 'Karla', sans-serif;
    }

    /* Bar rows */
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .bar-label { width: 90px; font-size: 13px; color: #2c2320; }
    .bar-track {
      flex: 1;
      height: 8px;
      background: rgba(44,35,32,.06);
      border-radius: 99px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 99px;
    }
    .bar-value {
      width: 55px;
      text-align: right;
      font-size: 12px;
      color: #7a6e6b;
    }

    /* Phase chips */
    .phase-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .phase-chip {
      padding: 6px 11px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Footer note */
    .footer-note {
      font-size: 11px;
      color: #7a6e6b;
      font-style: italic;
      margin-top: 20px;
      line-height: 1.55;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 18mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="report-title">FeBrite Report</div>
  <div class="report-meta">${profile?.display_name || ""}${profile?.life_stage ? ` · ${profile.life_stage}` : ""}</div>
  <div class="report-meta">${range.label} · Generated ${new Date().toLocaleDateString()}</div>
  <hr class="report-divider"/>

  <div class="banner ${readiness.ready ? "ready" : "early"}">
    ${readiness.ready
      ? `Full report — ${readiness.message}`
      : `<b>Early reading.</b> ${readiness.message} It still gives a snapshot of what's recorded.`}
  </div>

  <div class="section">
    <div class="section-title">At a glance</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Days logged</div>
        <div class="stat-value">${stats.daysLogged}<span class="stat-suffix"> of ${PERIOD_TYPES[type].days}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg mood</div>
        <div class="stat-value">${fmtMoodEnergy(stats.moodAvg)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg energy</div>
        <div class="stat-value">${fmtMoodEnergy(stats.energyAvg)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg sleep</div>
        <div class="stat-value">${fmtSleep(stats.sleepAvg)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Moved</div>
        <div class="stat-value">${stats.movedPct != null ? stats.movedPct + "%" : "—"}<span class="stat-suffix"> of days</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg water</div>
        <div class="stat-value">${stats.waterAvg != null ? stats.waterAvg.toFixed(1) + " glasses" : "—"}</div>
      </div>
    </div>
  </div>

  ${stressSection}

  ${symptomRows ? `
  <div class="section">
    <div class="section-title">Symptoms that came up most</div>
    ${symptomRows}
  </div>` : ""}

  ${phaseRows ? `
  <div class="section">
    <div class="section-title">Cycle phases observed</div>
    <div class="phase-chips">${phaseRows}</div>
  </div>` : ""}

  ${moodPhaseRows ? `
  <div class="section">
    <div class="section-title">Mood by phase</div>
    ${moodPhaseRows}
  </div>` : ""}

  <div class="footer-note">
    This is a summary of what you logged. Not a medical assessment.
    For anything concerning, share this with your doctor — that's what it's designed for.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
}

export default function ReportsPanel({ accent, showsCycle = true }) {
  const { user, profile } = useAuth();
  const [type, setType] = useState("week");
  const [range, setRange] = useState(() => getCurrentRange("week"));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRange(getCurrentRange(type));
  }, [type]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchEntriesInRange(user.id, range).then((data) => {
      if (alive) { setEntries(data); setLoading(false); }
    });
    return () => { alive = false; };
  }, [user?.id, range.start, range.end]);

  const readiness = useMemo(() => assessReadiness(entries, type), [entries, type]);
  const stats = useMemo(() => computeStats(entries), [entries]);

  const canGoNext = !rangeIsFuture(shiftRange(type, range, 1));

  const handlePrint = () => {
    const html = buildPrintHTML({ profile, range, stats, readiness, type, accent, showsCycle });
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Please allow popups for this site to use the print feature.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <Card style={{ marginTop: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <FileText size={17} style={{ color: accent }} />
        <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(18px,4vw,22px)", color: C.ink }}>
          Reports & Insights
        </div>
        <button
          onClick={handlePrint}
          disabled={readiness.logged === 0}
          style={{
            marginLeft: "auto",
            padding: "8px 13px", borderRadius: 10,
            border: `1px solid ${C.line}`, background: "#fff", color: C.ink,
            cursor: readiness.logged === 0 ? "not-allowed" : "pointer",
            fontSize: 13, fontFamily: "Karla, sans-serif", fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6,
            opacity: readiness.logged === 0 ? 0.5 : 1,
          }}
          title="Print or save as PDF — for sharing with your doctor"
        >
          <Printer size={14} /> Print / save as PDF
        </button>
      </div>

      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 1.55 }}>
        A period summary you can review or share with your doctor.
      </div>

      {/* Period type tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, padding: 4, background: "rgba(44,35,32,.04)", borderRadius: 11, overflowX: "auto" }}>
        {Object.entries(PERIOD_TYPES).map(([id, def]) => (
          <button key={id} onClick={() => setType(id)} style={{
            flex: "1 1 0", minWidth: 70,
            padding: "8px 10px", borderRadius: 8,
            border: "none",
            background: type === id ? "#fff" : "transparent",
            color: type === id ? C.ink : C.inkSoft,
            fontSize: 13, fontWeight: type === id ? 700 : 500,
            fontFamily: "Karla, sans-serif", cursor: "pointer",
            boxShadow: type === id ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            transition: ".15s",
          }}>
            {def.label}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={() => setRange(shiftRange(type, range, -1))} style={navBtn}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: "Karla, sans-serif" }}>
          {range.label}
        </div>
        <button
          onClick={() => canGoNext && setRange(shiftRange(type, range, 1))}
          disabled={!canGoNext}
          style={{ ...navBtn, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? "pointer" : "not-allowed" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonContent />
      ) : readiness.logged === 0 ? (
        <EmptyState accent={accent} />
      ) : (
        <ReportContent
          stats={stats}
          readiness={readiness}
          range={range}
          type={type}
          accent={accent}
          showsCycle={showsCycle}
        />
      )}
    </Card>
  );
}

/* ============================================================
   Screen report rendering (same data, in-app display)
   ============================================================ */
function ReportContent({ stats, readiness, range, type, accent, showsCycle }) {
  return (
    <div>
      <div style={{
        display: "flex", gap: 9, alignItems: "flex-start",
        padding: "10px 13px", borderRadius: 10, marginBottom: 18,
        background: readiness.ready ? `${accent}10` : "rgba(212,154,75,.12)",
        border: `1px solid ${readiness.ready ? `${accent}33` : "rgba(212,154,75,.4)"}`,
      }}>
        {readiness.ready
          ? <BarChart3 size={15} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
          : <AlertCircle size={15} style={{ color: "#9C6F2E", flexShrink: 0, marginTop: 2 }} />}
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
          {readiness.ready
            ? <>Full report — {readiness.message}</>
            : <><b>Early reading.</b> {readiness.message} It still gives a snapshot of what's recorded.</>}
        </div>
      </div>

      <Section title="At a glance">
        <StatsGrid>
          <Stat label="Days logged" value={stats.daysLogged} suffix={` of ${PERIOD_TYPES[type].days}`} />
          <Stat label="Avg mood" value={fmtMoodEnergy(stats.moodAvg)} />
          <Stat label="Avg energy" value={fmtMoodEnergy(stats.energyAvg)} />
          <Stat label="Avg sleep" value={fmtSleep(stats.sleepAvg)} />
          <Stat label="Moved" value={stats.movedPct != null ? `${stats.movedPct}%` : "—"} suffix=" of days" />
          <Stat label="Avg water" value={stats.waterAvg != null ? `${stats.waterAvg.toFixed(1)} glasses` : "—"} />
        </StatsGrid>
      </Section>

      {(stats.workStressAvg != null || stats.personalStressAvg != null) && (
        <Section title="Stress">
          <StatsGrid cols={2}>
            <Stat label="Work stress" value={fmtMoodEnergy(stats.workStressAvg)} />
            <Stat label="Personal stress" value={fmtMoodEnergy(stats.personalStressAvg)} />
          </StatsGrid>
        </Section>
      )}

      {stats.topSymptoms.length > 0 && (
        <Section title="Symptoms that came up most">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.topSymptoms.map((s) => (
              <div key={s.symptom} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13.5, color: C.ink, textTransform: "capitalize" }}>{s.symptom}</div>
                <div style={{ flex: 2, height: 8, background: "rgba(44,35,32,.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${s.pct}%`, height: "100%", background: accent, borderRadius: 99 }} />
                </div>
                <div style={{ width: 70, textAlign: "right", fontSize: 12.5, color: C.inkSoft }}>{s.count}× · {s.pct}%</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {showsCycle && stats.phaseBreakdown.length > 0 && (
        <Section title="Cycle phases observed">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stats.phaseBreakdown.map((p) => (
              <div key={p.phase} style={{
                padding: "6px 11px", borderRadius: 99, fontSize: 12.5,
                background: `${PHASE_COLOR[p.phase] || accent}1A`,
                color: PHASE_COLOR[p.phase] || accent, fontWeight: 600,
              }}>
                {PHASE_LABEL[p.phase] || p.phase} · {p.count} days
              </div>
            ))}
          </div>
        </Section>
      )}

      {showsCycle && Object.keys(stats.moodByPhaseAvg).length > 1 && (
        <Section title="Mood by phase">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(stats.moodByPhaseAvg).map(([phase, val]) => (
              <div key={phase} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 90, fontSize: 13, color: C.ink }}>{PHASE_LABEL[phase] || phase}</div>
                <div style={{ flex: 1, height: 8, background: "rgba(44,35,32,.06)", borderRadius: 99 }}>
                  <div style={{ width: `${val ? (val / 5) * 100 : 0}%`, height: "100%", background: PHASE_COLOR[phase] || accent, borderRadius: 99 }} />
                </div>
                <div style={{ width: 50, fontSize: 12.5, color: C.inkSoft, textAlign: "right" }}>
                  {val != null ? val.toFixed(1) : "—"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div style={{ fontSize: 11.5, color: C.inkSoft, fontStyle: "italic", marginTop: 18, lineHeight: 1.55 }}>
        This is a summary of what you logged. Not a medical assessment.
        For anything concerning, share this with your doctor — that's what it's designed for.
      </div>
    </div>
  );
}

function EmptyState({ accent }) {
  return (
    <div style={{
      padding: 22, borderRadius: 12, textAlign: "center",
      background: "rgba(44,35,32,.03)", border: `1px dashed ${C.line}`,
    }}>
      <div style={{ fontSize: 14.5, color: C.ink, marginBottom: 6, fontWeight: 600 }}>No check-ins logged in this period.</div>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
        Reports use the data you've logged. As you check in more often, the patterns sharpen.
      </div>
    </div>
  );
}

function SkeletonContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ height: 60, background: "rgba(44,35,32,.04)", borderRadius: 10 }} />
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 9 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatsGrid({ children, cols = 3 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(min(${cols === 2 ? 200 : 130}px, 100%), 1fr))`,
      gap: 10,
    }}>
      {children}
    </div>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div style={{ padding: "11px 13px", borderRadius: 10, background: "rgba(44,35,32,.03)", border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, lineHeight: 1.1 }}>
        {value}{suffix && <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

const navBtn = {
  width: 36, height: 36, borderRadius: 10,
  border: `1px solid ${C.line}`, background: "#fff", color: C.ink,
  display: "grid", placeItems: "center", cursor: "pointer",
};