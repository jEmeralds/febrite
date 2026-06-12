import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, RefreshCw, Check } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getPractitionerByUserId, isPractitionerProfileComplete } from "../../lib/practitioners";
import { C } from "../../theme/tokens";
import AuthShell, { field, label, primaryBtn } from "./AuthShell";

export default function Login() {
  const { signIn, resendConfirmation } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resendStatus, setResendStatus] = useState("idle");
  const [resendErr, setResendErr] = useState("");

  const submit = async () => {
    setErr(""); setNeedsConfirm(false); setResendStatus("idle");
    if (!email.includes("@")) return setErr("Please enter a valid email.");
    if (!pw) return setErr("Please enter your password.");
    setBusy(true);
    try {
      const data = await signIn({ email, password: pw });
      const u = data?.user;
      const isPro = u?.user_metadata?.is_pro === true;
      if (isPro) {
        const p = await getPractitionerByUserId(u.id);
        nav(isPractitionerProfileComplete(p) ? "/pro/status" : "/pro/setup", { replace: true });
      } else {
        nav("/app", { replace: true });
      }
    } catch (e) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setNeedsConfirm(true);
      } else {
        setErr(e.message || "Couldn't sign you in. Check your details.");
      }
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setResendStatus("sending"); setResendErr("");
    try {
      await resendConfirmation(email);
      setResendStatus("sent");
    } catch (e) {
      setResendStatus("error");
      setResendErr(e.message || "Couldn't resend right now. Try again in a minute.");
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Pick up right where you left off."
      footer={<>New here? <Link to="/signup" style={{ color:C.clay, fontWeight:600 }}>Create an account</Link></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><label style={label}>Email</label><input style={field} type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <div><label style={label}>Password</label><input style={field} type="password" value={pw} onChange={(e)=>setPw(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} placeholder="Your password"/></div>

        {err && <div style={{ fontSize:13.5, color:"#B23A3A", background:"#FBEDED", padding:"9px 12px", borderRadius:10 }}>{err}</div>}

        {needsConfirm && (
          <div style={{ padding:14, borderRadius:12, background:`${C.clay}10`, border:`1px solid ${C.clay}33`, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
              <Mail size={18} style={{ color:C.clay, marginTop:2, flexShrink:0 }}/>
              <div style={{ fontSize:13.5, color:C.ink, lineHeight:1.55 }}>
                Your email isn't confirmed yet. Check your inbox — and spam folder — for the link we sent. Or resend it below.
              </div>
            </div>
            {resendStatus === "sent" ? (
              <div style={{ fontSize:13, color:C.sage, display:"flex", alignItems:"center", gap:6 }}>
                <Check size={14}/> Sent. Check your inbox.
              </div>
            ) : (
              <button onClick={resend} disabled={resendStatus === "sending"}
                style={{ alignSelf:"flex-start", display:"flex", alignItems:"center", gap:7, padding:"9px 14px", borderRadius:10, border:`1px solid ${C.clay}`, background:"transparent", color:C.clay, fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif" }}>
                <RefreshCw size={14} style={{ animation: resendStatus==="sending" ? "spin 1s linear infinite" : "none" }}/>
                {resendStatus === "sending" ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
            {resendErr && <div style={{ fontSize:12.5, color:"#B23A3A" }}>{resendErr}</div>}
          </div>
        )}

        <button style={{ ...primaryBtn, opacity:busy?.7:1 }} disabled={busy} onClick={submit}>{busy?"Signing in…":"Log in"}</button>
      </div>
      <style>{`@keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }`}</style>
    </AuthShell>
  );
}
