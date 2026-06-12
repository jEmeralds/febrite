import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Sparkles, Heart, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { C } from "../../theme/tokens";
import { PageHeader } from "../../components/Logo";
import AuthShell, { field, label, primaryBtn } from "../auth/AuthShell";

export default function JoinAsPro() {
  const { signUpAsPro } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [intro, setIntro] = useState(true);

  const submit = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name as it appears on your registration.");
    if (!email.includes("@")) return setErr("Please enter a valid email.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const data = await signUpAsPro({ email, password: pw, name });
      if (data?.session) nav("/pro/setup");
      else nav("/check-email", { state: { email } });
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (intro) {
    return (
      <div style={{ minHeight:"100vh", background: C.cream, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
        <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 22px 60px" }}>
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:6, color:C.inkSoft, fontSize:14, textDecoration:"none", marginBottom:20 }}>
            <ArrowLeft size={15}/> Back to FeBrite
          </Link>

          <div style={{ fontSize:12, letterSpacing:".1em", textTransform:"uppercase", color:C.clay, fontWeight:700, marginBottom:14 }}>For Practitioners</div>
          <h1 style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(28px,6vw,40px)", color:C.ink, lineHeight:1.1, margin:"0 0 14px" }}>
            Join the practitioners shaping <em>FeBrite</em>.
          </h1>
          <p style={{ fontSize:16, color:C.inkSoft, lineHeight:1.6, margin:"0 0 28px", maxWidth:520 }}>
            We're building a holistic home for women's health — and we partner with verified specialists who want to offer their expertise alongside the platform.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:28 }}>
            <Bullet icon={Heart} title="Offer pro-bono care" body="No fee to FeBrite. Build your impact and visibility while supporting women who couldn't otherwise access you."/>
            <Bullet icon={Sparkles} title="Or charge for your time" body="FeBrite takes a modest commission (currently 15%) on paid sessions. You set your rate."/>
            <Bullet icon={Check} title="Or mix the two" body="Some pro-bono slots, some paid. You get a discount on FeBrite's fee in recognition of your free work."/>
          </div>

          <div style={{ padding:16, borderRadius:14, background:`${C.clay}10`, border:`1px solid ${C.clay}30`, marginBottom:28, fontSize:13.5, lineHeight:1.55 }}>
            <b style={{ color:C.clay }}>Verification.</b> Every practitioner is verified by our editorial team before appearing in the directory — registration number, professional body, identity. This usually takes 2–5 business days.
          </div>

          <button onClick={()=>setIntro(false)} style={{ ...primaryBtn, display:"inline-flex", alignItems:"center", gap:8 }}>
            <Stethoscope size={17}/> Start your application
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthShell title="Practitioner sign-up" subtitle="Two minutes to start. We'll send a confirmation email."
      footer={<>Not a practitioner? <Link to="/signup" style={{ color:C.clay, fontWeight:600 }}>Sign up as a user instead</Link></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><label style={label}>Full professional name</label><input style={field} value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Dr Amani Mwangi"/></div>
        <div><label style={label}>Work email</label><input style={field} type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@clinic.co.ke"/></div>
        <div><label style={label}>Password</label><input style={field} type="password" value={pw} onChange={(e)=>setPw(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} placeholder="At least 6 characters"/></div>
        {err && <div style={{ fontSize:13.5, color:"#B23A3A", background:"#FBEDED", padding:"9px 12px", borderRadius:10 }}>{err}</div>}
        <button style={{ ...primaryBtn, opacity:busy?.7:1 }} disabled={busy} onClick={submit}>{busy ? "Creating account…" : "Continue"}</button>
        <p style={{ fontSize:12, color:C.inkSoft, lineHeight:1.5, margin:0 }}>
          By continuing you agree to our <Link to="/legal/terms" style={{ color:C.clay }}>Terms</Link> and acknowledge that you are a licensed professional. We'll verify your registration before listing you publicly.
        </p>
      </div>
    </AuthShell>
  );
}

const Bullet = ({ icon:Icon, title, body }) => (
  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
    <div style={{ width:36, height:36, borderRadius:10, background:`${C.clay}1A`, color:C.clay, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={18}/></div>
    <div>
      <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:14, color:C.inkSoft, lineHeight:1.55 }}>{body}</div>
    </div>
  </div>
);
