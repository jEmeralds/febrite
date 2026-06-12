import { Cookie, X, Smartphone, Flower2, Palette } from "lucide-react";
import { C } from "../theme/tokens";

export const ThemeChip = ({ accent, label }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, margin:"12px 0 14px", padding:"7px 10px", borderRadius:10, background:`${accent}12`, border:`1px solid ${accent}30`, transition:"background .5s, border-color .5s" }}>
    <Palette size={14} style={{ color:accent, transition:"color .5s" }}/>
    <span style={{ fontSize:11.5, color:C.inkSoft }}>Theme</span>
    <span style={{ fontSize:12, fontWeight:700, color:accent, marginLeft:"auto", transition:"color .5s" }}>{label}</span>
  </div>
);

export const CookieConsent = ({ accent, onChoice }) => (
  <div className="fb-cookie fb-pop">
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:18, boxShadow:"0 18px 44px -20px rgba(44,35,32,.5)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <Cookie size={18} style={{ color:accent }}/>
        <span style={{ fontFamily:"Fraunces, serif", fontSize:17, color:C.ink }}>Your privacy</span>
      </div>
      <p style={{ fontSize:13, color:C.inkSoft, lineHeight:1.55, margin:"0 0 14px" }}>
        We use essential cookies to keep you signed in and remember your preferences. With your consent we also use analytics to improve care. You're always in control.
      </p>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>onChoice("all")} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif" }}>Accept all</button>
        <button onClick={()=>onChoice("necessary")} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${C.line}`, background:"transparent", color:C.ink, fontSize:13.5, cursor:"pointer", fontFamily:"Karla, sans-serif" }}>Necessary only</button>
      </div>
    </div>
  </div>
);

export const InstallPrompt = ({ accent, onInstall, onDismiss, isIOS }) => (
  <div className="fb-install fb-pop">
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:18, boxShadow:"0 18px 44px -20px rgba(44,35,32,.5)", position:"relative" }}>
      <button onClick={onDismiss} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", cursor:"pointer", color:C.inkSoft }}><X size={16}/></button>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <div style={{ width:38, height:38, borderRadius:11, background:`linear-gradient(135deg, ${accent}, ${C.plum})`, display:"grid", placeItems:"center", flexShrink:0 }}><Flower2 size={20} color="#fff"/></div>
        <div><div style={{ fontFamily:"Fraunces, serif", fontSize:17, color:C.ink }}>Install FeBrite</div><div style={{ fontSize:11.5, color:C.inkSoft }}>Free · works offline</div></div>
      </div>
      <p style={{ fontSize:13, color:C.inkSoft, lineHeight:1.55, margin:"0 0 14px" }}>
        {isIOS
          ? "On iPhone: tap the Share button, then “Add to Home Screen” to install FeBrite."
          : "Add FeBrite to your home screen — it opens instantly, works without signal, and feels like a native app. No app store needed."}
      </p>
      {!isIOS && (
        <button onClick={onInstall} style={{ width:"100%", padding:"11px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif", display:"flex", justifyContent:"center", alignItems:"center", gap:8 }}><Smartphone size={16}/> Add to home screen</button>
      )}
    </div>
  </div>
);
