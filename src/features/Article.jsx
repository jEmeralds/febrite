import { ArrowLeft, ShieldCheck, CheckCircle2, Stethoscope, MessageCircle, Store, ClipboardCheck, ChevronRight } from "lucide-react";
import { DOMAINS } from "../data/content";
import { findAssessment } from "../data/assessments";
import { Card, Pill, C } from "../components/ui";

export default function Article({ c, stage, back, go }) {
  const d = DOMAINS[c.dom]; const Icon = d.icon;
  const assessment = findAssessment(c.dom, stage);
  return (
    <div style={{ maxWidth:680 }}>
      <button onClick={back} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:18, fontFamily:"Karla, sans-serif" }}><ArrowLeft size={16}/> Library</button>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:`${d.color}1A`, color:d.color, display:"grid", placeItems:"center" }}><Icon size={18}/></div>
        <Pill color={d.color}>{d.label}</Pill>
        <span style={{ fontSize:12.5, color:C.inkSoft }}>{c.read} read</span>
      </div>
      <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(24px,5vw,38px)", lineHeight:1.1, color:C.ink, margin:"0 0 16px", letterSpacing:"-.01em" }}>{c.title}</h1>
      <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.sage, fontWeight:600, marginBottom:24, paddingBottom:18, borderBottom:`1px solid ${C.line}` }}>
        <ShieldCheck size={15}/> {c.cred} · {c.src} · Reviewed {c.date}
      </div>
      {c.body.map((p,i)=>(<p key={i} style={{ fontSize:16.5, lineHeight:1.7, color:C.ink, margin:"0 0 18px" }}>{p}</p>))}
      <Card style={{ background:`${d.color}0D`, borderColor:`${d.color}33`, marginTop:8 }}>
        <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, marginBottom:10 }}>Key takeaways</div>
        {c.takeaways.map((t,i)=>(<div key={i} style={{ display:"flex", gap:9, alignItems:"flex-start", marginBottom:8, fontSize:14.5, color:C.ink, lineHeight:1.5 }}><CheckCircle2 size={17} style={{ color:d.color, flexShrink:0, marginTop:1 }}/> {t}</div>))}
      </Card>
      <Card style={{ marginTop:14, borderColor:`${C.clay}33`, background:"#FBF1EC", display:"flex", gap:11, alignItems:"flex-start" }}>
        <Stethoscope size={19} style={{ color:C.clay, flexShrink:0, marginTop:2 }}/>
        <div>
          <div style={{ fontWeight:700, color:C.clay, fontSize:13.5, marginBottom:3 }}>When to see a professional</div>
          <div style={{ fontSize:14, color:C.ink, lineHeight:1.55 }}>{c.seePro}</div>
        </div>
      </Card>
      {assessment && (
        <Card hoverable onClick={()=>go("assessment", assessment)} style={{ marginTop:14, display:"flex", alignItems:"center", gap:12, borderColor:`${d.color}33` }}>
          <div style={{ width:40, height:40, borderRadius:11, background:`${d.color}1A`, color:d.color, display:"grid", placeItems:"center", flexShrink:0 }}><ClipboardCheck size={20}/></div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:C.ink, fontSize:15 }}>How are you doing with this?</div>
            <div style={{ fontSize:13, color:C.inkSoft, marginTop:2, lineHeight:1.5 }}>Take a private {assessment.minutes}-minute check-in and get recommendations tailored to you.</div>
          </div>
          <ChevronRight size={18} style={{ color:d.color }}/>
        </Card>
      )}
      <div style={{ display:"flex", gap:10, marginTop:18, flexWrap:"wrap" }}>
        <button onClick={()=>go("companion")} style={{ display:"flex", alignItems:"center", gap:7, padding:"11px 16px", borderRadius:12, border:"none", background:d.color, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer" }}><MessageCircle size={15}/> Ask the companion</button>
        <button disabled style={{ display:"flex", alignItems:"center", gap:7, padding:"11px 16px", borderRadius:12, border:`1px dashed ${C.line}`, background:"transparent", color:C.inkSoft, fontSize:14, cursor:"not-allowed" }}><Store size={15}/> Book a {d.pro.toLowerCase()} <span style={{ fontSize:9.5, padding:"2px 6px", borderRadius:6, background:"rgba(44,35,32,.07)" }}>SOON</span></button>
      </div>
    </div>
  );
}
