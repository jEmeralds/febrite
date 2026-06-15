import { useEffect, useMemo, useState } from "react";
import { Quote, Plus, Heart, Send, Check, X, AlertCircle } from "lucide-react";
import { Card, C } from "./ui";
import { useAuth } from "../lib/auth";
import { fetchVoices, submitVoice } from "../lib/voices";
import { STAGES, DOMAINS } from "../data/content";

const STAGE_LABEL = {
  teen: "your teens", young: "your 20s and 30s",
  mid: "your 30s and 40s", meno: "perimenopause",
  elder: "elderhood",
};

export default function VoicesSection({ stage, topic, accent }) {
  const { user, profile } = useAuth();
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); // submission modal

  useEffect(() => {
    if (!stage) { setVoices([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchVoices({ stage, topic, limit: 6 }).then((vs) => {
      if (alive) { setVoices(vs); setLoading(false); }
    });
    return () => { alive = false; };
  }, [stage, topic]);

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
            From women in {STAGE_LABEL[stage] || "your stage"}
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(18px,3.5vw,22px)", color: C.ink, letterSpacing: "-.01em" }}>
            You're not alone in this.
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          fontSize: 13, fontWeight: 700, padding: "9px 14px",
          background: "#fff", color: accent, border: `1px solid ${accent}40`,
          borderRadius: 11, cursor: "pointer", fontFamily: "Karla, sans-serif",
        }}>
          <Plus size={14}/> Share your story
        </button>
      </div>

      {loading ? (
        <VoicesSkeleton/>
      ) : voices.length === 0 ? (
        <Card style={{ padding: "18px 18px", background: "rgba(44,35,32,.03)", borderStyle: "dashed" }}>
          <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.55 }}>
            No voices here yet for your stage. Be the first — share a story and other women in {STAGE_LABEL[stage]} will read it.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          {voices.slice(0, 4).map((v) => (
            <VoiceCard key={v.id} voice={v} accent={accent}/>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 10, fontStyle: "italic" }}>
        Voices are submitted by women like you and reviewed before they appear here.
      </div>

      {open && (
        <SubmissionModal
          onClose={() => setOpen(false)}
          stage={stage} defaultTopic={topic}
          user={user} profile={profile}
          accent={accent}
        />
      )}
    </div>
  );
}

/* ---------------- VoiceCard ---------------- */
function VoiceCard({ voice, accent }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = voice.body.length > 220;
  const display = expanded || !isLong ? voice.body : voice.body.slice(0, 220).trim() + "…";
  return (
    <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 11, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Quote size={16} style={{ color: accent, flexShrink: 0, marginTop: 2, opacity: 0.7 }}/>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, color: C.ink, lineHeight: 1.3, fontWeight: 500 }}>
          {voice.title}
        </div>
      </div>
      <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.6, opacity: 0.88 }}>
        {display}
      </div>
      {isLong && (
        <button onClick={() => setExpanded((e) => !e)} style={{
          alignSelf: "flex-start", background: "transparent", border: "none",
          color: accent, fontSize: 12.5, fontWeight: 600, padding: 0, cursor: "pointer",
          fontFamily: "Karla, sans-serif",
        }}>
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
      {voice.author_label && (
        <div style={{ marginTop: "auto", fontSize: 12, color: C.inkSoft, fontStyle: "italic" }}>
          — {voice.author_label}
        </div>
      )}
    </Card>
  );
}

function VoicesSkeleton() {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
      {[0, 1].map((i) => (
        <Card key={i} style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 16, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "75%" }}/>
            <div style={{ height: 12, background: "rgba(44,35,32,.06)", borderRadius: 4, marginTop: 6 }}/>
            <div style={{ height: 12, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "92%" }}/>
            <div style={{ height: 12, background: "rgba(44,35,32,.06)", borderRadius: 4, width: "60%" }}/>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- SubmissionModal ---------------- */
function SubmissionModal({ onClose, stage, defaultTopic, user, profile, accent }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState(defaultTopic || "life");
  const defaultAuthor = useMemo(() => {
    const name = profile?.display_name?.split(" ")[0] || "Anonymous";
    return `${name}, ${stage}`;
  }, [profile?.display_name, stage]);
  const [authorLabel, setAuthorLabel] = useState(defaultAuthor);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const res = await submitVoice({
      userId: user?.id, stage, topic,
      title, body, authorLabel,
    });
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    setDone(true);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,15,12,.55)",
      display: "grid", placeItems: "center", padding: 18, zIndex: 60,
    }}>
      <Card onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        {done ? (
          <DoneState accent={accent} onClose={onClose}/>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: C.ink, lineHeight: 1.2 }}>
                  Share your story
                </div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6, lineHeight: 1.55 }}>
                  Something another woman might need to hear. We'll review it before publishing to keep this space warm and safe.
                </div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 4 }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
              <Field label="What's it about?">
                <select value={topic} onChange={(e) => setTopic(e.target.value)} style={inputS}>
                  {Object.entries(DOMAINS).map(([id, d]) => (
                    <option key={id} value={id}>{d.short}</option>
                  ))}
                </select>
              </Field>

              <Field label="Title" hint={`${title.length}/120`}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                  placeholder="e.g. What I wish I'd known about my first cycle"
                  style={inputS}
                />
              </Field>

              <Field label="Your story" hint={`${body.length}/1200`}>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 1200))}
                  rows={7}
                  placeholder="A few honest paragraphs. Speak like you're telling a friend. Specifics help — what you noticed, what helped, what you wish someone had told you."
                  style={{ ...inputS, resize: "vertical", lineHeight: 1.55, fontFamily: "Karla, sans-serif" }}
                />
              </Field>

              <Field label="How should we credit you?" hint="Use any name or 'Anonymous'. Real names are not required.">
                <input
                  value={authorLabel}
                  onChange={(e) => setAuthorLabel(e.target.value.slice(0, 60))}
                  placeholder={defaultAuthor}
                  style={inputS}
                />
              </Field>

              {error && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "#FAE6E2", borderRadius: 10, fontSize: 13, color: "#A53527" }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }}/>
                  <div>{error}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={onClose} disabled={submitting} style={btnSecondary}>Cancel</button>
                <button
                  onClick={submit}
                  disabled={submitting || !title.trim() || !body.trim()}
                  style={{
                    ...btnPrimary(accent),
                    opacity: submitting || !title.trim() || !body.trim() ? 0.55 : 1,
                    cursor: submitting || !title.trim() || !body.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={14}/> {submitting ? "Sending…" : "Submit"}
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function DoneState({ accent, onClose }) {
  return (
    <div style={{ textAlign: "center", padding: "18px 8px" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 99,
        background: `${accent}1A`, color: accent,
        display: "grid", placeItems: "center", margin: "0 auto 16px",
      }}>
        <Heart size={26}/>
      </div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: C.ink, marginBottom: 8, lineHeight: 1.25 }}>
        Thank you for sharing.
      </div>
      <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
        Your story is in the queue. We read every submission with care before publishing — that's how we keep this space warm and safe.
      </div>
      <button onClick={onClose} style={{ ...btnPrimary(accent), margin: "0 auto" }}>
        <Check size={14}/> Done
      </button>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</span>
        {hint && <span style={{ fontSize: 11.5, color: C.inkSoft }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputS = {
  width: "100%", padding: "11px 13px", borderRadius: 10,
  border: `1px solid ${C.line}`, background: "#fff",
  fontSize: 14.5, color: C.ink, outline: "none",
  fontFamily: "Karla, sans-serif",
};

const btnSecondary = {
  background: "transparent", border: "none", color: C.inkSoft,
  fontSize: 14, fontWeight: 600, padding: "10px 14px",
  cursor: "pointer", borderRadius: 10, fontFamily: "Karla, sans-serif",
};

const btnPrimary = (accent) => ({
  display: "inline-flex", alignItems: "center", gap: 7,
  background: accent, color: "#fff", border: "none",
  fontSize: 14, fontWeight: 700, padding: "10px 16px",
  borderRadius: 11, cursor: "pointer", fontFamily: "Karla, sans-serif",
});
