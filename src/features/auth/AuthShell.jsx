import { Lock } from "lucide-react";
import { C } from "../../theme/tokens";
import { Logo } from "../../components/Logo";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr", background:`radial-gradient(120% 70% at 100% -5%, ${C.clay}1A, ${C.cream} 50%)`, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <div style={{ maxWidth:420, width:"100%", margin:"0 auto", padding:"48px 24px", display:"flex", flexDirection:"column" }}>
        <div style={{ marginBottom:36 }}><Logo/></div>
        <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(26px,6vw,34px)", margin:"0 0 8px", letterSpacing:"-.01em" }}>{title}</h1>
        <p style={{ fontSize:15.5, color:C.inkSoft, lineHeight:1.55, margin:"0 0 28px" }}>{subtitle}</p>
        {children}
        <div style={{ marginTop:24, fontSize:14, color:C.inkSoft }}>{footer}</div>
        <div style={{ marginTop:"auto", paddingTop:28, fontSize:12.5, color:C.inkSoft, display:"flex", gap:7, alignItems:"center" }}>
          <Lock size={13}/> Your data is encrypted and never sold.
        </div>
      </div>
    </div>
  );
}

export const field = {
  width:"100%", padding:"12px 14px", borderRadius:12, border:`1px solid ${C.line}`,
  background:"#fff", fontSize:15, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif",
};
export const label = { fontSize:13, fontWeight:600, color:C.ink, marginBottom:6, display:"block" };
export const primaryBtn = {
  width:"100%", padding:"13px", borderRadius:12, border:"none", background:C.clay,
  color:"#fff", fontSize:15.5, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif",
};
