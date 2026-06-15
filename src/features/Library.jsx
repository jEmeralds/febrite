import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, Send, Sparkles, RefreshCw, ShieldAlert, ChevronDown, User as UserIcon } from "lucide-react";
import { Card, SectionHead, C } from "../components/ui";
import VoicesSection from "../components/VoicesSection";
import { useAuth } from "../lib/auth";
import { useTheme } from "../theme/ThemeProvider";
import { DOMAINS } from "../data/content";
import { askCompanion, suggestedQuestions } from "../lib/companion";
import { getRecentEntries } from "../lib/tracking";

/* The "library" is now an ask-anything companion surface, scoped to *her*.
   Suggested questions are generated from her current state (cycle phase,
   recent sleep/mood/stress, conditions, goals) and the active theme
   (the pillar she clicked, e.g. Mental Health, Nutrition). Free-form
   input always works. */
export default function Library({ stage, accent, go }) {
  const { user, profile } = useAuth();
  const { topic, setTopic } = useTheme();
  const [recent, setRecent] = useState([]);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    getRecentEntries(user.id, 14).then(setRecent).catch(()=>{});
  }, [user?.id]);

  /* Clear conversation when the active topic changes.
     Tapping a chip is a signal that the user has switched contexts —
     leaving the previous answer visible under a new domain accent
     reads as if that answer belongs to the new domain, which is
     misleading. We clear and let suggestions re-scope. */
  useEffect(() => {
    setHistory([]);
    setQuestion("");
  }, [topic]);

  const suggestions = useMemo(() => suggestedQuestions(profile, recent, topic), [profile, recent, topic]);
  const domainLabel = topic && DOMAINS[topic]?.short;

  const ask = async (text) => {
    const q = (text ?? question).trim();
    if (!q || thinking) return;
    setQuestion("");
    const ts = Date.now();
    setHistory((h) => [{ q, a: null, crisis: false, ts, thinking: true }, ...h]);
    setThinking(true);
    try {
      const res = await askCompanion({ question: q, profile, userId: user?.id, domain: topic });
      setHistory((h) => h.map((row) => row.ts === ts
        ? { ...row, a: res.text, crisis: !!res.crisis, thinking: false }
        : row));
    } catch (e) {
      setHistory((h) => h.map((row) => row.ts === ts
        ? { ...row, a: "Sorry, I couldn't respond just now. Please try again in a moment.", thinking: false }
        : row));
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  return (
    <div>
      <SectionHead eyebrow="Answers shaped by you — your cycle, your goals, your last few days" title="Ask FeBrite" accent={accent}/>

      {/* Topic chips — quick way to switch theme without going back to Home.
          Tapping one re-scopes the suggested questions to that area. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        <TopicChip label="All" active={!topic} onClick={() => setTopic(null)} accent={accent}/>
        {Object.entries(DOMAINS).map(([id, d]) => (
          <TopicChip key={id} label={d.short} active={topic === id}
            onClick={() => setTopic(topic === id ? null : id)}
            accent={accent}/>
        ))}
      </div>

      {/* Ask box */}
      <Card style={{ marginBottom:16, padding:14 }}>
        <div style={{ display:"flex", gap:10 }}>
          <input
            ref={inputRef}
            value={question}
            onChange={(e)=>setQuestion(e.target.value)}
            onKeyDown={(e)=>e.key==="Enter" && ask()}
            disabled={thinking}
            placeholder="Ask anything — about your cycle, mood, energy, anything you're noticing…"
            style={{ flex:1, padding:"13px 14px", borderRadius:11, border:`1px solid ${C.line}`, background:"#fff", fontSize:15, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif" }}/>
          <button onClick={()=>ask()} disabled={!question.trim() || thinking} style={{
            padding:"0 18px", borderRadius:11, border:"none", background:question.trim() && !thinking ? accent : "rgba(44,35,32,.15)",
            color:"#fff", fontSize:14, fontWeight:600, cursor:(question.trim() && !thinking) ? "pointer" : "not-allowed",
            fontFamily:"Karla, sans-serif", display:"flex", alignItems:"center", gap:7
          }}>
            <Send size={15}/> Ask
          </button>
        </div>
        <div style={{ fontSize:11.5, color:C.inkSoft, marginTop:9, lineHeight:1.5 }}>
          Your answer uses your profile and recent check-ins. It's a companion — not a diagnosis. For anything clinical, your doctor stays the source of truth.
        </div>
      </Card>

      {/* Suggested questions, shown until the first ask happens */}
      {history.length === 0 && suggestions.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <Sparkles size={16} style={{ color:accent }}/>
            <div style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(17px,4vw,19px)", color:C.ink }}>
              {domainLabel ? `Questions for ${domainLabel.toLowerCase()}` : "Questions for where you are right now"}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {suggestions.map((s) => (
              <button key={s} onClick={()=>ask(s)} disabled={thinking} style={{
                textAlign:"left", padding:"12px 14px", borderRadius:11, cursor:thinking?"default":"pointer",
                border:`1px solid ${C.line}`, background:"#fff", color:C.ink, fontSize:14, lineHeight:1.45,
                fontFamily:"Karla, sans-serif", transition:".15s"
              }}
              onMouseEnter={(e)=>!thinking && (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e)=>!thinking && (e.currentTarget.style.borderColor = C.line)}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Voices from the community — only when no active conversation,
          so an answer view isn't cluttered by other women's stories.
          Filters by the user's stage + currently-selected topic chip. */}
      {history.length === 0 && (
        <VoicesSection stage={profile?.life_stage} topic={topic} accent={accent}/>
      )}

      {/* Back to questions — visible whenever a conversation exists */}
      {history.length > 0 && (
        <button
          onClick={()=>{ setHistory([]); inputRef.current?.focus(); window.scrollTo({ top:0, behavior:"smooth" }); }}
          disabled={thinking}
          style={{
            display:"inline-flex", alignItems:"center", gap:7, marginBottom:14,
            padding:"8px 14px", borderRadius:10, border:`1px solid ${C.line}`,
            background:"#fff", color:C.ink, fontSize:13.5, fontWeight:600, cursor:thinking?"default":"pointer",
            fontFamily:"Karla, sans-serif"
          }}
        >
          <ArrowLeft size={15}/> Back to questions
        </button>
      )}

      {/* Conversation history — most recent on top, fully expanded.
          Older entries collapse to just the question so the screen stays clean. */}
      {history.map((row, i) => row.crisis
        ? <CrisisAnswer key={row.ts} accent={accent} go={go}/>
        : <QACard key={row.ts} row={row} accent={accent} collapsedByDefault={i > 0}/>)}

      {/* After-conversation suggestion rail: keeps a quick way to ask
          another, well-shaped question without losing what's above. */}
      {history.length > 0 && !thinking && suggestions.length > 0 && (
        <Card style={{ marginTop:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <Sparkles size={14} style={{ color:accent }}/>
            <div style={{ fontSize:13, color:C.inkSoft, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>
              Ask another
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {suggestions.slice(0,4).map((s) => (
              <button key={s} onClick={()=>ask(s)} style={{
                textAlign:"left", padding:"10px 13px", borderRadius:10, cursor:"pointer",
                border:`1px solid ${C.line}`, background:"#fff", color:C.ink, fontSize:13.5, lineHeight:1.45,
                fontFamily:"Karla, sans-serif", transition:".15s"
              }}
              onMouseEnter={(e)=>(e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e)=>(e.currentTarget.style.borderColor = C.line)}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TopicChip({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 99, cursor: "pointer",
      border: `1px solid ${active ? accent : C.line}`,
      background: active ? `${accent}1A` : "#fff",
      color: active ? accent : C.inkSoft,
      fontSize: 12.5, fontWeight: active ? 700 : 500,
      fontFamily: "Karla, sans-serif", transition: ".15s",
    }}>
      {label}
    </button>
  );
}

function QACard({ row, accent, collapsedByDefault = false }) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  return (
    <Card style={{ marginBottom:14, padding:18, opacity: collapsed ? 0.78 : 1, transition: "opacity .2s" }}>
      <button
        onClick={()=>setCollapsed((c)=>!c)}
        disabled={row.thinking}
        style={{
          width:"100%", background:"transparent", border:"none", padding:0,
          cursor: row.thinking ? "default" : "pointer", textAlign:"left",
          display:"flex", gap:10, alignItems:"flex-start", marginBottom: collapsed ? 0 : 14,
          fontFamily:"inherit", color:"inherit",
        }}
      >
        <div style={{ width:28, height:28, borderRadius:8, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}><UserIcon size={15}/></div>
        <div style={{ flex:1, fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, lineHeight:1.35 }}>{row.q}</div>
        {!row.thinking && (
          <ChevronDown size={18} style={{
            color:C.inkSoft, flexShrink:0, transition:"transform .2s",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
            marginTop:6,
          }}/>
        )}
      </button>
      {!collapsed && (
        <div style={{ borderTop:`1px solid ${C.line}`, paddingTop:14 }}>
          {row.thinking ? (
            <div style={{ display:"flex", gap:10, alignItems:"center", color:C.inkSoft, fontSize:14 }}>
              <Sparkles size={14} style={{ color:accent, animation:"fbpulse 1.5s ease-in-out infinite" }}/>
              <span>Thinking, with what I know about you…</span>
            </div>
          ) : (
            <div style={{ fontSize:15, color:C.ink, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{row.a}</div>
          )}
        </div>
      )}
      <style>{`@keyframes fbpulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
    </Card>
  );
}

function CrisisAnswer({ accent, go }) {
  return (
    <Card style={{ marginBottom:14, padding:18, background:"#FBEDED", borderColor:"#B23A3A33" }}>
      <div style={{ display:"flex", gap:11, alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"#B23A3A1A", color:"#B23A3A", display:"grid", placeItems:"center", flexShrink:0 }}><ShieldAlert size={18}/></div>
        <div>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:19, color:C.ink, lineHeight:1.25 }}>You deserve real support right now</div>
          <div style={{ fontSize:14, color:C.ink, lineHeight:1.6, marginTop:6 }}>
            What you're carrying matters, and it's bigger than I can be the right help for. Please reach out to a trained person — your local emergency services, a crisis helpline, or one of your support people.
          </div>
        </div>
      </div>
      <button onClick={()=>go && go("resources")} style={{
        padding:"10px 14px", borderRadius:11, border:"none", background:"#B23A3A", color:"#fff",
        fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Karla, sans-serif"
      }}>
        See support lines now →
      </button>
    </Card>
  );
}
