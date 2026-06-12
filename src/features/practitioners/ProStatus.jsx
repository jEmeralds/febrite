import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, LogOut, Edit3 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getPractitionerByUserId } from "../../lib/practitioners";
import { SPECIALTY_BY_ID } from "../../data/specialties";
import { C } from "../../theme/tokens";
import { PageHeader } from "../../components/Logo";

const specialtyLabel = (id) => SPECIALTY_BY_ID[id]?.label || id;

const STATUS_UI = {
  pending:   { icon: Clock,        color: "#C9893F", title: "Application pending review", body: "Our editorial team is verifying your registration with the issuing body. This usually takes 2–5 business days. You'll receive an email once you're approved." },
  verified:  { icon: CheckCircle2, color: "#76876A", title: "You're verified", body: "Your profile is live in the FeBrite directory. Users can now find and request sessions with you." },
  rejected:  { icon: AlertCircle,  color: "#B23A3A", title: "Application not approved", body: "We couldn't verify the registration provided. Please update your details and we'll review again." },
  suspended: { icon: AlertCircle,  color: "#B23A3A", title: "Account suspended", body: "Please get in touch with the FeBrite team." },
};

export default function ProStatus() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await getPractitionerByUserId(user.id);
      setP(data); setLoading(false);
    })();
  }, [user]);

  const out = async () => { await signOut(); nav("/", { replace: true }); };

  if (loading) return <Wrap><p style={{ color:C.inkSoft }}>Loading…</p></Wrap>;
  if (!p) return (
    <Wrap>
      <h1 style={h1}>No application found</h1>
      <p style={{ color:C.inkSoft }}>Looks like you haven't started yet.</p>
      <Link to="/pro/setup" style={btnLink}>Complete your professional profile →</Link>
    </Wrap>
  );

  const ui = STATUS_UI[p.verification_status] || STATUS_UI.pending;
  const Icon = ui.icon;

  return (
    <Wrap>
      <Link to="/" style={backBtn}><ArrowLeft size={15}/> Back to FeBrite</Link>
      <div style={{ fontSize:12, letterSpacing:".1em", textTransform:"uppercase", color:C.clay, fontWeight:700, marginBottom:10 }}>Practitioner dashboard</div>
      <h1 style={h1}>Hi, {p.display_name || "there"}.</h1>

      <div style={{ background:"#fff", border:`1px solid ${ui.color}33`, borderRadius:16, padding:20, marginBottom:18, display:"flex", gap:14, alignItems:"flex-start" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${ui.color}1A`, color:ui.color, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={22}/></div>
        <div>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:20, color:C.ink, marginBottom:6 }}>{ui.title}</div>
          <div style={{ fontSize:14, color:C.inkSoft, lineHeight:1.6 }}>{ui.body}</div>
        </div>
      </div>

      <div style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:16, padding:20, marginBottom:14 }}>
        <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, marginBottom:12 }}>Your application</div>
        <Row label="Specialty" value={specialtyLabel(p.specialty)}/>
        <Row label="Registration" value={`${p.registration_number} · ${p.registration_authority}`}/>
        {p.years_practising && <Row label="Years practising" value={p.years_practising}/>}
        <Row label="Location" value={p.location}/>
        <Row label="Languages" value={(p.languages || []).join(", ")}/>
        <Row label="Fee model" value={p.fee_model === "probono" ? "Pro-bono only" : p.fee_model === "mixed" ? `Mixed${p.probono_slots_per_month ? ` · ${p.probono_slots_per_month} free slots/mo` : ""}${p.hourly_rate_kes ? ` · KES ${p.hourly_rate_kes}/hr` : ""}` : `Paid · KES ${p.hourly_rate_kes}/hr`}/>
        <div style={{ marginTop:14 }}>
          <Link to="/pro/setup" style={btnGhost}><Edit3 size={14}/> Edit your profile</Link>
        </div>
      </div>

      <button onClick={out} style={{ ...btnGhost, display:"inline-flex", alignItems:"center", gap:7, marginTop:10, border:"none", background:"transparent", color:C.inkSoft, cursor:"pointer", padding:"8px 0" }}><LogOut size={14}/> Sign out</button>
    </Wrap>
  );
}

const Wrap = ({ children }) => (
  <div style={{ minHeight:"100vh", background: C.cream, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
    <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 22px 80px" }}>{children}</div>
  </div>
);
const backBtn = { display:"flex", alignItems:"center", gap:6, color:C.inkSoft, fontSize:14, textDecoration:"none", marginBottom:18 };
const h1 = { fontFamily:"Fraunces, serif", fontSize:"clamp(26px,5vw,34px)", color:C.ink, margin:"0 0 18px", lineHeight:1.15 };
const btnLink = { display:"inline-flex", alignItems:"center", gap:7, padding:"10px 16px", borderRadius:10, background: C.clay, color:"#fff", textDecoration:"none", fontWeight:600, fontSize:14 };
const btnGhost = { display:"inline-flex", alignItems:"center", gap:7, padding:"9px 14px", borderRadius:10, border:`1px solid ${C.line}`, background:"transparent", color:C.ink, textDecoration:"none", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif" };

const Row = ({ label, value }) => (
  <div style={{ display:"flex", gap:12, padding:"7px 0", borderTop:`1px solid ${C.line}`, fontSize:13.5 }}>
    <div style={{ width:140, color:C.inkSoft, flexShrink:0 }}>{label}</div>
    <div style={{ color:C.ink, fontWeight:600 }}>{value || "—"}</div>
  </div>
);
