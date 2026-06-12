import { ChevronRight, Lock } from "lucide-react";
import { STAGES } from "../data/content";
import { STAGE_ACCENT, C } from "../theme/tokens";
import { Card, Pill } from "../components/ui";

export default function Onboarding({ onPick }) {
  return (
    <div style={{ maxWidth:920, margin:"0 auto", padding:"60px 24px 96px" }}>
      <div className="fb-rise">
        <Pill color={C.clay}>A holistic home for women</Pill>
        <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(28px,6vw,56px)", lineHeight:1.02, color:C.ink, margin:"18px 0 14px", letterSpacing:"-.02em" }}>
          Care that meets you<br/><span style={{ fontStyle:"italic", color:C.clay }}>exactly where you are.</span>
        </h1>
        <p style={{ fontSize:17, color:C.inkSoft, maxWidth:560, lineHeight:1.6 }}>
          Seven kinds of expertise — gynaecology, medicine, psychiatry, psychology, nutrition, movement and life — woven into one home that adapts to your stage of life.
        </p>
      </div>
      <div style={{ display:"grid", gap:14, marginTop:38, gridTemplateColumns:"repeat(auto-fit,minmax(min(150px,100%),1fr))" }}>
        {Object.entries(STAGES).map(([id,s],i)=>{
          const Icon = s.icon; const accent = STAGE_ACCENT[id];
          return (
            <div key={id} className="fb-rise" style={{ animationDelay:`${.07*i+.1}s` }}>
              <Card hoverable onClick={()=>onPick(id)} style={{ height:"100%", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ width:42, height:42, borderRadius:12, display:"grid", placeItems:"center", background:`${accent}1A`, color:accent }}><Icon size={22}/></div>
                <div>
                  <div style={{ fontFamily:"Fraunces, serif", fontSize:21, color:C.ink }}>{s.label}</div>
                  <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:2 }}>{s.range}</div>
                </div>
                <div style={{ fontSize:13.5, color:C.inkSoft, lineHeight:1.5, marginTop:"auto" }}>{s.tag}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, color:accent, fontSize:13, fontWeight:600 }}>Enter <ChevronRight size={15}/></div>
              </Card>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:32, color:C.inkSoft, fontSize:13 }}>
        <Lock size={14}/> Private by design — encrypted, and shared only with your consent.
      </div>
    </div>
  );
}
