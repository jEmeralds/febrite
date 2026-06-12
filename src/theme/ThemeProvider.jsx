import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { C, STAGE_ACCENT, DOMAIN_COLOR } from "./tokens";

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const [stage, setStage] = useState(null); // 'teen'|'young'|'mid'|'meno'|'elder'
  const [topic, setTopic] = useState(null); // domain slug | null

  // Topic wins when present, else the stage accent, else a warm default.
  const accent = useMemo(
    () => DOMAIN_COLOR[topic] || STAGE_ACCENT[stage] || C.clay,
    [stage, topic]
  );

  // Push to CSS variables once per change — children read var(--accent), no re-render churn.
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", accent);
    r.setProperty("--accent-soft", accent + "1A");
    Object.entries(C).forEach(([k, v]) => r.setProperty(`--${k}`, v));
  }, [accent]);

  return (
    <Ctx.Provider value={{ stage, setStage, topic, setTopic, accent }}>
      {children}
    </Ctx.Provider>
  );
}
