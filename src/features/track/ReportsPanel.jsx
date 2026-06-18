import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Printer, AlertCircle, BarChart3 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import {
  PERIOD_TYPES, getCurrentRange, shiftRange, rangeIsFuture,
  fetchEntriesInRange, assessReadiness, computeStats,
  fmtSleep, fmtMoodEnergy,
} from "../../lib/reports";
import { Card, C } from "../../components/ui";

/* ReportsPanel
   ----------------------------------------------------------------
   Lives inside the Track tab, below "Your patterns."

   The user can:
   - Switch period type (Week / Month / Quarter / Year)
   - Navigate prev/next through their history
   - See readiness ("4 of 4 check-ins logged" → ready; "2 of 4" → early reading)
   - See computed stats for the period
   - Print/save as PDF (browser-native — includes a doctor-friendly header)

   What this component does NOT do (yet):
   - Gemini narrative summary — comes in Phase 2
   - Doctor-prep bullet points (LLM-generated) — Phase 2
   - Trend comparison with previous period — Phase 2

   For now, the printable version is a clean numerical summary
   that's already useful at a doctor's appointment. */

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

export default function ReportsPanel({ accent, showsCycle = true }) {
  const { user, profile } = useAuth();
  const [type, setType] = useState("week");
  const [range, setRange] = useState(() => getCurrentRange("week"));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // When period TYPE changes, jump to the current period of that type.
  useEffect(() => {
    setRange(getCurrentRange(type));
  }, [type]);

  // Load entries whenever range changes
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
    // Add a body class so our print CSS knows we're in report-print mode
    document.body.classList.add("fb-printing-report");
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("fb-printing-report"), 1000);
    }, 50);
  };

  return (
    <>
      <PrintStyles/>

      {/* Print-only header — only shows on paper */}
      <div className="fb-reports-panel" style={{ display: "none" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, marginBottom: 4 }}>FeBrite Report</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
          {profile?.display_name || ""} {profile?.life_stage ? `· ${profile.life_stage}` : ""}
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
          {range.label} · Generated {new Date().toLocaleDateString()}
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #ccc", marginBottom: 14 }}/>
      </div>

      <Card style={{ marginTop: 18 }} className="fb-report-card">
        {/* ===== Header ===== */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <FileText size={17} style={{ color: accent }}/>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(18px,4vw,22px)", color: C.ink }}>
            Reports & Insights
          </div>
          <button
            onClick={handlePrint}
            disabled={readiness.logged === 0}
            className="fb-no-print"
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
            <Printer size={14}/> Print / save as PDF
          </button>
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 1.55 }}>
          A period summary you can review or share with your doctor.
        </div>

        {/* ===== Period type tabs ===== */}
        <div className="fb-no-print" style={{ display: "flex", gap: 6, marginBottom: 12, padding: 4, background: "rgba(44,35,32,.04)", borderRadius: 11, overflowX: "auto" }}>
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

        {/* ===== Period navigator ===== */}
        <div className="fb-no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setRange(shiftRange(type, range, -1))} style={navBtn}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: "Karla, sans-serif" }}>
            {range.label}
          </div>
          <button onClick={() => canGoNext && setRange(shiftRange(type, range, 1))} disabled={!canGoNext} style={{ ...navBtn, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? "pointer" : "not-allowed" }}>
            <ChevronRight size={16}/>
          </button>
        </div>

        {/* ===== Content ===== */}
        {loading ? (
          <SkeletonContent/>
        ) : readiness.logged === 0 ? (
          <EmptyState range={range} accent={accent}/>
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
    </>
  );
}

/* ============================================================
   The actual report rendering
   ============================================================ */
function ReportContent({ stats, readiness, range, type, accent, showsCycle }) {
  return (
    <div>
      {/* Readiness banner */}
      <div style={{
        display: "flex", gap: 9, alignItems: "flex-start",
        padding: "10px 13px", borderRadius: 10, marginBottom: 18,
        background: readiness.ready ? `${accent}10` : "rgba(212,154,75,.12)",
        border: `1px solid ${readiness.ready ? `${accent}33` : "rgba(212,154,75,.4)"}`,
      }}>
        {readiness.ready
          ? <BarChart3 size={15} style={{ color: accent, flexShrink: 0, marginTop: 2 }}/>
          : <AlertCircle size={15} style={{ color: "#9C6F2E", flexShrink: 0, marginTop: 2 }}/>}
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
          {readiness.ready
            ? <>Full report — {readiness.message}</>
            : <><b>Early reading.</b> {readiness.message} It still gives a snapshot of what's recorded.</>}
        </div>
      </div>

      {/* Top-level numerics */}
      <Section title="At a glance">
        <StatsGrid>
          <Stat label="Days logged"  value={stats.daysLogged} suffix={` of ${PERIOD_TYPES[type].days}`}/>
          <Stat label="Avg mood"     value={fmtMoodEnergy(stats.moodAvg)}/>
          <Stat label="Avg energy"   value={fmtMoodEnergy(stats.energyAvg)}/>
          <Stat label="Avg sleep"    value={fmtSleep(stats.sleepAvg)}/>
          <Stat label="Moved"        value={stats.movedPct != null ? `${stats.movedPct}%` : "—"} suffix=" of days"/>
          <Stat label="Avg water"    value={stats.waterAvg != null ? `${stats.waterAvg.toFixed(1)} glasses` : "—"}/>
        </StatsGrid>
      </Section>

      {/* Stress */}
      {(stats.workStressAvg != null || stats.personalStressAvg != null) && (
        <Section title="Stress">
          <StatsGrid cols={2}>
            <Stat label="Work stress"     value={fmtMoodEnergy(stats.workStressAvg)}/>
            <Stat label="Personal stress" value={fmtMoodEnergy(stats.personalStressAvg)}/>
          </StatsGrid>
        </Section>
      )}

      {/* Symptoms */}
      {stats.topSymptoms.length > 0 && (
        <Section title="Symptoms that came up most">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.topSymptoms.map((s) => (
              <div key={s.symptom} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13.5, color: C.ink, textTransform: "capitalize" }}>
                  {s.symptom}
                </div>
                <div style={{ flex: 2, height: 8, background: "rgba(44,35,32,.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${s.pct}%`, height: "100%", background: accent, borderRadius: 99 }}/>
                </div>
                <div style={{ width: 70, textAlign: "right", fontSize: 12.5, color: C.inkSoft }}>
                  {s.count}× · {s.pct}%
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Cycle patterns — only when applicable */}
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
                  <div style={{ width: `${val ? (val / 5) * 100 : 0}%`, height: "100%", background: PHASE_COLOR[phase] || accent, borderRadius: 99 }}/>
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

function EmptyState({ range, accent }) {
  return (
    <div style={{
      padding: 22, borderRadius: 12, textAlign: "center",
      background: "rgba(44,35,32,.03)", borderStyle: "dashed",
      border: `1px dashed ${C.line}`,
    }}>
      <div style={{ fontSize: 14.5, color: C.ink, marginBottom: 6, fontWeight: 600 }}>
        No check-ins logged in this period.
      </div>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
        Reports use the data you've logged. As you check in more often, the patterns sharpen.
      </div>
    </div>
  );
}

function SkeletonContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1,2,3].map((i) => (
        <div key={i} style={{ height: 60, background: "rgba(44,35,32,.04)", borderRadius: 10 }}/>
      ))}
    </div>
  );
}

/* ============================================================
   Small layout helpers
   ============================================================ */
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
    <div style={{
      padding: "11px 13px", borderRadius: 10, background: "rgba(44,35,32,.03)",
      border: `1px solid ${C.line}`,
    }}>
      <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 3 }}>
        {label}
      </div>
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

/* ============================================================
   Print stylesheet — injected once per mount.
   When the body has the `fb-printing-report` class (set by the
   print button), the browser print preview hides everything
   except the report card itself. The .fb-print-only header
   inverts that — hidden on screen, shown in print.
   ============================================================ */
function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 18mm; size: A4 portrait; }
        
        /* Hide app chrome */
        nav,
        aside,
        header,
        [class*="sidebar"],
        [class*="Sidebar"],
        [class*="nav-"],
        [class*="NavBar"],
        [class*="bottom-nav"],
        [class*="BottomNav"],
        .fb-print-hide { 
          display: none !important; 
        }

        /* Reset body/main layout so report fills the page */
        body, #root {
          display: block !important;
          background: white !important;
          overflow: visible !important;
        }

        /* Flatten all layout wrappers */
        #root > * {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        /* Show print-only header */
        .fb-print-only { 
          display: block !important; 
          margin-bottom: 24px;
        }

        /* Make sure report panel and all its children are visible */
        .fb-reports-panel,
        .fb-reports-panel * {
          visibility: visible !important;
          overflow: visible !important;
        }

        /* Clean up card styling for print */
        .fb-reports-panel {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
      }
    `}</style>
  );
}