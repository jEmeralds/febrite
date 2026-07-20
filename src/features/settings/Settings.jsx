import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Bell, Eye, Database, LogOut, Trash2, Check,
  Download, LifeBuoy, Mail, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { STAGES } from "../../data/content";
import { C } from "../../theme/tokens";
import { Card } from "../../components/ui";
import { PageHeader } from "../../components/Logo";
import { useReduceMotionPref } from "../../lib/usePreferences";
import { getRecentEntries } from "../../lib/trackingApi";
import { supabase } from "../../lib/supabase";

const SUPPORT_EMAIL = "hello.febrite@gmail.com";

const Row = ({ icon:Icon, title, desc, children }) => (
  <div style={{ display:"flex", gap:13, alignItems:"flex-start", padding:"16px 0", borderBottom:`1px solid ${C.line}` }}>
    <div style={{ width:36, height:36, borderRadius:10, background:"rgba(44,35,32,.06)", color:C.inkSoft, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={18}/></div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontWeight:600, color:C.ink, fontSize:15 }}>{title}</div>
      {desc && <div style={{ fontSize:13, color:C.inkSoft, marginTop:2, lineHeight:1.5 }}>{desc}</div>}
      <div style={{ marginTop:10 }}>{children}</div>
    </div>
  </div>
);

const Toggle = ({ on, onChange, accent }) => (
  <button onClick={()=>onChange(!on)} aria-pressed={on} style={{ width:46, height:26, borderRadius:99, border:"none", cursor:"pointer", background:on?accent:"rgba(44,35,32,.18)", position:"relative", transition:".2s" }}>
    <span style={{ position:"absolute", top:3, left:on?23:3, width:20, height:20, borderRadius:99, background:"#fff", transition:".2s" }}/>
  </button>
);

export default function Settings() {
  const { user, profile, updateProfile, signOut, deleteAccount } = useAuth();
  const { accent, setStage } = useTheme();
  const nav = useNavigate();

  // ---- Profile basics (the existing working save) ----
  const [name,setName] = useState(profile?.display_name || "");
  const [region,setRegion] = useState(profile?.region || "");
  const [stage,setStageLocal] = useState(profile?.life_stage || "young");
  const [saved,setSaved] = useState(false);

  // ---- Preferences ----
  // reminders is per-user (synced via profile) so it follows them across devices
  const remindersOn = profile?.reminders_enabled !== false;
  const [reduceMotion, setReduceMotion] = useReduceMotionPref();

  // ---- Data actions ----
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const saveBasics = async () => {
    await updateProfile({ display_name:name, region, life_stage:stage });
    setStage(stage);
    setSaved(true); setTimeout(()=>setSaved(false), 1800);
  };

  const setReminders = async (on) => {
    try { await updateProfile({ reminders_enabled: on }); }
    catch (e) { console.error("reminders save failed", e); }
  };

  const exportData = async () => {
    if (exporting || !user) return;
    setExporting(true);
    try {
      const entries = await getRecentEntries(user.id, 9999).catch(()=>[]);
      // Pull a fresh profile so we export the current state, not a stale one
      let freshProfile = profile;
      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) freshProfile = data;
      } catch {}
      const bundle = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        profile: freshProfile,
        tracking_entries: entries,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `febrite-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("export failed", e);
      alert("Sorry, the export failed. Try again or email " + SUPPORT_EMAIL);
    } finally { setExporting(false); }
  };

  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      nav("/", { replace: true });
    } catch (e) {
      console.error("delete failed", e);
      alert("Sorry, account deletion failed. Email " + SUPPORT_EMAIL + " and we'll handle it for you.");
      setDeleting(false);
    }
  };

  const btn = { fontSize:14, fontWeight:600, padding:"10px 16px", borderRadius:11, cursor:"pointer", fontFamily:"Karla, sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:`radial-gradient(120% 70% at 100% -5%, ${accent}14, ${C.cream} 52%)`, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"36px 24px 72px" }}>
        <button onClick={()=>nav(-1)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:C.inkSoft, fontSize:14, cursor:"pointer", marginBottom:18, fontFamily:"Karla, sans-serif" }}>
          <ArrowLeft size={16}/> Back
        </button>
        <h1 style={{ fontFamily:"Fraunces, serif", fontSize:38, fontWeight:400, letterSpacing:"-.01em", margin:"0 0 6px" }}>Settings</h1>
        <p style={{ color:C.inkSoft, fontSize:15.5, marginBottom:28 }}>Everything here is real. Nothing pretends to do something it doesn't.</p>

        <Card>
          {/* ---- Profile basics ---- */}
          <Row icon={User} title="About you" desc="Name and where you live.">
            <div style={{ display:"grid", gap:9 }}>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" style={inputS}/>
              <input value={region} onChange={(e)=>setRegion(e.target.value)} placeholder="Region (e.g. Nairobi, Kenya)" style={inputS}/>
              <select value={stage} onChange={(e)=>setStageLocal(e.target.value)} style={inputS}>
                {Object.entries(STAGES).map(([id,s])=>(<option key={id} value={id}>{s.label} · {s.range}</option>))}
              </select>
              <button onClick={saveBasics} style={{ ...btn, background:accent, color:"#fff", border:"none", alignSelf:"flex-start", display:"flex", gap:8, alignItems:"center" }}>
                {saved ? <><Check size={15}/> Saved</> : "Save changes"}
              </button>
            </div>
          </Row>

          {/* ---- Reminders (in-app nudge banner) ---- */}
          <Row
            icon={Bell}
            title="Daily check-in reminder"
            desc="A gentle banner on your Home if you haven't logged today. Lives inside the app — no push notifications yet."
          >
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <Toggle on={remindersOn} onChange={setReminders} accent={accent}/>
              <span style={{ fontSize:13.5, color:C.inkSoft }}>{remindersOn ? "On" : "Off"}</span>
            </div>
          </Row>

          {/* ---- Reduce motion ---- */}
          <Row
            icon={Eye}
            title="Reduce motion"
            desc="Turn off animated transitions across FeBrite. Helpful if motion makes you uneasy."
          >
            <div style={{ display:"flex", alignItems:"center", gap:11 }}>
              <Toggle on={reduceMotion} onChange={setReduceMotion} accent={accent}/>
              <span style={{ fontSize:13.5, color:C.inkSoft }}>{reduceMotion ? "Animations off" : "Default"}</span>
            </div>
          </Row>

          {/* ---- Your data ---- */}
          <Row icon={Database} title="Your data" desc="Export everything you've logged, or remove it for good.">
            <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
              <button onClick={exportData} disabled={exporting} style={{ ...btn, background:"#fff", color:C.ink, border:`1px solid ${C.line}`, display:"flex", gap:7, alignItems:"center", opacity: exporting?0.6:1 }}>
                <Download size={15}/> {exporting ? "Preparing…" : "Export my data"}
              </button>
              <button onClick={()=>setConfirmDelete(true)} style={{ ...btn, background:"#fff", color:"#A53527", border:`1px solid #DCBABA`, display:"flex", gap:7, alignItems:"center" }}>
                <Trash2 size={15}/> Delete account
              </button>
            </div>
          </Row>

          {/* ---- Help & Support ---- */}
          <Row icon={LifeBuoy} title="Help & Support" desc="FeBrite is small. The founder reads every message personally.">
            <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Hi%20from%20FeBrite`} style={{ ...btn, background:accent, color:"#fff", border:"none", textDecoration:"none", display:"inline-flex", gap:7, alignItems:"center" }}>
                <Mail size={15}/> Email support
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=FeBrite%20bug%20report&body=What%20happened%3A%0A%0AWhat%20I%20was%20trying%20to%20do%3A%0A%0A`} style={{ ...btn, background:"#fff", color:C.ink, border:`1px solid ${C.line}`, textDecoration:"none", display:"inline-flex", gap:7, alignItems:"center" }}>
                <AlertTriangle size={15}/> Report a bug
              </a>
            </div>
            <div style={{ marginTop:8, fontSize:12.5, color:C.inkSoft }}>{SUPPORT_EMAIL}</div>
          </Row>

          {/* ---- Logout ---- */}
          <Row icon={LogOut} title="Sign out" desc="You can come back anytime. Your data stays.">
            <button onClick={async ()=>{ await signOut(); nav("/", { replace:true }); }} style={{ ...btn, background:"#fff", color:C.ink, border:`1px solid ${C.line}`, display:"flex", gap:7, alignItems:"center" }}>
              <LogOut size={15}/> Log out
            </button>
          </Row>
        </Card>
      </div>

      {/* ---- Delete confirmation modal ---- */}
      {confirmDelete && (
        <div onClick={()=>!deleting && setConfirmDelete(false)} style={{ position:"fixed", inset:0, background:"rgba(20,15,12,.55)", display:"grid", placeItems:"center", padding:20, zIndex:50 }}>
          <Card onClick={(e)=>e.stopPropagation()} style={{ maxWidth:440, width:"100%" }}>
            <div style={{ display:"flex", gap:11, marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:"#F8E4E1", color:"#A53527", display:"grid", placeItems:"center", flexShrink:0 }}><AlertTriangle size={18}/></div>
              <div>
                <div style={{ fontFamily:"Fraunces, serif", fontSize:21, color:C.ink, lineHeight:1.2 }}>Delete your account?</div>
                <div style={{ fontSize:13.5, color:C.inkSoft, marginTop:6, lineHeight:1.55 }}>
                  This removes your profile, every check-in, and your account itself. It cannot be undone. If you change your mind later, you'll need to start over.
                </div>
              </div>
            </div>
            <div style={{ fontSize:13, color:C.inkSoft, marginBottom:8 }}>Type <b style={{ color:C.ink }}>DELETE</b> to confirm:</div>
            <input value={deleteText} onChange={(e)=>setDeleteText(e.target.value)} placeholder="DELETE" style={inputS} autoFocus/>
            <div style={{ display:"flex", gap:9, justifyContent:"flex-end", marginTop:16 }}>
              <button onClick={()=>setConfirmDelete(false)} disabled={deleting} style={{ ...btn, background:"transparent", color:C.inkSoft, border:"none" }}>Cancel</button>
              <button onClick={doDelete} disabled={deleteText !== "DELETE" || deleting} style={{ ...btn, background: deleteText==="DELETE" ? "#A53527" : "rgba(165,53,39,.3)", color:"#fff", border:"none", cursor: deleteText==="DELETE" && !deleting ? "pointer" : "not-allowed" }}>
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const inputS = {
  width:"100%", padding:"11px 13px", borderRadius:10, border:`1px solid ${C.line}`,
  background:"#fff", fontSize:14.5, color:C.ink, fontFamily:"Karla, sans-serif", outline:"none",
};
