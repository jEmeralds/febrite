import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, RefreshCw, Check, AlertCircle, Inbox } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { C } from "../../theme/tokens";
import AuthShell, { primaryBtn } from "./AuthShell";

export default function CheckEmail() {
  const { resendConfirmation } = useAuth();
  const { state } = useLocation();
  const nav = useNavigate();
  const email = state?.email || "";

  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email || cooldown > 0 || status === "sending") return;
    setStatus("sending"); setErr("");
    try {
      await resendConfirmation(email);
      setStatus("sent");
      setCooldown(60);
    } catch (e) {
      setStatus("error");
      setErr(e.message || "Couldn't resend right now. Try again in a minute.");
    }
  };

  // No email in route state → user reached the page directly. Send them back.
  if (!email) {
    return (
      <AuthShell title="Check your email" subtitle="Looks like you arrived here directly. Sign up or log in first."
        footer={<><Link to="/signup" style={{ color:C.clay, fontWeight:600 }}>Sign up</Link> · <Link to="/login" style={{ color:C.clay, fontWeight:600 }}>Log in</Link></>}>
        <div/>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Check your inbox" subtitle="One quick step before you're in."
      footer={<>Already confirmed? <Link to="/login" style={{ color:C.clay, fontWeight:600 }}>Log in</Link></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Card>
          <div style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${C.clay}1A`, color:C.clay, display:"grid", placeItems:"center", flexShrink:0 }}><Inbox size={20}/></div>
            <div style={{ fontSize:14.5, color:C.ink, lineHeight:1.6 }}>
              We sent a confirmation link to <b style={{ color:C.ink }}>{email}</b>. Click it to verify your account and you'll be brought right back here.
            </div>
          </div>
        </Card>

        <Card style={{ background:"rgba(118,135,106,.1)", borderColor:"rgba(118,135,106,.3)" }}>
          <div style={{ display:"flex", gap:11, alignItems:"flex-start" }}>
            <AlertCircle size={18} style={{ color:C.sage, marginTop:2, flexShrink:0 }}/>
            <div style={{ fontSize:13.5, color:C.ink, lineHeight:1.55 }}>
              <b style={{ color:C.sage }}>Don't see it?</b> Check your spam or promotions folder. Confirmation emails from Supabase sometimes land there.
            </div>
          </div>
        </Card>

        {status === "sent" && (
          <div style={{ fontSize:13.5, color:C.sage, background:"rgba(118,135,106,.12)", padding:"9px 12px", borderRadius:10, display:"flex", alignItems:"center", gap:7 }}>
            <Check size={15}/> Sent again. Check your inbox.
          </div>
        )}
        {err && (
          <div style={{ fontSize:13.5, color:"#B23A3A", background:"#FBEDED", padding:"9px 12px", borderRadius:10 }}>{err}</div>
        )}

        <button onClick={resend} disabled={cooldown > 0 || status === "sending"}
          style={{ ...primaryBtn, background: cooldown > 0 ? "rgba(44,35,32,.15)" : C.clay, opacity: status==="sending" ? .7 : 1, display:"flex", justifyContent:"center", alignItems:"center", gap:8 }}>
          <RefreshCw size={16} style={{ animation: status==="sending" ? "spin 1s linear infinite" : "none" }}/>
          {status === "sending" ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}
        </button>

        <button onClick={()=>nav("/signup")} style={{ background:"none", border:"none", color:C.inkSoft, fontSize:13.5, cursor:"pointer", fontFamily:"Karla, sans-serif", textAlign:"left" }}>
          Wrong email? Sign up again →
        </button>
      </div>
      <style>{`@keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }`}</style>
    </AuthShell>
  );
}

const Card = ({ children, style }) => (
  <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:14, padding:16, ...style }}>
    {children}
  </div>
);
