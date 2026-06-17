import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Heart } from "lucide-react";
import { Card, C } from "../components/ui";
import { PageHeader } from "../components/Logo";
import { useAuth } from "../lib/auth";
import { fetchVoices } from "../lib/voices";
import { STAGES, DOMAINS } from "../data/content";
import { VoiceCard, SubmissionModal } from "../components/VoicesSection";

/* Community
   ----------------------------------------------------------------
   The full Voices feed as its own top-level tab.

   Why this exists separately from the Voices block inside Library:
   - Library's snippet is filtered to the user's own stage and capped
     at a small number of cards — it's a glance, not a destination.
   - The Community page lets a user read ACROSS stages (a 28-year-old
     reading what 60-year-olds learned, a teen seeing what young women
     experienced first). That cross-stage reading is where peer wisdom
     actually compounds.
   - Putting it in the top nav also makes the feature discoverable
     instead of buried inside Library.

   Filters default to "All stages" but the user's own stage is offered
   first in the chip row, so women instinctively start with their own
   stage and can widen out when they want. */

const STAGE_ORDER = ["teen", "young", "mid", "meno", "elder"];

export default function Community({ accent }) {
  const { user, profile } = useAuth();
  const userStage = profile?.life_stage;
  const [stageFilter, setStageFilter] = useState(null); // null = all
  const [topicFilter, setTopicFilter] = useState(null);
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchVoices({ stage: stageFilter, topic: topicFilter, limit: 30 }).then((vs) => {
      if (alive) { setVoices(vs); setLoading(false); }
    });
    return () => { alive = false; };
  }, [stageFilter, topicFilter]);

  // Group voices by stage when "All" stages is selected, so the page
  // reads as a journey through life seasons rather than a flat dump.
  const grouped = useMemo(() => {
    if (stageFilter) return null;
    const g = {};
    for (const v of voices) {
      g[v.stage] = g[v.stage] || [];
      g[v.stage].push(v);
    }
    return g;
  }, [voices, stageFilter]);

  return (
    <div>
      {/* ---- Hero ---- */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>
          The community
        </div>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,5vw,38px)", letterSpacing: "-.01em", margin: "0 0 8px", color: C.ink, lineHeight: 1.15 }}>
          Voices from women like you.
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.6, maxWidth: 620, margin: 0 }}>
          Real stories from women across every stage of life. Read what they've learned. Share what you wish someone had told you.
        </p>
      </div>

      {/* ---- Share-your-story CTA card ---- */}
      <Card style={{
        marginBottom: 22, padding: "18px 20px",
        background: `linear-gradient(135deg, ${accent}1A, ${accent}06)`,
        borderColor: `${accent}33`,
        display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, color: C.ink, marginBottom: 4 }}>
            Have a story to share?
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
            Anonymous if you want. Reviewed before it's published. Even one paragraph helps another woman who's exactly where you used to be.
          </div>
        </div>
        <button onClick={() => setSubmitOpen(true)} style={{
          padding: "11px 18px", borderRadius: 11, border: "none",
          background: accent, color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "Karla, sans-serif", flexShrink: 0,
        }}>
          <Plus size={15}/> Share your story
        </button>
      </Card>

      {/* ---- Stage filters ---- */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 7, fontWeight: 600 }}>By life stage</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <FilterChip label="All stages" active={!stageFilter} accent={accent} onClick={() => setStageFilter(null)}/>
          {STAGE_ORDER.map((s) => (
            <FilterChip
              key={s}
              label={STAGES[s]?.label || s}
              hint={s === userStage ? "you" : null}
              active={stageFilter === s}
              accent={accent}
              onClick={() => setStageFilter(stageFilter === s ? null : s)}
            />
          ))}
        </div>
      </div>

      {/* ---- Topic filters ---- */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 7, fontWeight: 600 }}>By topic</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <FilterChip label="All topics" active={!topicFilter} accent={accent} onClick={() => setTopicFilter(null)}/>
          {Object.entries(DOMAINS).map(([id, d]) => (
            <FilterChip
              key={id}
              label={d.short}
              active={topicFilter === id}
              accent={accent}
              onClick={() => setTopicFilter(topicFilter === id ? null : id)}
            />
          ))}
        </div>
      </div>

      {/* ---- Voices feed ---- */}
      {loading ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          {[1,2,3,4].map((i) => (
            <Card key={i} style={{ height: 180, background: "rgba(44,35,32,.04)" }}/>
          ))}
        </div>
      ) : voices.length === 0 ? (
        <Card style={{ padding: 24, background: "rgba(44,35,32,.03)", borderStyle: "dashed", textAlign: "center" }}>
          <Users size={24} style={{ color: C.inkSoft, marginBottom: 8 }}/>
          <div style={{ fontSize: 15, color: C.ink, marginBottom: 5, fontWeight: 600 }}>No voices match these filters yet.</div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55 }}>
            Try a different combination — or be the first to share for this stage and topic.
          </div>
        </Card>
      ) : grouped ? (
        // All stages — grouped by stage with a small header per stage
        <div>
          {STAGE_ORDER.filter((s) => grouped[s]?.length).map((s) => (
            <div key={s} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 10 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, color: C.ink }}>
                  {STAGES[s]?.label || s}
                </div>
                <div style={{ fontSize: 11, color: C.inkSoft, letterSpacing: ".05em", textTransform: "uppercase" }}>
                  {grouped[s].length} {grouped[s].length === 1 ? "story" : "stories"}
                </div>
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
                {grouped[s].map((v) => (
                  <VoiceCard key={v.id} voice={v} accent={accent}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Single stage selected — flat grid
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          {voices.map((v) => (
            <VoiceCard key={v.id} voice={v} accent={accent}/>
          ))}
        </div>
      )}

      {/* ---- Footer note ---- */}
      <div style={{ marginTop: 26, padding: "16px 18px", background: "rgba(44,35,32,.03)", borderRadius: 12, fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
        <Heart size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }}/>
        Every voice here is reviewed before it's published. We protect names and identifying details. If a story moves you, share it forward — quietly, to someone you love.
      </div>

      {submitOpen && (
        <SubmissionModal
          onClose={() => setSubmitOpen(false)}
          stage={userStage}
          defaultTopic={topicFilter}
          user={user}
          profile={profile}
          accent={accent}
        />
      )}
    </div>
  );
}

function FilterChip({ label, hint, active, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 99, cursor: "pointer",
      border: `1px solid ${active ? accent : C.line}`,
      background: active ? `${accent}1A` : "#fff",
      color: active ? accent : C.ink,
      fontSize: 13, fontWeight: active ? 700 : 500,
      fontFamily: "Karla, sans-serif",
      display: "inline-flex", alignItems: "center", gap: 6,
      transition: ".15s",
    }}>
      {label}
      {hint && (
        <span style={{
          fontSize: 9.5, padding: "1.5px 6px", borderRadius: 99,
          background: active ? accent : `${accent}22`, color: active ? "#fff" : accent,
          letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 700,
        }}>{hint}</span>
      )}
    </button>
  );
}
