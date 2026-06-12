import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { C } from "../../theme/tokens";
import AuthShell, { field, label, primaryBtn } from "./AuthShell";

export default function Signup() {
  const { signUp, isDemo } = useAuth();
  const nav = useNavigate();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [err,setErr] = useState("");
  const [busy,setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please tell us what to call you.");
    if (!email.includes("@")) return setErr("Please enter a valid email.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const data = await signUp({ email, password: pw, name });
      // With email confirmation enabled in Supabase, data.session is null.
      // With confirmation off (or demo mode), session is present — go straight in.
      if (data?.session) {
        nav("/welcome", { replace: true });
      } else {
        nav("/check-email", { state: { email }, replace: true });
      }
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free to start, private by design. A few seconds and you're in."
      footer={<>Already have an account? <Link to="/login" style={{ color:C.clay, fontWeight:600 }}>Log in</Link></>}>
      {isDemo && <DemoBadge/>}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><label style={label}>What should we call you?</label><input style={field} value={name} onChange={(e)=>setName(e.target.value)} placeholder="First name or nickname"/></div>
        <div><label style={label}>Email</label><input style={field} type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <div><label style={label}>Password</label><input style={field} type="password" value={pw} onChange={(e)=>setPw(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} placeholder="At least 6 characters"/></div>
        {err && <div style={{ fontSize:13.5, color:"#B23A3A", background:"#FBEDED", padding:"9px 12px", borderRadius:10 }}>{err}</div>}
        <button style={{ ...primaryBtn, opacity:busy?.7:1 }} disabled={busy} onClick={submit}>{busy?"Creating…":"Create account"}</button>
      </div>
      <p style={{ fontSize:12, color:C.inkSoft, marginTop:14, lineHeight:1.5 }}>
        By continuing you agree to our <Link to="/legal/terms" style={{ color:C.inkSoft }}>Terms</Link> and <Link to="/legal/privacy" style={{ color:C.inkSoft }}>Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}

const DemoBadge = () => (
  <div style={{ fontSize:12.5, color:C.inkSoft, background:"rgba(118,135,106,.12)", border:"1px solid rgba(118,135,106,.3)", padding:"9px 12px", borderRadius:10, marginBottom:16, lineHeight:1.5 }}>
    Demo mode — no database connected yet, so your account lives only in this browser. Add Supabase keys to go live.
  </div>
);
