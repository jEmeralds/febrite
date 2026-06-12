import { ShieldCheck } from "lucide-react";
import { DOMAINS } from "../data/content";
import { Card, Pill, C } from "../components/ui";

export default function ContentCard({ c, onClick, full }) {
  const d = DOMAINS[c.dom];
  return (
    <Card hoverable onClick={onClick} style={{ display:"flex", flexDirection:"column", gap:9, height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <Pill color={d.color}>{d.short}</Pill>
        <span style={{ fontSize:12, color:C.inkSoft }}>{c.read}</span>
      </div>
      <div style={{ fontFamily:"Fraunces, serif", fontSize:19, lineHeight:1.25, color:C.ink }}>{c.title}</div>
      <div style={{ fontSize:13.5, color:C.inkSoft, lineHeight:1.5 }}>{c.blurb}</div>
      {full && (
        <div style={{ marginTop:"auto", paddingTop:12, borderTop:`1px solid ${C.line}`, display:"flex", flexDirection:"column", gap:4 }}>
          <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.sage, fontWeight:600 }}><ShieldCheck size={13}/> {c.cred}</span>
          <span style={{ fontSize:11.5, color:C.inkSoft }}>Source: {c.src} · Reviewed {c.date}</span>
        </div>
      )}
    </Card>
  );
}
