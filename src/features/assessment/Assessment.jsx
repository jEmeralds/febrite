import { useState } from "react";
import {
  ArrowLeft, ChevronRight, CheckCircle2, AlertTriangle, Phone, MessageCircle,
  BookOpen, Stethoscope, ShieldCheck, RotateCcw,
} from "lucide-react";
import { CONTENT, DOMAINS } from "../../data/content";
import { Card, C } from "../../components/ui";

export default function Assessment({ assessment: a, stage, accent, go, openArticle, back }) {
  const total = a.questions.length + (a.safety ? 1 : 0);
  const [step, setStep] = useState(0);            // 0..questions, last = safety (if any)
  const [answers, setAnswers] = useState({});     // qIndex -> value
  const [safety, setSafety] = useState(null);     // {crisis}
  const [done, setDone] = useState(false);

  const hasSafety = !!a.safety;
  const safetyStep = a.questions.length;          // index where safety appears

  const choose = (val) => {
    const next = { ...answers, [step]: val };
    setAnswers(next);
    advance();
  };
  const chooseSafety = (opt) => { setSafety(opt); advance(); };
  const advance = () => {
    if (step + 1 >= total) setDone(true);
    else setStep(step + 1);
  };

  const restart = () => { setStep(0); setAnswers({}); setSafety(null); setDone(false); };

  // ---- results ----
  const score = Object.values(answers).reduce((s, v) => s + v, 0);
  const max = a.questions.length * 3;
  const frac = max ? score / max : 0;
  const band = a.bands.find((b) => frac <= b.upTo) || a.bands[a.bands.length - 1];
  const inCrisis = safety?.crisis;

  if (done) {
    return (
      <div style={{ maxWidth: 620 }}>
        <button onClick={back} style={backBtn}><ArrowLeft size={16}/> Done</button>
        {inCrisis ? <CrisisResult accent={accent} go={go}/> : <BandResult band={band} accent={accent} go={go} openArticle={openArticle} score={score} max={max} bands={a.bands}/>}
        <div style={{ display:"flex", gap:10, marginTop:18, flexWrap:"wrap" }}>
          <button onClick={restart} style={{ ...ghost }}><RotateCcw size={14}/> Retake</button>
          <button onClick={back} style={{ ...ghost }}>Back to app</button>
        </div>
        <p style={{ fontSize:12, color:C.inkSoft, marginTop:18, lineHeight:1.5 }}>
          This reflection is educational and private — it isn't a medical diagnosis. Trust how you feel, and reach out to a professional whenever you'd like.
        </p>
      </div>
    );
  }

  // ---- question flow ----
  const onSafety = hasSafety && step === safetyStep;
  const q = onSafety ? a.safety : a.questions[step];
  const progress = Math.round((step / total) * 100);

  return (
    <div style={{ maxWidth: 620 }}>
      <button onClick={back} style={backBtn}><ArrowLeft size={16}/> Cancel</button>
      {step === 0 && (
        <div style={{ marginBottom:18 }}>
          <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(24px,5vw,30px)", color:C.ink, margin:"0 0 8px" }}>{a.title}</h1>
          <p style={{ fontSize:14.5, color:C.inkSoft, lineHeight:1.6 }}>{a.intro}</p>
        </div>
      )}
      <div style={{ height:6, borderRadius:99, background:"rgba(44,35,32,.08)", marginBottom:22 }}>
        <div style={{ width:`${progress}%`, height:"100%", borderRadius:99, background:accent, transition:".3s" }}/>
      </div>
      <Card key={step} className="fb-rise">
        {!onSafety && step === 0 && <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:10 }}>{a.questionIntro}</div>}
        {!onSafety && step > 0 && <div style={{ fontSize:12.5, color:C.inkSoft, marginBottom:10 }}>{a.questionIntro}</div>}
        <div style={{ fontFamily:"Fraunces, serif", fontSize:21, color:C.ink, lineHeight:1.3, marginBottom:18 }}>{q.text}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {q.options.map((o, i) => (
            <button key={i} onClick={() => (onSafety ? chooseSafety(o) : choose(o.value))}
              style={{ textAlign:"left", padding:"13px 15px", borderRadius:12, border:`1px solid ${C.line}`, background:"#fff",
                cursor:"pointer", fontSize:15, color:C.ink, fontFamily:"Karla, sans-serif", display:"flex", alignItems:"center", justifyContent:"space-between", transition:".15s" }}
              onMouseEnter={(e)=>{ e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = `${accent}0D`; }}
              onMouseLeave={(e)=>{ e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = "#fff"; }}>
              {o.label} <ChevronRight size={16} style={{ color:C.inkSoft }}/>
            </button>
          ))}
        </div>
      </Card>
      <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:14 }}>Question {step + 1} of {total} · your answers stay private</div>
    </div>
  );
}

const backBtn = { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:18, fontFamily:"Karla, sans-serif" };
const ghost = { display:"flex", alignItems:"center", gap:7, padding:"10px 15px", borderRadius:11, border:`1px solid ${C.line}`, background:"transparent", color:C.ink, fontSize:13.5, cursor:"pointer", fontFamily:"Karla, sans-serif", fontWeight:600 };

function BandResult({ band, accent, go, openArticle, score, max, bands }) {
  const frac = max ? score / max : 0;
  const currentIdx = bands.indexOf(band);
  return (
    <div>
      {/* Spectrum / gauge — visual position from low to high */}
      <BandSpectrum bands={bands} frac={frac} currentIdx={currentIdx}/>

      {/* All levels — yours is highlighted and expanded, others stay visible so you see the full picture */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
        {bands.map((b, i) => (
          <LevelCard key={i} band={b} active={i===currentIdx} accent={accent} go={go} openArticle={openArticle}/>
        ))}
      </div>
    </div>
  );
}

const TONE = {
  calm:  { color:"#76876A", soft:"rgba(118,135,106,.14)", label:"Doing okay" },
  watch: { color:"#C9893F", soft:"rgba(201,137,63,.14)",  label:"Worth watching" },
  reach: { color:"#B25A38", soft:"rgba(178,90,56,.14)",   label:"Reach out" },
};

function BandSpectrum({ bands, frac, currentIdx }) {
  // map the score fraction onto the gauge as a percentage position
  const pos = Math.min(98, Math.max(2, frac * 100));
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ display:"flex", gap:4, height:14, borderRadius:99, overflow:"hidden" }}>
        {bands.map((b, i) => {
          const t = TONE[b.tone];
          return <div key={i} style={{ flex:1, background:t.color, opacity: i===currentIdx?1:.32 }}/>;
        })}
      </div>
      <div style={{ position:"relative", height:24, marginTop:-7 }}>
        <div style={{ position:"absolute", left:`${pos}%`, transform:"translateX(-50%)" }}>
          <div style={{ width:18, height:18, borderRadius:99, background:"#fff", border:`3px solid ${TONE[bands[currentIdx].tone].color}`, boxShadow:"0 3px 10px rgba(44,35,32,.25)" }}/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:C.inkSoft, letterSpacing:".05em", textTransform:"uppercase", fontWeight:600 }}>
        <span>Lower</span><span>Mid-range</span><span>Higher</span>
      </div>
    </div>
  );
}

function LevelCard({ band, active, accent, go, openArticle }) {
  const t = TONE[band.tone];
  return (
    <div style={{
      background: active ? "#fff" : C.card,
      border: `${active?2:1}px solid ${active?t.color:C.line}`,
      borderRadius: 16, padding: active?20:14, transition:".2s",
      opacity: active ? 1 : 0.85,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:active?8:4 }}>
        <div style={{ width:24, height:24, borderRadius:7, background:t.color }}/>
        <div style={{ fontSize:12, letterSpacing:".06em", textTransform:"uppercase", color:t.color, fontWeight:700 }}>{t.label}</div>
        {active && <span style={{ marginLeft:"auto", fontSize:11, padding:"3px 9px", borderRadius:99, background:t.soft, color:t.color, fontWeight:700 }}>YOU</span>}
      </div>
      <div style={{ fontFamily:"Fraunces, serif", fontSize: active?20:16, color:C.ink, lineHeight:1.25, marginBottom: active?8:0 }}>{band.label}</div>
      {active && (
        <>
          <p style={{ fontSize:14.5, color:C.ink, lineHeight:1.6, margin:"6px 0 14px" }}>{band.message}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {band.actions.map((act, i) => <ActionRow key={i} act={act} accent={accent} go={go} openArticle={openArticle}/>)}
          </div>
        </>
      )}
      {!active && (
        <p style={{ fontSize:13, color:C.inkSoft, lineHeight:1.55, margin:"4px 0 0" }}>{summary(band)}</p>
      )}
    </div>
  );
}

function summary(band) {
  const kinds = band.actions.map((a) => a.type);
  if (kinds.includes("resources")) return "Recommends: support lines, professional care, the companion and reading.";
  if (kinds.includes("professional")) return "Recommends: speaking with a professional, the companion and tailored reading.";
  if (kinds.includes("companion")) return "Recommends: gentle self-care, the companion and a few articles for your stage.";
  return "Recommends: keep noticing, light reading, and check in again soon.";
}

function ActionRow({ act, accent, go, openArticle }) {
  if (act.type === "articles") {
    const items = act.ids.map((id) => CONTENT.find((c) => c.id === id)).filter(Boolean);
    return (
      <>
        {items.map((c) => {
          const d = DOMAINS[c.dom];
          return (
            <Card key={c.id} hoverable onClick={() => openArticle(c)} style={{ display:"flex", alignItems:"center", gap:11 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:`${d.color}1A`, color:d.color, display:"grid", placeItems:"center", flexShrink:0 }}><BookOpen size={17}/></div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600, color:C.ink, fontSize:14.5 }}>{c.title}</div><div style={{ fontSize:12.5, color:C.inkSoft }}>Recommended reading · {c.read}</div></div>
              <ChevronRight size={16} style={{ color:C.inkSoft }}/>
            </Card>
          );
        })}
      </>
    );
  }
  const map = {
    companion: { icon: MessageCircle, label: "Talk it through with the companion", sub: "Judgment-free, anytime", onClick: () => go("companion") },
    professional: { icon: Stethoscope, label: "Consider speaking with a professional", sub: "Booking coming soon · see your care team", onClick: () => go("team") },
    resources: { icon: Phone, label: "See support lines", sub: "Real people, ready to help", onClick: () => go("resources") },
  }[act.type];
  if (!map) return null;
  const Icon = map.icon;
  return (
    <Card hoverable onClick={map.onClick} style={{ display:"flex", alignItems:"center", gap:11 }}>
      <div style={{ width:34, height:34, borderRadius:9, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={17}/></div>
      <div style={{ flex:1 }}><div style={{ fontWeight:600, color:C.ink, fontSize:14.5 }}>{map.label}</div><div style={{ fontSize:12.5, color:C.inkSoft }}>{map.sub}</div></div>
      <ChevronRight size={16} style={{ color:C.inkSoft }}/>
    </Card>
  );
}

function CrisisResult({ accent, go }) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${C.clay}1A`, color:C.clay, display:"grid", placeItems:"center" }}><AlertTriangle size={22}/></div>
        <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(22px,5vw,26px)", color:C.ink, margin:0, lineHeight:1.15 }}>You deserve support right now</h1>
      </div>
      <p style={{ fontSize:16, color:C.ink, lineHeight:1.65, marginBottom:18 }}>
        Thank you for being honest. What you're carrying matters, and you don't have to hold it alone. Please reach out to someone trained to help — talking to a real person can make a difference.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Card hoverable onClick={() => go("resources")} style={{ display:"flex", alignItems:"center", gap:11, borderColor:`${C.clay}33`, background:"#FBF1EC" }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${C.clay}1A`, color:C.clay, display:"grid", placeItems:"center", flexShrink:0 }}><Phone size={17}/></div>
          <div style={{ flex:1 }}><div style={{ fontWeight:700, color:C.clay, fontSize:14.5 }}>See support lines now</div><div style={{ fontSize:12.5, color:C.inkSoft }}>Trained people, ready to listen</div></div>
          <ChevronRight size={16} style={{ color:C.clay }}/>
        </Card>
        <Card hoverable onClick={() => go("companion")} style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}><MessageCircle size={17}/></div>
          <div style={{ flex:1 }}><div style={{ fontWeight:600, color:C.ink, fontSize:14.5 }}>Talk to the companion</div><div style={{ fontSize:12.5, color:C.inkSoft }}>It can help you find the right support</div></div>
          <ChevronRight size={16} style={{ color:C.inkSoft }}/>
        </Card>
      </div>
      <div style={{ marginTop:16, fontSize:13, color:C.inkSoft, display:"flex", gap:7, alignItems:"flex-start", lineHeight:1.5 }}>
        <ShieldCheck size={15} style={{ flexShrink:0, marginTop:2 }}/> If you might act on these feelings, please contact your local emergency services right away.
      </div>
    </div>
  );
}
