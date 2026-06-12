import { useEffect, Suspense, lazy, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Home as HomeIcon, BookOpen, MessageCircle, Activity, Stethoscope, LifeBuoy,
  Store, Users, Settings as SettingsIcon, Download, Check, UserCircle,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../lib/auth";
import { STAGES, DOMAINS, CONTENT } from "../data/content";
import { ASSESSMENTS } from "../data/assessments";
import { C } from "../theme/tokens";
import { getConsent, setConsent } from "../lib/consent";
import { useInstallPrompt } from "../pwa/useInstallPrompt";
import { ThemeChip, CookieConsent, InstallPrompt } from "../components/Overlays";
import { Logo } from "../components/Logo";
import { DailyNudge, CycleChip } from "../components/DailyNudge";

import Home from "../features/Home";
import Companion from "../features/Companion";
import CareTeam from "../features/CareTeam";
import Resources from "../features/Resources";
import Assessment from "../features/assessment/Assessment";
const Library = lazy(() => import("../features/Library"));
const Article = lazy(() => import("../features/Article"));
const Tracking = lazy(() => import("../features/Tracking"));

const NAV = [
  { id:"home", label:"Home", icon:HomeIcon },
  { id:"library", label:"Library", icon:BookOpen },
  { id:"companion", label:"Companion", icon:MessageCircle },
  { id:"track", label:"Track", icon:Activity },
  { id:"team", label:"Care Team", icon:Stethoscope },
  { id:"resources", label:"Support", icon:LifeBuoy },
];
const SOON = [{ label:"1:1 Consults", icon:Store }, { label:"Community", icon:Users }];

const NavBtn = ({ icon:Icon, label, active, accent, onClick }) => (
  <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:11, border:"none", cursor:"pointer", textAlign:"left", fontSize:14.5, width:"100%", fontFamily:"Karla, sans-serif", transition:".2s", background:active?`${accent}16`:"transparent", color:active?accent:C.ink, fontWeight:active?700:400 }}><Icon size={18}/> {label}</button>
);

export default function Shell() {
  const { profile } = useAuth();
  const { stage, setStage, setTopic, accent } = useTheme();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven view state — back/forward in the browser navigates between tabs.
  const view = searchParams.get("view") || "home";
  const articleId = searchParams.get("article");
  const libDomain = searchParams.get("domain");
  const assessmentId = searchParams.get("assessment");

  const article = useMemo(() => articleId ? CONTENT.find(c => c.id === articleId) : null, [articleId]);
  const assessment = useMemo(() => assessmentId ? Object.values(ASSESSMENTS).find(a => a.id === assessmentId) : null, [assessmentId]);

  const [cookie,setCookie] = useState(getConsent());
  const [installOpen,setInstallOpen] = useState(true);
  const { canInstall, installed, install, isIOS } = useInstallPrompt();
  const [manualInstalled,setManualInstalled] = useState(false);
  const isInstalled = installed || manualInstalled;

  // Sync the theme's stage with the saved profile (source of truth = profile).
  useEffect(() => { if (profile?.life_stage && profile.life_stage !== stage) setStage(profile.life_stage); }, [profile?.life_stage]); // eslint-disable-line
  // Keep theme topic in sync with the URL (so deep links land with the right accent).
  useEffect(() => {
    if (view === "article" && article) setTopic(article.dom);
    else if (view === "library") setTopic(libDomain || null);
    else if (view === "assessment" && assessment) setTopic(assessment.domain);
    else setTopic(null);
  }, [view, articleId, libDomain, assessmentId]); // eslint-disable-line

  const activeStage = stage || profile?.life_stage || "young";
  const themeLabel = view==="article" && article ? DOMAINS[article.dom].short
    : view==="library" && libDomain ? DOMAINS[libDomain].short
    : STAGES[activeStage].label;

  // `go` rewrites the URL search params — pushes a history entry so back works.
  const go = (v, payload) => {
    const p = new URLSearchParams();
    if (v === "article") { p.set("view", "article"); if (payload?.id) p.set("article", payload.id); }
    else if (v === "assessment") { p.set("view", "assessment"); if (payload?.id) p.set("assessment", payload.id); }
    else if (v === "library") { p.set("view", "library"); if (payload) p.set("domain", payload); }
    else if (v !== "home") p.set("view", v);
    setSearchParams(p);
  };
  const openArticle = (c) => go("article", c);
  const chooseCookie = (val) => { setConsent(val); setCookie(val); };
  const doInstall = async () => { const ok = await install(); if (ok || !canInstall) setManualInstalled(true); setInstallOpen(false); };

  const backToLibrary = () => {
    const p = new URLSearchParams();
    p.set("view", "library");
    if (libDomain) p.set("domain", libDomain);
    setSearchParams(p);
  };

  const Body = {
    home: <Home stage={activeStage} accent={accent} go={go} openArticle={openArticle}/>,
    library: <Library stage={activeStage} accent={accent} openArticle={openArticle} initialDomain={libDomain} onDomainChange={(d)=>{ const p = new URLSearchParams(); p.set("view","library"); if (d) p.set("domain",d); setSearchParams(p); }}/>,
    article: article && <Article c={article} stage={activeStage} back={backToLibrary} go={go}/>,
    companion: <Companion stage={activeStage} accent={accent} go={go} openArticle={openArticle}/>,
    track: <Tracking stage={activeStage} accent={accent}/>,
    team: <CareTeam accent={accent}/>,
    resources: <Resources accent={accent}/>,
    assessment: assessment && <Assessment assessment={assessment} stage={activeStage} accent={accent} go={go} openArticle={openArticle} back={()=>go("home")}/>,
  }[view];

  return (
    <div style={{ minHeight:"100vh", color:C.ink, fontFamily:"Karla, sans-serif",
      background:`radial-gradient(130% 90% at 100% -10%, ${accent}1F, ${C.cream} 52%)`, transition:"background .7s ease" }}>
      <div className="fb-shell">
        <aside className="fb-side">
          <Logo/>
          <div style={{ marginTop:10 }}><CycleChip accent={accent}/></div>
          <ThemeChip accent={accent} label={themeLabel}/>
          {NAV.map((n)=>(<NavBtn key={n.id} {...n} active={view===n.id||(n.id==="library"&&view==="article")} accent={accent} onClick={()=>go(n.id)}/>))}
          <NavBtn icon={UserCircle} label="My Profile" active={false} accent={accent} onClick={()=>nav("/profile")}/>
          <NavBtn icon={SettingsIcon} label="Settings" active={false} accent={accent} onClick={()=>nav("/settings")}/>
          <button onClick={()=>{ if(isInstalled) return; doInstall(); }} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, border:`1px solid ${isInstalled?"rgba(118,135,106,.4)":C.line}`, cursor:isInstalled?"default":"pointer", fontSize:13.5, marginTop:8, background:isInstalled?"rgba(118,135,106,.12)":"transparent", color:isInstalled?C.sage:C.ink, fontFamily:"Karla, sans-serif", fontWeight:600 }}>
            {isInstalled ? <><Check size={16}/> App installed</> : <><Download size={16}/> Install app</>}
          </button>
          <div style={{ marginTop:16, marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:C.inkSoft }}>Coming soon</div>
          {SOON.map((n)=>(<div key={n.label} style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:11, color:C.inkSoft, opacity:.65, fontSize:14 }}><n.icon size={18}/> {n.label}<span style={{ marginLeft:"auto", fontSize:9, padding:"2px 6px", borderRadius:6, background:"rgba(44,35,32,.07)", letterSpacing:".05em" }}>SOON</span></div>))}
          <div style={{ marginTop:"auto" }}>
            <button onClick={()=>nav("/profile")} style={{ display:"flex", alignItems:"center", gap:9, width:"100%", border:`1px solid ${C.line}`, background:"transparent", borderRadius:12, padding:"10px", cursor:"pointer", fontFamily:"Karla, sans-serif" }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0, fontWeight:700, fontSize:13 }}>{(profile?.display_name||"?").slice(0,1).toUpperCase()}</div>
              <div style={{ textAlign:"left", overflow:"hidden" }}><div style={{ fontSize:13.5, fontWeight:600, color:C.ink, whiteSpace:"nowrap", textOverflow:"ellipsis", overflow:"hidden" }}>{profile?.display_name||"Your account"}</div><div style={{ fontSize:11.5, color:C.inkSoft }}>{STAGES[activeStage].label}</div></div>
            </button>
          </div>
        </aside>
        <main className="fb-main"><Suspense fallback={<div style={{ color:C.inkSoft }}>Loading…</div>}><div className="fb-rise" key={view+(article?.id||"")} style={{ height:"100%" }}>{view !== "track" && <DailyNudge accent={accent} onCheckIn={()=>go("track")}/>}{Body}</div></Suspense></main>
        <nav className="fb-bottom">
          {NAV.map((n)=>(<button key={n.id} onClick={()=>go(n.id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, color:(view===n.id||(n.id==="library"&&view==="article"))?accent:C.inkSoft, padding:"4px 9px", flexShrink:0 }}><n.icon size={19}/><span style={{ fontSize:10, fontWeight:view===n.id?700:400, whiteSpace:"nowrap" }}>{n.label}</span></button>))}
          <button onClick={()=>nav("/settings")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, color:C.inkSoft, padding:"4px 9px", flexShrink:0 }}><SettingsIcon size={19}/><span style={{ fontSize:10, whiteSpace:"nowrap" }}>Settings</span></button>
        </nav>
      </div>

      {cookie===null && <CookieConsent accent={accent} onChoice={chooseCookie}/>}
      {cookie!==null && !isInstalled && installOpen && (canInstall || isIOS) && (
        <InstallPrompt accent={accent} isIOS={isIOS} onInstall={doInstall} onDismiss={()=>setInstallOpen(false)}/>
      )}
    </div>
  );
}
