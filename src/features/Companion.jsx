import { useState, useRef, useEffect } from "react";
import { BookOpen, ChevronRight, Send, ShieldCheck, AlertTriangle, Phone } from "lucide-react";
import { STAGES } from "../data/content";
import { SectionHead, C } from "../components/ui";
import { useAuth } from "../lib/auth";
import { askCompanion } from "../lib/companion";

const CrisisCard = ({ go }) => (
  <div style={{ marginTop:12, padding:14, borderRadius:12, background:"#FBF1EC", border:`1px solid ${C.clay}33` }}>
    <div style={{ display:"flex", alignItems:"center", gap:7, color:C.clay, fontWeight:700, fontSize:13.5 }}><AlertTriangle size={15}/> Please reach out now</div>
    <p style={{ fontSize:13, color:C.ink, margin:"8px 0 10px", lineHeight:1.5 }}>If you might act on these feelings, contact emergency services or a crisis line. You matter.</p>
    <button onClick={()=>go("resources")} style={{ fontSize:13, fontWeight:600, color:"#fff", background:C.clay, border:"none", padding:"9px 14px", borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}><Phone size={14}/> See support lines</button>
  </div>
);

export default function Companion({ stage, accent, go, openArticle }) {
  const { user, profile } = useAuth();
  const [msgs,setMsgs] = useState([{ who:"ai", text:"Hi — I'm your wellness companion. I know your profile and your recent check-ins. Ask me anything, or tell me what's on your mind." }]);
  const [input,setInput] = useState("");
  const [busy,setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs]);

  const send = async (t) => {
    const val = (t||input).trim(); if(!val || busy) return;
    setMsgs((m)=>[...m,{ who:"me", text:val }]); setInput(""); setBusy(true);
    const a = await askCompanion({ question: val, profile, userId: user?.id });
    setMsgs((m)=>[...m,{ who:"ai", ...a }]); setBusy(false);
  };

  const chips = ["I've been so anxious lately","My periods are really painful","I can't sleep through the night"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <SectionHead eyebrow="Grounded in vetted content · not a clinician" title="Your companion" accent={accent}/>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, padding:"4px 2px 8px", minHeight:260 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.who==="me"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"82%" }}>
              <div style={{ background:m.who==="me"?accent:(m.crisis?"#fff":C.card), color:m.who==="me"?"#fff":C.ink, border:m.crisis?`1.5px solid ${C.clay}`:`1px solid ${C.line}`, borderRadius:16, borderTopRightRadius:m.who==="me"?4:16, borderTopLeftRadius:m.who==="me"?16:4, padding:"12px 15px", fontSize:14.5, lineHeight:1.55 }}>
                {m.text}
                {m.link && (<div onClick={()=>openArticle(m.link)} style={{ marginTop:10, display:"flex", alignItems:"center", gap:7, cursor:"pointer", fontSize:13, color:accent, fontWeight:600 }}><BookOpen size={14}/> {m.link.title} <ChevronRight size={14}/></div>)}
                {m.crisis && <CrisisCard go={go}/>}
              </div>
            </div>
          </div>
        ))}
        {busy && <div style={{ fontSize:13, color:C.inkSoft, paddingLeft:4 }}>…</div>}
        <div ref={endRef}/>
      </div>
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", margin:"4px 0 10px" }}>
        {chips.map((c)=>(<button key={c} onClick={()=>send(c)} style={{ fontSize:12.5, padding:"6px 11px", borderRadius:999, border:`1px solid ${C.line}`, background:"transparent", color:C.inkSoft, cursor:"pointer" }}>{c}</button>))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()} placeholder="Type how you're feeling…"
          style={{ flex:1, padding:"13px 16px", borderRadius:14, border:`1px solid ${C.line}`, background:C.card, fontSize:14.5, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif" }}/>
        <button onClick={()=>send()} style={{ width:48, borderRadius:14, border:"none", background:accent, color:"#fff", display:"grid", placeItems:"center", cursor:"pointer" }}><Send size={18}/></button>
      </div>
      <div style={{ fontSize:11.5, color:C.inkSoft, marginTop:8, display:"flex", gap:6, alignItems:"center" }}><ShieldCheck size={13}/> To see the safety hook, try a phrase about wanting to hurt yourself.</div>
    </div>
  );
}
