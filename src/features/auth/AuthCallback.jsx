import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getPractitionerByUserId, isPractitionerProfileComplete } from "../../lib/practitioners";
import { C } from "../../theme/tokens";
import AuthShell from "./AuthShell";

export default function AuthCallback() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [tooSlow, setTooSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTooSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const isPro = user.user_metadata?.is_pro === true;
      if (isPro) {
        const pract = await getPractitionerByUserId(user.id);
        nav(isPractitionerProfileComplete(pract) ? "/pro/status" : "/pro/setup", { replace: true });
      } else {
        nav(profile?.life_stage ? "/app" : "/welcome", { replace: true });
      }
    })();
  }, [user, profile, loading, nav]);

  if (tooSlow && !user) {
    return (
      <AuthShell title="We couldn't confirm your email" subtitle="The link may have expired or already been used."
        footer={<><Link to="/login" style={{ color:C.clay, fontWeight:600 }}>Try logging in</Link> · <Link to="/signup" style={{ color:C.clay, fontWeight:600 }}>Sign up again</Link></>}>
        <div style={{ display:"flex", gap:11, alignItems:"flex-start", padding:16, borderRadius:14, background:"#FBF1EC", border:`1px solid ${C.clay}33` }}>
          <AlertCircle size={18} style={{ color:C.clay, marginTop:2, flexShrink:0 }}/>
          <div style={{ fontSize:13.5, color:C.ink, lineHeight:1.55 }}>
            Confirmation links are usually valid for a limited time. If yours is older than a day or two, request a new one by trying to log in — we'll offer to resend.
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirming your email…" subtitle="One moment.">
      <div style={{ display:"flex", justifyContent:"center", padding:20 }}>
        <Loader2 size={28} style={{ color:C.clay, animation:"spin 1s linear infinite" }}/>
      </div>
      <style>{`@keyframes spin { from { transform:rotate(0) } to { transform:rotate(360deg) } }`}</style>
    </AuthShell>
  );
}
