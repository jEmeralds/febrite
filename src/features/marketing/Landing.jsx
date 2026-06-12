import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldCheck, MessageCircle, Activity, BookOpen, Stethoscope,
  Lock, Heart, ArrowRight, Check, Sparkles, Flower2, Moon, Sun,
} from "lucide-react";
import { C, STAGE_ACCENT } from "../../theme/tokens";
import { STAGES } from "../../data/content";
import { Logo } from "../../components/Logo";

/* ─────────────────────────────────────────────────────────────────
   ANIMATION HELPERS
   Subtle, restrained motion. Honors reduced-motion preferences.
   ───────────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* Wraps a section so it animates in once when it enters the viewport. */
function Reveal({ children, delay = 0, style }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
      variants={fadeUp}
      style={style}
    >
      {children}
    </motion.div>
  );
}

const Section = ({ children, style, id }) => (
  <section id={id} style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", ...style }}>
    {children}
  </section>
);

/* ─────────────────────────────────────────────────────────────────
   PHONE MOCKUP — cycles through three actual-feeling app screens
   so visitors see what they'd get before signing up.
   ───────────────────────────────────────────────────────────────── */
const DEMO = {
  name: "Amani",
  stage: "Young Women",
  phase: "Luteal",
};

const MockHome = () => (
  <div style={mockScreen}>
    <div style={{ fontSize: 11, color: "#A95A4C", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700 }}>
      Today · luteal phase
    </div>
    <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: C.ink, margin: "6px 0 14px", lineHeight: 1.15 }}>
      Hi {DEMO.name} — a quieter day might serve you well.
    </div>
    <div style={{ background: "#FBF1EC", borderRadius: 14, padding: 14, marginBottom: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#A95A4C", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        <Sparkles size={13}/> What I noticed
      </div>
      <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
        Your sleep has been short three nights running, and your mood usually dips a day later. Tonight is one to protect.
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
      <div style={miniCard}><Moon size={15} color="#A95A4C"/><span style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>Wind down</span></div>
      <div style={miniCard}><Activity size={15} color="#A95A4C"/><span style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>Gentle yoga</span></div>
    </div>
  </div>
);

const MockCompanion = () => (
  <div style={mockScreen}>
    <div style={{ fontSize: 11, color: "#7E5FA4", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700 }}>
      Companion
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
      <div style={{ background: "#7E5FA4", color: "#fff", padding: "9px 13px", borderRadius: 13, borderBottomRightRadius: 5, fontSize: 12.5, maxWidth: "78%" }}>
        Why does my mood drop before my period?
      </div>
    </div>
    <div style={{ background: C.card, padding: 12, borderRadius: 13, fontSize: 12.5, color: C.ink, lineHeight: 1.55 }}>
      Hi {DEMO.name} — what you're feeling is real. In your luteal phase, estrogen and progesterone drop, which can shift serotonin and energy. For you it usually starts about five days before your period.
    </div>
  </div>
);

const MockTrack = () => (
  <div style={mockScreen}>
    <div style={{ fontSize: 11, color: "#3F7B5A", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 700 }}>
      Daily check-in
    </div>
    <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, margin: "6px 0 14px" }}>
      How are you, really?
    </div>
    {[
      { label: "Mood", value: 4, color: "#3F7B5A" },
      { label: "Energy", value: 3, color: "#A95A4C" },
      { label: "Sleep", value: 2, color: "#7E5FA4" },
    ].map((row) => (
      <div key={row.label} style={{ marginBottom: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.inkSoft, marginBottom: 5 }}>
          <span>{row.label}</span>
          <span style={{ color: row.color, fontWeight: 700 }}>{row.value}/5</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {[1,2,3,4,5].map(n=>(
            <div key={n} style={{ flex:1, height:7, borderRadius:99, background: n <= row.value ? row.color : "rgba(44,35,32,.1)" }}/>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const SCREENS = [
  { Component: MockHome,      label: "A daily read of you",     glow: "#A95A4C" },
  { Component: MockCompanion, label: "Answers, shaped by you", glow: "#7E5FA4" },
  { Component: MockTrack,     label: "A tracker that listens",  glow: "#3F7B5A" },
];

const mockScreen = {
  padding: "20px 18px", background: C.cream, borderRadius: 22,
  height: "100%", display: "flex", flexDirection: "column",
};
const miniCard = {
  background: "#fff", borderRadius: 11, padding: "10px",
  display: "flex", flexDirection: "column", alignItems: "flex-start",
};

function PhoneMockup() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SCREENS.length), 4500);
    return () => clearInterval(t);
  }, [reduceMotion]);

  const { Component, glow } = SCREENS[index];

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Soft glow that matches the active screen's accent */}
      <motion.div
        animate={{ background: `radial-gradient(50% 50% at 50% 50%, ${glow}33, transparent 70%)` }}
        transition={{ duration: 1.2 }}
        style={{
          position: "absolute", inset: -40, filter: "blur(28px)", borderRadius: "50%",
          zIndex: 0,
        }}
      />
      {/* Phone frame */}
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "relative", zIndex: 1,
          width: 280, height: 560,
          borderRadius: 38, padding: 11,
          background: "linear-gradient(170deg, #3A2F2C, #2A2220)",
          boxShadow: "0 30px 60px -20px rgba(60,30,20,.35), 0 8px 24px -10px rgba(0,0,0,.2)",
        }}
      >
        {/* Inner screen with crossfade */}
        <div style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", position: "relative", background: C.cream }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.55 }}
              style={{ position: "absolute", inset: 0 }}
            >
              <Component/>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      {/* Caption dots */}
      <div style={{ position: "absolute", bottom: -32, display: "flex", gap: 7, zIndex: 2 }}>
        {SCREENS.map((s, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={s.label} style={{
            width: i === index ? 22 : 7, height: 7, borderRadius: 99, border: "none", padding: 0,
            background: i === index ? glow : "rgba(44,35,32,.2)",
            cursor: "pointer", transition: "all .3s",
          }}/>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO — animated headline + the phone mockup
   ───────────────────────────────────────────────────────────────── */
function Hero() {
  const headline = ["The", "wellness", "home", "that"];
  const headlineItalic = "grows with you.";
  return (
    <Section style={{ paddingTop: 36, paddingBottom: 72 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 56, alignItems: "center" }} className="hero-grid">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.clay, fontWeight: 700, marginBottom: 18 }}
          >
            Holistic care for women, every season
          </motion.div>
          <motion.h1
            variants={stagger} initial="hidden" animate="visible"
            style={{ fontFamily: "Fraunces, serif", fontWeight: 400, fontSize: "clamp(38px,6.5vw,72px)", lineHeight: 1.02, letterSpacing: "-.02em", margin: "0 0 22px", color: C.ink }}
          >
            {headline.map((w, i) => (
              <motion.span key={i} variants={fadeUp} style={{ display: "inline-block", marginRight: "0.25em" }}>{w}</motion.span>
            ))}
            <motion.span variants={fadeUp} style={{ display: "inline-block", fontStyle: "italic", color: C.clay }}>
              {headlineItalic}
            </motion.span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
            style={{ fontSize: 19, color: C.inkSoft, lineHeight: 1.55, maxWidth: 520, margin: "0 0 32px" }}
          >
            A companion that reads your data and writes back. From your first period to menopause and beyond — one private space that adapts to where you are.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Link to="/signup" style={ctaPrimary}>Start free <ArrowRight size={18}/></Link>
            <a href="#preview" style={ctaSecondary}>See it in action</a>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1 }}
            style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 26, color: C.inkSoft, fontSize: 13.5 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={15}/> Private & encrypted</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={15}/> Built around your data</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Heart size={15}/> Free to start</span>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ paddingBottom: 40 }}
        >
          <PhoneMockup/>
        </motion.div>
      </div>
      <style>{`
        @media (min-width: 900px) {
          .hero-grid { grid-template-columns: 1.05fr 1fr !important; }
        }
      `}</style>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE SECTION — restrained motion, hover lift
   ───────────────────────────────────────────────────────────────── */
function Features() {
  const items = [
    { icon: Sparkles, title: "A companion who reads you", body: "Ask anything. The answer uses your profile and your recent check-ins, not a generic library." },
    { icon: Activity, title: "Tracking that becomes insight", body: "Mood, sleep, energy, cycle. Patterns become observations you can act on — not just charts." },
    { icon: BookOpen, title: "Answers in the moment",      body: "No tabs of articles to wade through. Real, written-for-you answers that respect your time." },
    { icon: Stethoscope, title: "Care team within reach",  body: "When you're ready for a real person — clinicians, therapists, coaches — vetted and yours." },
  ];
  return (
    <Section style={{ paddingTop: 54, paddingBottom: 54 }} id="how">
      <Reveal>
        <h2 style={h2}>The whole app shapes itself around you</h2>
        <p style={p}>Where you are in life — and where you are this week — change what you see.</p>
      </Reveal>
      <motion.div
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))", marginTop: 28 }}
      >
        {items.map((it) => (
          <motion.div key={it.title} variants={fadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.25 }} style={featureCard}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.clay}1A`, color: C.clay, display: "grid", placeItems: "center", marginBottom: 12 }}>
              <it.icon size={19}/>
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, marginBottom: 6 }}>{it.title}</div>
            <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6 }}>{it.body}</div>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LIFE-STAGE STRIP
   ───────────────────────────────────────────────────────────────── */
function Stages() {
  return (
    <Section style={{ paddingTop: 36, paddingBottom: 54 }}>
      <Reveal>
        <h2 style={h2}>Care that fits your stage</h2>
        <p style={p}>The whole app re-shapes — content, tools, tone — around where you are in life.</p>
      </Reveal>
      <motion.div
        variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(170px,100%),1fr))", marginTop: 28 }}
      >
        {Object.entries(STAGES).map(([id, s]) => {
          const Icon = s.icon; const a = STAGE_ACCENT[id];
          return (
            <motion.div key={id} variants={fadeUp} whileHover={{ y: -3 }} transition={{ duration: 0.25 }} style={stageCard}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: `${a}1A`, color: a, display: "grid", placeItems: "center", marginBottom: 10 }}><Icon size={18}/></div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, color: C.ink }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{s.range}</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 8, lineHeight: 1.5 }}>{s.tag}</div>
            </motion.div>
          );
        })}
      </motion.div>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   "SEE IT IN ACTION" — secondary look at the mockup with caption
   ───────────────────────────────────────────────────────────────── */
function Preview() {
  return (
    <Section id="preview" style={{ paddingTop: 64, paddingBottom: 80, textAlign: "center" }}>
      <Reveal>
        <span style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.clay, fontWeight: 700 }}>See it in action</span>
        <h2 style={{ ...h2, marginTop: 12 }}>Three surfaces, one companion</h2>
        <p style={{ ...p, maxWidth: 540, margin: "8px auto 0" }}>
          The Today screen reads your data. The Companion answers in your voice. The Tracker listens. Everything connects.
        </p>
      </Reveal>
      <Reveal delay={0.15} style={{ marginTop: 56 }}>
        <PhoneMockup/>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FINAL CTA
   ───────────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <Section style={{ paddingTop: 36, paddingBottom: 80 }}>
      <Reveal>
        <div style={{
          textAlign: "center", padding: "48px 28px", borderRadius: 24,
          background: `linear-gradient(135deg, ${C.clay}E0, ${C.plum}E0)`,
          color: "#fff",
        }}>
          <h2 style={{ fontFamily: "Fraunces, serif", fontWeight: 400, fontSize: "clamp(28px,5vw,42px)", margin: "0 0 12px", lineHeight: 1.1 }}>
            Your wellness, finally written for <span style={{ fontStyle: "italic" }}>you</span>.
          </h2>
          <p style={{ fontSize: 17, opacity: 0.92, lineHeight: 1.55, maxWidth: 520, margin: "0 auto 26px" }}>
            Start free. Cancel anytime. No noise, no diagnoses, just a companion that gets you.
          </p>
          <Link to="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", color: C.clay, textDecoration: "none",
            fontSize: 16, fontWeight: 700, padding: "14px 28px", borderRadius: 13,
          }}>
            Get started <ArrowRight size={18}/>
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div style={{
      background: `radial-gradient(120% 70% at 100% -5%, ${C.clay}1A, ${C.cream} 50%)`,
      color: C.ink, fontFamily: "Karla, sans-serif", minHeight: "100vh", overflowX: "hidden",
    }}>
      {/* Top nav */}
      <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px" }}>
        <Logo/>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/login" style={{ color: C.ink, textDecoration: "none", fontSize: 14.5, fontWeight: 600 }}>Log in</Link>
          <Link to="/signup" style={{ background: C.clay, color: "#fff", textDecoration: "none", fontSize: 14.5, fontWeight: 600, padding: "9px 16px", borderRadius: 11 }}>Get started</Link>
        </div>
      </Section>

      <Hero/>
      <Features/>
      <Stages/>
      <Preview/>
      <FinalCTA/>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "28px 24px", color: C.inkSoft, fontSize: 13 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>© {new Date().getFullYear()} FeBrite</div>
          <div style={{ display: "flex", gap: 18 }}>
            <Link to="/legal/privacy" style={footLink}>Privacy</Link>
            <Link to="/legal/terms" style={footLink}>Terms</Link>
            <Link to="/join-as-pro" style={footLink}>For practitioners</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Shared styles ─── */
const h2 = { fontFamily: "Fraunces, serif", fontWeight: 400, fontSize: "clamp(26px,4.5vw,36px)", textAlign: "center", margin: "0 0 8px", letterSpacing: "-.01em", color: C.ink };
const p  = { fontSize: 15.5, color: C.inkSoft, lineHeight: 1.6, textAlign: "center", maxWidth: 580, margin: "0 auto" };
const ctaPrimary = { display: "inline-flex", alignItems: "center", gap: 8, background: C.clay, color: "#fff", textDecoration: "none", fontSize: 16, fontWeight: 600, padding: "14px 26px", borderRadius: 13 };
const ctaSecondary = { display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: C.ink, textDecoration: "none", fontSize: 16, fontWeight: 600, padding: "14px 26px", borderRadius: 13, border: `1px solid ${C.line}` };
const featureCard = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, cursor: "default" };
const stageCard  = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, cursor: "default" };
const footLink = { color: C.inkSoft, textDecoration: "none" };
