import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ArrowLeft, Check, SkipForward } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { STAGES } from "../../data/content";
import { STAGE_ACCENT, C } from "../../theme/tokens";
import { Card, Pill } from "../../components/ui";

/* Common-condition chips for step 3. Multi-select. None of these
   are required — the goal is to give the day-one daily read enough
   signal to actually be specific. */
const CONDITION_OPTIONS = [
  "PCOS", "Endometriosis", "Anxiety", "Depression", "Migraine",
  "Anaemia", "Thyroid", "Fibroids", "Diabetes", "Hypertension",
];

export default function Welcome() {
  const { profile, updateProfile } = useAuth();
  const { setStage } = useTheme();
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  const [stage, setStageLocal] = useState(null);
  const [focus, setFocus] = useState([]);
  const [cycleStart, setCycleStart] = useState("");
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const [conditions, setConditions] = useState([]);
  const [saving, setSaving] = useState(false);

  const accent = stage ? STAGE_ACCENT[stage] : C.clay;
  const name = profile?.display_name;

  // Skip cycle step for elder stage (post-menopause).
  const showsCycleStep = stage !== "elder";
  const totalSteps = showsCycleStep ? 4 : 3;
  const currentIndex = step;

  const toggle = (list, setList, x) =>
    setList(list.includes(x) ? list.filter((i) => i !== x) : [...list, x]);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const updates = {
      life_stage: stage,
      focus_areas: focus,
    };
    if (showsCycleStep && cycleStart) {
      updates.cycle_start_date = cycleStart;
      updates.cycle_length = Number(cycleLen) || 28;
      updates.period_length = Number(periodLen) || 5;
    }
    if (conditions.length) updates.conditions = conditions;
    try {
      await updateProfile(updates);
      setStage(stage);
      nav("/app", { replace: true });
    } catch (e) {
      console.error("welcome save", e);
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(120% 70% at 100% -5%, ${accent}1A, ${C.cream} 50%)`,
      fontFamily: "Karla, sans-serif", color: C.ink, transition: "background .6s ease",
    }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, maxWidth: 320 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 5, borderRadius: 99,
              background: i <= currentIndex ? accent : "rgba(44,35,32,.12)",
              transition: ".3s",
            }}/>
          ))}
        </div>

        {/* STEP 0 — Life stage */}
        {step === 0 && (
          <div className="fb-rise">
            <Pill color={accent}>{name ? `Welcome, ${name}` : "Welcome"}</Pill>
            <h1 style={h1Style}>
              Where are you in life <span style={{ fontStyle: "italic", color: accent }}>right now?</span>
            </h1>
            <p style={pStyle}>
              This shapes your whole experience — the content, the tools, even the tone. You can change it anytime in your profile.
            </p>
            <div style={{ display: "grid", gap: 14, marginTop: 30, gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))" }}>
              {Object.entries(STAGES).map(([id, s]) => {
                const Icon = s.icon; const a = STAGE_ACCENT[id]; const sel = stage === id;
                return (
                  <Card key={id} hoverable onClick={() => { setStageLocal(id); setStep(1); }}
                    style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10, borderColor: sel ? a : C.line }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${a}1A`, color: a }}>
                      <Icon size={22}/>
                    </div>
                    <div>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 21 }}>{s.label}</div>
                      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{s.range}</div>
                    </div>
                    <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.5, marginTop: "auto" }}>{s.tag}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: a, fontSize: 13, fontWeight: 600 }}>
                      Choose <ChevronRight size={15}/>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1 — Focus areas */}
        {step === 1 && stage && (
          <div className="fb-rise">
            <BackBtn onClick={() => setStep(0)}/>
            <h1 style={h1Style}>
              What would you like FeBrite to <span style={{ fontStyle: "italic", color: accent }}>focus on?</span>
            </h1>
            <p style={pStyle}>
              Pick whatever feels relevant. We'll bring these forward for you. Choose as many or as few as you like.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "26px 0 8px" }}>
              {STAGES[stage].concerns.map((x) => {
                const sel = focus.includes(x);
                return (
                  <button key={x} onClick={() => toggle(focus, setFocus, x)}
                    style={chipStyle(sel, accent)}>
                    {sel && <Check size={15}/>} {x}
                  </button>
                );
              })}
            </div>
            <FlowButtons accent={accent}
              onContinue={() => setStep(showsCycleStep ? 2 : 3)}
              continueLabel="Continue"/>
          </div>
        )}

        {/* STEP 2 — Cycle (skipped for elder) */}
        {step === 2 && showsCycleStep && (
          <div className="fb-rise">
            <BackBtn onClick={() => setStep(1)}/>
            <h1 style={h1Style}>
              When did your <span style={{ fontStyle: "italic", color: accent }}>last period</span> start?
            </h1>
            <p style={pStyle}>
              This is what makes the whole app know where you are. We'll predict your phases from this — you can correct it anytime.
            </p>
            <div style={{ display: "grid", gap: 14, marginTop: 26, maxWidth: 540 }}>
              <Field label="Last period start date">
                <input type="date" value={cycleStart} max={new Date().toISOString().slice(0,10)}
                  onChange={(e) => setCycleStart(e.target.value)}
                  style={inputStyle}/>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Average cycle length (days)">
                  <input type="number" min={20} max={45} value={cycleLen}
                    onChange={(e) => setCycleLen(e.target.value)}
                    style={inputStyle}/>
                </Field>
                <Field label="Average period length (days)">
                  <input type="number" min={2} max={10} value={periodLen}
                    onChange={(e) => setPeriodLen(e.target.value)}
                    style={inputStyle}/>
                </Field>
              </div>
            </div>
            <FlowButtons accent={accent}
              onContinue={() => setStep(3)}
              onSkip={() => setStep(3)}
              continueLabel="Continue"/>
          </div>
        )}

        {/* STEP 3 — Optional conditions */}
        {step === 3 && (
          <div className="fb-rise">
            <BackBtn onClick={() => setStep(showsCycleStep ? 2 : 1)}/>
            <h1 style={h1Style}>
              Anything you live with that <span style={{ fontStyle: "italic", color: accent }}>shapes how you feel?</span>
            </h1>
            <p style={pStyle}>
              Optional, and only what you want to share. This helps your companion know not to give you generic advice — it'll respect what you're actually working with.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "26px 0 8px" }}>
              {CONDITION_OPTIONS.map((x) => {
                const sel = conditions.includes(x);
                return (
                  <button key={x} onClick={() => toggle(conditions, setConditions, x)}
                    style={chipStyle(sel, accent)}>
                    {sel && <Check size={15}/>} {x}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={finish} disabled={saving} style={primaryBtn(accent, saving)}>
                {saving ? "Setting up…" : "Enter FeBrite"} <ChevronRight size={18}/>
              </button>
              <button onClick={finish} disabled={saving} style={skipBtn}>
                {conditions.length ? "Save & continue" : "Skip for now"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- atoms ---------------- */
const h1Style = {
  fontFamily: "Fraunces, serif", fontWeight: 400,
  fontSize: "clamp(28px,6vw,48px)", lineHeight: 1.05,
  margin: "16px 0 12px", letterSpacing: "-.02em",
};
const pStyle = { fontSize: 16.5, color: C.inkSoft, maxWidth: 560, lineHeight: 1.6 };
const inputStyle = {
  padding: "12px 14px", borderRadius: 11, border: `1px solid ${C.line}`,
  background: "#fff", fontSize: 15, color: C.ink, outline: "none",
  fontFamily: "Karla, sans-serif", width: "100%",
};
const skipBtn = {
  background: "none", border: "none", color: C.inkSoft, fontSize: 14.5,
  cursor: "pointer", fontFamily: "Karla, sans-serif",
};
const chipStyle = (sel, accent) => ({
  display: "flex", alignItems: "center", gap: 8, fontSize: 14.5,
  padding: "11px 16px", borderRadius: 999, cursor: "pointer",
  fontFamily: "Karla, sans-serif",
  border: `1px solid ${sel ? accent : C.line}`,
  background: sel ? accent : "transparent",
  color: sel ? "#fff" : C.ink, transition: ".15s",
});
const primaryBtn = (accent, busy) => ({
  display: "flex", alignItems: "center", gap: 8,
  background: accent, color: "#fff", border: "none",
  fontSize: 16, fontWeight: 600, padding: "14px 26px", borderRadius: 13,
  cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
  fontFamily: "Karla, sans-serif",
});

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {children}
    </label>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      color: C.inkSoft, fontSize: 14, marginBottom: 14, fontFamily: "Karla, sans-serif",
    }}>
      <ArrowLeft size={16}/> Back
    </button>
  );
}

function FlowButtons({ accent, onContinue, onSkip, continueLabel = "Continue" }) {
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 32, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={onContinue} style={primaryBtn(accent, false)}>
        {continueLabel} <ChevronRight size={18}/>
      </button>
      {onSkip && (
        <button onClick={onSkip} style={skipBtn}>
          <SkipForward size={14} style={{ marginRight: 5, verticalAlign: "middle" }}/>
          I'll set this up later
        </button>
      )}
    </div>
  );
}
