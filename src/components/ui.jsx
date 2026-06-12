import { useState } from "react";
import { C } from "../theme/tokens";

export { C };

export const Pill = ({ children, color }) => (
  <span style={{ fontSize:11, letterSpacing:".05em", textTransform:"uppercase", color:color||C.inkSoft,
    background:"rgba(44,35,32,.05)", border:`1px solid ${C.line}`, padding:"3px 9px", borderRadius:999, fontWeight:600 }}>{children}</span>
);

export const Card = ({ children, style, onClick, hoverable }) => {
  const [h,setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, padding:20,
        cursor:onClick?"pointer":"default", transition:"transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s",
        transform:hoverable&&h?"translateY(-3px)":"none",
        boxShadow:hoverable&&h?"0 14px 34px -18px rgba(44,35,32,.4)":"0 2px 10px -6px rgba(44,35,32,.18)",
        borderColor:hoverable&&h?"rgba(178,90,56,.4)":C.line, ...style }}>{children}</div>
  );
};

export const SectionHead = ({ eyebrow, title, accent, style }) => (
  <div style={{ marginBottom:18, ...style }}>
    <div style={{ fontSize:12, letterSpacing:".08em", textTransform:"uppercase", color:accent, fontWeight:700 }}>{eyebrow}</div>
    <h2 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(22px, 5.5vw, 30px)", color:C.ink, margin:"4px 0 0", letterSpacing:"-.01em", wordBreak:"break-word" }}>{title}</h2>
  </div>
);

export const QuickTile = ({ icon:Icon, title, sub, onClick, accent }) => (
  <Card hoverable onClick={onClick} style={{ display:"flex", flexDirection:"column", gap:10 }}>
    <div style={{ width:38, height:38, borderRadius:11, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center" }}><Icon size={19}/></div>
    <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink }}>{title}</div>
    <div style={{ fontSize:13, color:C.inkSoft }}>{sub}</div>
  </Card>
);
