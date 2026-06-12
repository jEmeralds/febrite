import { LifeBuoy, Phone, ExternalLink } from "lucide-react";
import { RESOURCES } from "../data/content";
import { Card, SectionHead, C } from "../components/ui";

export default function Resources({ accent }) {
  return (
    <div>
      <SectionHead eyebrow="If you need someone now" title="Support & care" accent={accent}/>
      <Card style={{ marginBottom:16, borderColor:`${C.clay}33`, background:"#FBF1EC", display:"flex", gap:10, alignItems:"flex-start" }}>
        <LifeBuoy size={20} style={{ color:C.clay, marginTop:2 }}/>
        <div><div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink }}>You don't have to carry it alone.</div><div style={{ fontSize:13.5, color:C.inkSoft, marginTop:4, lineHeight:1.5 }}>These lines are staffed by trained people. In an emergency, contact local emergency services.</div></div>
      </Card>
      <div style={{ display:"grid", gap:12 }}>
        {RESOURCES.map((r)=>(
          <Card key={r.name} hoverable style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
            <div><div style={{ fontWeight:600, color:C.ink, fontSize:15 }}>{r.name}</div><div style={{ fontSize:13, color:C.inkSoft, marginTop:2 }}>{r.type} · {r.region}</div></div>
            <div style={{ display:"flex", alignItems:"center", gap:7, color:accent, fontWeight:600, fontSize:14, whiteSpace:"nowrap" }}><Phone size={15}/> {r.phone}</div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop:16, fontSize:12.5, color:C.inkSoft, display:"flex", gap:7, alignItems:"center" }}><ExternalLink size={13}/> In the full version this becomes a live, geolocation-aware directory of clinics and specialists.</div>
    </div>
  );
}
