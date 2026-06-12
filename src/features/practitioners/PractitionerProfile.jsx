import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Linkedin, Mail, Phone, MapPin, Check, Clock, Tag } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { getPractitioner } from "../../lib/practitioners";
import { SPECIALTY_BY_ID } from "../../data/specialties";
import { Card, SectionHead, C } from "../../components/ui";

export default function PractitionerProfile() {
  const { id } = useParams();
  const { accent } = useTheme();
  const nav = useNavigate();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try { const data = await getPractitioner(id); if (!active) return; if (!data) setNotFound(true); else setPr(data); }
      catch (e) { console.error(e); setNotFound(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  return (
    <div style={{ minHeight:"100vh", background:`radial-gradient(120% 70% at 100% -5%, ${accent}14, ${C.cream} 52%)`, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 20px 80px" }}>
        <button onClick={() => nav(-1)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:14, fontFamily:"Karla, sans-serif" }}>
          <ArrowLeft size={16}/> Back
        </button>

        {loading && <Card><div style={{ padding:18, color:C.inkSoft }}>Loading…</div></Card>}
        {notFound && <Card><div style={{ padding:18, color:C.inkSoft }}>This profile isn't available.</div></Card>}

        {pr && <Body pr={pr} accent={accent}/>}
      </div>
    </div>
  );
}

function Body({ pr, accent }) {
  const spec = SPECIALTY_BY_ID[pr.specialty];
  return (
    <>
      <Card style={{ display:"flex", gap:16, alignItems:"center", marginBottom:14 }}>
        <Avatar src={pr.photo_url} name={pr.display_name} color={spec?.color || accent}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(20px,5vw,26px)", color:C.ink, lineHeight:1.2 }}>{pr.display_name}{pr.credentials && <span style={{ color:C.inkSoft, fontSize:".7em" }}>, {pr.credentials}</span>}</div>
          {spec && <div style={{ fontSize:13, color:spec.color, fontWeight:700, marginTop:5, textTransform:"uppercase", letterSpacing:".05em" }}>{spec.label}</div>}
          <div style={{ marginTop:8, display:"flex", gap:14, flexWrap:"wrap", fontSize:13, color:C.inkSoft }}>
            {pr.location && <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={13}/> {pr.location}</span>}
            {pr.languages?.length > 0 && <span style={{ display:"flex", alignItems:"center", gap:4 }}><Globe size={13}/> {pr.languages.join(", ")}</span>}
            <span style={{ display:"flex", alignItems:"center", gap:4, color:C.sage }}><Check size={13}/> Verified by FeBrite</span>
          </div>
        </div>
      </Card>

      {pr.bio && (
        <Card style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:17, color:C.ink, marginBottom:8 }}>About</div>
          <p style={{ fontSize:14.5, color:C.ink, lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{pr.bio}</p>
        </Card>
      )}

      <FeeBlock pr={pr} accent={accent}/>

      {(pr.contact_email || pr.contact_phone || pr.links?.website || pr.links?.linkedin) && (
        <Card style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:17, color:C.ink, marginBottom:10 }}>Contact</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pr.contact_email && <ContactRow icon={Mail} label={pr.contact_email} href={`mailto:${pr.contact_email}`}/>}
            {pr.contact_phone && <ContactRow icon={Phone} label={pr.contact_phone} href={`tel:${pr.contact_phone}`}/>}
            {pr.links?.website && <ContactRow icon={Globe} label={pr.links.website} href={pr.links.website}/>}
            {pr.links?.linkedin && <ContactRow icon={Linkedin} label="LinkedIn" href={pr.links.linkedin}/>}
          </div>
        </Card>
      )}

      <Card style={{ borderStyle:"dashed", display:"flex", gap:10, alignItems:"flex-start" }}>
        <Clock size={16} style={{ color:C.inkSoft, marginTop:2, flexShrink:0 }}/>
        <div style={{ fontSize:13, color:C.inkSoft, lineHeight:1.55 }}>
          In-app booking is coming soon. For now, reach out directly via the contact details above to arrange a session.
        </div>
      </Card>
    </>
  );
}

function FeeBlock({ pr, accent }) {
  const fee = pr.fee_model;
  if (!fee) return null;
  return (
    <Card style={{ marginBottom:14 }}>
      <div style={{ fontFamily:"Fraunces, serif", fontSize:17, color:C.ink, marginBottom:10 }}>How {pr.display_name.split(" ")[0]} works</div>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        <Badge label={feeLabel(fee)} color={feeColor(fee)}/>
      </div>
      {pr.null && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11.5, letterSpacing:".05em", textTransform:"uppercase", color:C.sage, fontWeight:700, marginBottom:5 }}>Pro-bono offering</div>
          <p style={{ fontSize:14, color:C.ink, lineHeight:1.6, margin:0 }}>{pr.null}</p>
        </div>
      )}
      {Array.isArray(pr.paid_services) && pr.paid_services.length > 0 && (
        <div>
          <div style={{ fontSize:11.5, letterSpacing:".05em", textTransform:"uppercase", color:accent, fontWeight:700, marginBottom:8 }}>Paid services</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pr.paid_services.map((s, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"10px 12px", borderRadius:10, background:"rgba(44,35,32,.03)", border:`1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontWeight:600, color:C.ink, fontSize:14 }}>{s.name || "Service"}</div>
                  {s.duration_min ? <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:2 }}>{s.duration_min} min</div> : null}
                </div>
                <div style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                  <div style={{ fontWeight:700, color:C.ink }}>{s.currency || "KES"} {s.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function feeLabel(f) { return f === "probono" ? "Pro-bono only" : f === "paid" ? "Paid" : "Mixed (paid + pro-bono)"; }
function feeColor(f) { return f === "probono" ? "#76876A" : f === "paid" ? "#C9893F" : "#B25A38"; }

const Badge = ({ label, color }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:`${color}1A`, color, fontSize:12, fontWeight:700, letterSpacing:".03em", textTransform:"uppercase" }}>
    <Tag size={11}/> {label}
  </span>
);

function Avatar({ src, name, color }) {
  if (src) return <img src={src} alt={name} style={{ width:72, height:72, borderRadius:18, objectFit:"cover", border:`2px solid ${color}33`, flexShrink:0 }}/>;
  const initials = name.split(" ").map((w) => w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{ width:72, height:72, borderRadius:18, background:`${color}1A`, color, display:"grid", placeItems:"center", fontWeight:700, fontSize:24, fontFamily:"Fraunces, serif", flexShrink:0 }}>{initials}</div>;
}

const ContactRow = ({ icon:Icon, label, href }) => (
  <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 12px", borderRadius:10, background:"rgba(44,35,32,.03)", color:C.ink, textDecoration:"none", border:`1px solid ${C.line}` }}>
    <Icon size={15} style={{ color:C.inkSoft }}/>
    <span style={{ fontSize:13.5, wordBreak:"break-all" }}>{label}</span>
  </a>
);
