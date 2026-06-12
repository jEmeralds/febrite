import { Link, useNavigate } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { C } from "../theme/tokens";
import { useAuth } from "../lib/auth";

/* Live, clickable FeBrite logo. Click target depends on auth state:
   logged-in users go to /app (their wellness home), everyone else
   goes to / (the marketing landing). Reused across every surface. */
export function Logo({ size = "md", interactive = true, asLink = false }) {
  const { user } = useAuth();
  const target = user ? "/app" : "/";
  const dims = size === "lg" ? { box: 40, icon: 22, font: 26 }
             : size === "sm" ? { box: 28, icon: 15, font: 17 }
             :                 { box: 34, icon: 19, font: 22 };

  const inner = (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:9,
      cursor: interactive ? "pointer" : "default",
      transition:"opacity .15s",
    }}
    onMouseEnter={(e)=>interactive && (e.currentTarget.style.opacity = "0.85")}
    onMouseLeave={(e)=>interactive && (e.currentTarget.style.opacity = "1")}
    >
      <div style={{
        width:dims.box, height:dims.box, borderRadius: Math.round(dims.box/3.4),
        background:`linear-gradient(135deg, ${C.clay}, ${C.plum})`,
        display:"grid", placeItems:"center", flexShrink:0
      }}>
        <Flower2 size={dims.icon} color="#fff"/>
      </div>
      <div style={{
        fontFamily:"Fraunces, serif", fontSize:dims.font, color:C.ink,
        letterSpacing:"-.01em", lineHeight:1
      }}>
        Fe<span style={{ fontStyle:"italic" }}>Brite</span>
      </div>
    </div>
  );

  if (!interactive) return inner;
  if (asLink) return <Link to={target} style={{ textDecoration:"none" }}>{inner}</Link>;

  return <LogoButton target={target}>{inner}</LogoButton>;
}

function LogoButton({ target, children }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(target)} style={{
      background:"transparent", border:"none", padding:0, cursor:"pointer",
      font:"inherit", color:"inherit"
    }} aria-label="FeBrite home">
      {children}
    </button>
  );
}

/* Top-of-page header for any non-Shell page (auth, legal, profile, etc.)
   Keeps the logo visible everywhere as a way back home. */
export function PageHeader({ right, background }) {
  return (
    <header style={{
      position:"sticky", top:0, zIndex:30,
      background: background ?? "rgba(248,243,236,.85)",
      backdropFilter:"saturate(140%) blur(10px)",
      borderBottom:`1px solid ${C.line}`,
    }}>
      <div style={{
        maxWidth:1080, margin:"0 auto",
        padding:"14px 22px",
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <Logo/>
        {right}
      </div>
    </header>
  );
}
