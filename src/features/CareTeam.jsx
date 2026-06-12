import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ExternalLink, Check, Bot, ShieldAlert, ChevronRight, MapPin, Globe } from "lucide-react";
import { Card, SectionHead, C } from "../components/ui";
import { listVerifiedPractitioners } from "../lib/practitioners";
import { SPECIALTIES, SPECIALTY_BY_ID } from "../data/specialties";
import { AI_RESOURCES, AI_DISCLAIMER } from "../data/ai_resources";

export default function CareTeam({ accent }) {
  const [practitioners, setPractitioners] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listVerifiedPractitioners();
        if (active) setPractitioners(data);
      } catch (e) { console.error(e); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const visible = filter ? practitioners.filter((p) => p.specialty === filter) : practitioners;
  const specialtiesPresent = [...new Set(practitioners.map((p) => p.specialty))];

  return (
    <div>
      <SectionHead eyebrow="Who stands behind every word" title="Your care team" accent={accent}/>
      <p style={{ fontSize:15.5, color:C.inkSoft, lineHeight:1.6, maxWidth:580, marginTop:-6, marginBottom:24 }}>
        Holistic care means many kinds of expertise in one place. Every practitioner here is verified — and a growing number offer pro-bono sessions for women who need them.
      </p>

      {/* Specialty filter (only show if there's more than one specialty represented) */}
      {specialtiesPresent.length > 1 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
          <Pill on={!filter} accent={accent} onClick={()=>setFilter("")}>All</Pill>
          {specialtiesPresent.map((id) => (
            <Pill key={id} on={filter === id} accent={accent} onClick={()=>setFilter(id)}>{SPECIALTY_BY_ID[id]?.short || id}</Pill>
          ))}
        </div>
      )}

      {/* Practitioner cards */}
      {loading && <Card><div style={{ padding:16, color:C.inkSoft }}>Loading practitioners…</div></Card>}
      {!loading && visible.length === 0 && (
        <Card style={{ borderStyle:"dashed", padding:"20px 18px", textAlign:"center" }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, marginBottom:6 }}>Practitioners coming soon</div>
          <div style={{ fontSize:13.5, color:C.inkSoft, lineHeight:1.55, maxWidth:420, margin:"0 auto" }}>
            We're verifying the first group of professionals. If you're one, we'd love to have you — apply below.
          </div>
        </Card>
      )}
      {!loading && visible.length > 0 && (
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))" }}>
          {visible.map((p) => <PractitionerCard key={p.id} p={p}/>)}
        </div>
      )}

      {/* Apply-as-pro CTA */}
      <Card style={{ marginTop:20, background:`linear-gradient(135deg, ${accent}10, ${C.card} 65%)`, borderColor:`${accent}33`, display:"flex", gap:14, alignItems:"center" }}>
        <div style={{ width:46, height:46, borderRadius:13, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}>
          <Briefcase size={22}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink }}>Are you a women's-wellness professional?</div>
          <div style={{ fontSize:13.5, color:C.inkSoft, marginTop:3, lineHeight:1.55 }}>Apply to join FeBrite. Offer paid sessions, pro-bono care, or both. Pro-bono is fee-free; mixed practice gets a discount.</div>
        </div>
        <Link to="/join-as-pro" style={{ padding:"10px 16px", borderRadius:11, background:accent, color:"#fff", fontSize:13.5, fontWeight:600, textDecoration:"none", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
          Apply <ChevronRight size={15}/>
        </Link>
      </Card>

      {/* AI Companions */}
      <div style={{ marginTop:36 }}>
        <SectionHead eyebrow="When you'd rather talk to a bot than a person" title="AI companions & digital resources" accent={accent}/>
        <p style={{ fontSize:14.5, color:C.inkSoft, lineHeight:1.6, maxWidth:580, marginTop:-6, marginBottom:18 }}>{AI_DISCLAIMER}</p>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))" }}>
          {AI_RESOURCES.map((r) => <AIResourceCard key={r.id} r={r} accent={accent}/>)}
        </div>

        <Card style={{ marginTop:16, background:"rgba(178,90,56,.06)", borderColor:"rgba(178,90,56,.25)", display:"flex", gap:11, alignItems:"flex-start" }}>
          <ShieldAlert size={17} style={{ color:"#B25A38", marginTop:2, flexShrink:0 }}/>
          <div style={{ fontSize:13.5, color:C.ink, lineHeight:1.55 }}>
            If you're in immediate distress, AI tools are not the right place. Visit the <Link to="/support" style={{ color:"#B25A38", fontWeight:600 }}>Support page</Link> for crisis lines.
          </div>
        </Card>
      </div>
    </div>
  );
}

function PractitionerCard({ p }) {
  const spec = SPECIALTY_BY_ID[p.specialty];
  const color = spec?.color || "#B25A38";
  return (
    <Link to={`/practitioner/${p.id}`} style={{ textDecoration:"none", color:"inherit" }}>
      <Card hoverable style={{ display:"flex", flexDirection:"column", gap:10, height:"100%" }}>
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
          <Avatar src={p.photo_url} name={p.display_name} color={color}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, color:C.ink, fontSize:15, lineHeight:1.25 }}>{p.display_name}{p.credentials && <span style={{ color:C.inkSoft, fontWeight:400 }}>, {p.credentials}</span>}</div>
            {spec && <div style={{ fontSize:11.5, color, fontWeight:700, marginTop:4, textTransform:"uppercase", letterSpacing:".04em" }}>{spec.short}</div>}
          </div>
        </div>
        {p.bio && <p style={{ fontSize:13.5, color:C.inkSoft, lineHeight:1.55, margin:0, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.bio}</p>}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", fontSize:12, color:C.inkSoft, marginTop:"auto" }}>
          {p.location && <span style={{ display:"flex", alignItems:"center", gap:3 }}><MapPin size={11}/> {p.location}</span>}
          {p.fee_model && <FeeBadge fee={p.fee_model}/>}
        </div>
      </Card>
    </Link>
  );
}

function AIResourceCard({ r, accent }) {
  return (
    <Card style={{ display:"flex", flexDirection:"column", gap:8, height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}><Bot size={17}/></div>
        <div style={{ fontWeight:700, color:C.ink, fontSize:15 }}>{r.name}</div>
      </div>
      <div style={{ fontSize:12, color:accent, fontWeight:700, textTransform:"uppercase", letterSpacing:".04em" }}>{r.focus}</div>
      <p style={{ fontSize:13.5, color:C.ink, lineHeight:1.55, margin:0 }}>{r.description}</p>
      <div style={{ fontSize:12, color:C.inkSoft, marginTop:2 }}>Cost: <b style={{ color:C.ink }}>{r.cost}</b></div>
      <div style={{ fontSize:11.5, color:C.inkSoft, fontStyle:"italic", lineHeight:1.5, marginTop:4, paddingTop:8, borderTop:`1px solid ${C.line}` }}>{r.caveat}</div>
      <a href={r.url} target="_blank" rel="noreferrer" style={{ marginTop:"auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, padding:"8px 12px", borderRadius:10, border:`1px solid ${C.line}`, color:C.ink, textDecoration:"none", fontSize:13, fontWeight:600 }}>
        Visit {r.name} <ExternalLink size={13}/>
      </a>
    </Card>
  );
}

function Avatar({ src, name, color }) {
  if (src) return <img src={src} alt={name} style={{ width:48, height:48, borderRadius:13, objectFit:"cover", flexShrink:0, border:`2px solid ${color}33` }}/>;
  const initials = name.split(" ").map((w) => w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{ width:48, height:48, borderRadius:13, background:`${color}1A`, color, display:"grid", placeItems:"center", fontWeight:700, fontFamily:"Fraunces, serif", flexShrink:0 }}>{initials}</div>;
}

function FeeBadge({ fee }) {
  const map = { probono: { label: "Pro-bono", color: "#76876A" }, paid: { label: "Paid", color: "#C9893F" }, mixed: { label: "Mixed", color: "#B25A38" } };
  const m = map[fee]; if (!m) return null;
  return <span style={{ padding:"2px 8px", borderRadius:99, background:`${m.color}1A`, color:m.color, fontSize:11, fontWeight:700, letterSpacing:".03em", textTransform:"uppercase" }}>{m.label}</span>;
}

const Pill = ({ on, accent, onClick, children }) => (
  <button onClick={onClick} style={{ padding:"6px 12px", borderRadius:99, border:`1px solid ${on?accent:C.line}`, background: on ? `${accent}1A` : "transparent", color: on?accent:C.inkSoft, fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif" }}>{children}</button>
);
