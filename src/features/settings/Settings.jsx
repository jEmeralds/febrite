import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, ShieldCheck, Bell, Eye, Database, LogOut, Trash2, Check } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { STAGES } from "../../data/content";
import { C } from "../../theme/tokens";
import { Card } from "../../components/ui";
import { PageHeader } from "../../components/Logo";

const Row = ({ icon:Icon, title, desc, children }) => (
  <div style={{ display:"flex", gap:13, alignItems:"flex-start", padding:"16px 0", borderBottom:`1px solid ${C.line}` }}>
    <div style={{ width:36, height:36, borderRadius:10, background:"rgba(44,35,32,.06)", color:C.inkSoft, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={18}/></div>
    <div style={{ flex:1 }}>
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
  const { profile, updateProfile, signOut, deleteAccount, isDemo } = useAuth();
  const { accent, setStage } = useTheme();
  const nav = useNavigate();
  const [name,setName] = useState(profile?.display_name || "");
  const [region,setRegion] = useState(profile?.region || "");
  const [stage,setStageLocal] = useState(profile?.life_stage || "young");
  const [saved,setSaved] = useState(false);
  const [prefs,setPrefs] = useState({ analytics:false, reminders:true, reducedMotion:false, largeText:false });
  const [confirmDelete,setConfirmDelete] = useState(false);

  const save = async () => {
    await updateProfile({ display_name:name, region, life_stage:stage });
    setStage(stage);
    setSaved(true); setTimeout(()=>setSaved(false), 1800);
  };

  const btn = { fontSize:14, fontWeight:600, padding:"10px 16px", borderRadius:11, cursor:"pointer", fontFamily:"Karla, sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:`radial-gradient(120% 70% at 100% -5%, ${accent}14, ${C.cream} 52%)`, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"36px 24px 72px" }}>
        <button onClick={()=>nav(-1)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:18, fontFamily:"Karla, sans-serif" }}><ArrowLeft size={16}/> Back to app</button>
        <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(26px,6vw,34px)", margin:"0 0 24px" }}>Settings</h1>

        <Card>
          <Row icon={User} title="Profile">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" style={inp}/>
              <input value={region} onChange={(e)=>setRegion(e.target.value)} placeholder="Region (e.g. Qatar)" style={inp}/>
              <select value={stage} onChange={(e)=>setStageLocal(e.target.value)} style={inp}>
                {Object.entries(STAGES).map(([id,s])=>(<option key={id} value={id}>{s.label} · {s.range}</option>))}
              </select>
              <button onClick={save} style={{ ...btn, background:accent, color:"#fff", border:"none", alignSelf:"flex-start", display:"flex", alignItems:"center", gap:7 }}>
                {saved ? <><Check size={15}/> Saved</> : "Save changes"}
              </button>
            </div>
          </Row>

          <Row icon={ShieldCheck} title="Privacy & consent" desc="You control what FeBrite may use.">
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <ToggleRow label="Allow anonymous analytics to improve care" on={prefs.analytics} onChange={(v)=>setPrefs(p=>({...p,analytics:v}))} accent={accent}/>
            </div>
          </Row>

          <Row icon={Bell} title="Notifications">
            <ToggleRow label="Gentle daily check-in reminders" on={prefs.reminders} onChange={(v)=>setPrefs(p=>({...p,reminders:v}))} accent={accent}/>
          </Row>

          <Row icon={Eye} title="Accessibility">
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <ToggleRow label="Reduce motion" on={prefs.reducedMotion} onChange={(v)=>setPrefs(p=>({...p,reducedMotion:v}))} accent={accent}/>
              <ToggleRow label="Larger text" on={prefs.largeText} onChange={(v)=>setPrefs(p=>({...p,largeText:v}))} accent={accent}/>
            </div>
          </Row>

          <Row icon={Database} title="Your data" desc="Export everything, or remove it for good.">
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={()=>alert("In production this exports your data as a downloadable file.")} style={{ ...btn, background:"transparent", color:C.ink, border:`1px solid ${C.line}` }}>Export my data</button>
              {!confirmDelete ? (
                <button onClick={()=>setConfirmDelete(true)} style={{ ...btn, background:"transparent", color:"#B23A3A", border:"1px solid #B23A3A55", display:"flex", alignItems:"center", gap:7 }}><Trash2 size={15}/> Delete account</button>
              ) : (
                <button onClick={async()=>{ await deleteAccount(); nav("/", { replace: true }); }} style={{ ...btn, background:"#B23A3A", color:"#fff", border:"none", display:"flex", alignItems:"center", gap:7 }}><Trash2 size={15}/> Tap again to confirm</button>
              )}
            </div>
          </Row>

          <div style={{ paddingTop:16 }}>
            <button onClick={async()=>{ await signOut(); nav("/", { replace: true }); }} style={{ ...btn, background:"transparent", color:C.inkSoft, border:`1px solid ${C.line}`, display:"flex", alignItems:"center", gap:8 }}><LogOut size={15}/> Log out</button>
          </div>
        </Card>

        {isDemo && <div style={{ fontSize:12.5, color:C.inkSoft, marginTop:14 }}>Demo mode: preferences here are illustrative. They persist to Supabase once connected.</div>}
      </div>
    </div>
  );
}

const inp = { padding:"11px 13px", borderRadius:11, border:`1px solid ${C.line}`, background:"#fff", fontSize:14.5, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif", width:"100%" };
const ToggleRow = ({ label, on, onChange, accent }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
    <span style={{ fontSize:14, color:C.ink }}>{label}</span>
    <Toggle on={on} onChange={onChange} accent={accent}/>
  </div>
);
