import "dotenv/config";
import express from "express";
import cors from "cors";
import { cyclePhaseSummary } from "./lib/cycleMath.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8080;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ----------------------------------------------------------------------------
// SAFETY: crisis intent — handled server-side BEFORE any model call.
// Any match returns the crisis route, no LLM involved.
// ----------------------------------------------------------------------------
const CRISIS = [
  "suicide", "kill myself", "end it all", "end my life",
  "hurt myself", "harm myself", "self harm", "self-harm",
  "want to die", "wanna die", "can't go on", "cant go on", "no reason to live",
  "rape", "abuse", "being abused", "being beaten",
];
const isCrisis = (text) => {
  const low = (text || "").toLowerCase();
  return CRISIS.some((k) => low.includes(k));
};

// ----------------------------------------------------------------------------
// Per-domain "lens" — different professional voices for different questions.
// When a user has tapped a topic chip in Library, the active domain comes
// through with the request and we prepend this lens to the system prompt.
// This is what makes a Nutrition answer actually sound like a nutritionist,
// not a generic wellness paragraph.
// ----------------------------------------------------------------------------
const DOMAIN_LENS = {
  gynae: `For this answer, take the lens of a women's health clinician (gynaecologist). Focus on reproductive function, cycle physiology, hormones, period concerns, fertility, and contraception. Use clinical accuracy in plain English. When relevant, name what's typical vs what warrants a visit.`,
  medical: `For this answer, take the lens of a general practitioner. Focus on overall physical health: symptoms, common causes, lifestyle factors, when to escalate, and signs that warrant a check-up. Bias toward 'see your doctor' when uncertain — never minimise red flags.`,
  psychiatry: `For this answer, take the lens of a psychiatrist. Focus on the clinical picture of mood, anxiety, sleep, focus, and other mental health symptoms — including how they relate to biology, hormones, and the conditions she lives with. When relevant, name when professional support matters and what a clinician might consider. Do NOT name specific medications or dosages.`,
  psychology: `For this answer, take the lens of a therapist or counsellor. Focus on emotional experience, coping frameworks (CBT-style reframing, grounding, self-compassion), behavioural patterns, and relationship dynamics. Suggest approaches she can practice — not medications. Acknowledge what's hard before suggesting anything.`,
  nutrition: `For this answer, take the lens of a registered nutritionist. Focus on concrete food, hydration, and supplement suggestions — name specific foods to add or limit. Where relevant, suggest foods that support her current cycle phase, her conditions, or her recent state. Be specific, not vague. No diet plans unless she asks.`,
  fitness: `For this answer, take the lens of a women's fitness coach who understands cycle-syncing. Focus on movement, training intensity, and recovery. Suggest concrete things to try this week — types of movement, intensity, duration. Honour where she is in her cycle: lower-intensity in luteal, higher in follicular and ovulation, gentle restorative during menstrual. Name specific workouts (e.g. "30 minutes of zone-2 walking" not "some cardio").`,
  life: `For this answer, take the lens of a thoughtful life coach. Focus on practical day-to-day frameworks for navigating the situation — boundaries, decision-making, communication, time management, relationships, identity. Suggest concrete things she can do or say, not feelings she should have.`,
};

// ----------------------------------------------------------------------------
// System prompt — sets the companion's voice and boundaries
// ----------------------------------------------------------------------------
const SYSTEM = `You are FeBrite, a wellness companion for women. You speak directly to the user, like a thoughtful, informed friend who happens to know about women's health.

Your voice:
- Warm, plain English. No jargon unless you explain it briefly.
- Specific to what you know about her — never generic. Reference her cycle phase, recent sleep, her conditions, her support people ONLY when they actually appear in the context below.
- Brief. 3-5 short paragraphs maximum. Often less.
- Acknowledge her experience before explaining anything.
- Human, not clinical. Avoid bulleted lists of tips unless she explicitly asks for one.

CRITICAL — NEVER INVENT DETAILS ABOUT HER:
- If a fact is NOT in the context above (her doctor, her support people, her conditions, her medications, her cycle, her recent check-ins, her location, her name), DO NOT mention it as if it were.
- Never invent a doctor's name. If her regular doctor isn't listed, say "your doctor" or "a clinician you trust" — never make one up.
- Never invent support people, conditions, medications, or symptoms she didn't tell you about.
- If her profile is mostly empty or she has no check-ins logged, say so plainly and offer general framing rather than pretending to know specifics.
- If you don't actually know something specific about her, acknowledge that rather than guessing.

Boundaries:
- You are not a clinician. You do not diagnose, prescribe, or give dosages.
- If something is clinical, gently encourage her to see a professional.
- If she expresses distress — self-harm, abuse, immediate danger — respond briefly with care and route her to crisis support. Do not try to be the therapist.

Avoid:
- Generic advice she could get from any search engine
- Long disclaimers
- Pretending to be authoritative about diagnosis or treatment
- Saying "as an AI" or referencing yourself as a model — you're FeBrite.
- Assuming she's in any particular life situation that the context doesn't confirm.`;

// ----------------------------------------------------------------------------
// Build the per-call context from the user's actual data
// ----------------------------------------------------------------------------
function buildContext(profile = {}, entries = [], support_people = []) {
  const lines = ["What you know about her (her own data — use ONLY what's listed here; do not invent anything not below):"];
  let dataPresent = false;
  if (profile.display_name) { lines.push(`Name: ${profile.display_name}`); dataPresent = true; }
  if (profile.pronouns) lines.push(`Pronouns: ${profile.pronouns}`);
  if (profile.life_stage) { lines.push(`Life stage: ${profile.life_stage}`); dataPresent = true; }
  if (profile.date_of_birth) lines.push(`Date of birth: ${profile.date_of_birth}`);
  if (profile.city || profile.country) lines.push(`Location: ${[profile.city, profile.country].filter(Boolean).join(", ")}`);
  if (profile.focus_areas?.length) { lines.push(`What she wants to focus on: ${profile.focus_areas.join(", ")}`); dataPresent = true; }
  if (profile.goals?.length) { lines.push(`Her goals: ${profile.goals.join(", ")}`); dataPresent = true; }
  if (profile.conditions?.length) { lines.push(`Conditions she lives with: ${profile.conditions.join(", ")}`); dataPresent = true; }
  if (profile.allergies?.length) lines.push(`Allergies: ${profile.allergies.join(", ")}`);

  if (Array.isArray(profile.medications) && profile.medications.length) {
    lines.push(`Current medications: ${profile.medications.map((m) => [m.name, m.dose, m.schedule].filter(Boolean).join(" ")).join("; ")}`);
    dataPresent = true;
  }
  if (profile.cycle_start_date) {
    lines.push(`Cycle: last period started ${profile.cycle_start_date}; avg cycle ${profile.cycle_length || 28} days; period length ${profile.period_length || 5} days`);
    const summary = cyclePhaseSummary(profile);
    if (summary) {
      lines.push(`TODAY: ${summary} (This is the authoritative phase for today — not what she logged on past days.)`);
    }
    dataPresent = true;
  }
  if (profile.birth_control) lines.push(`Contraception: ${profile.birth_control}`);

  if (profile.regular_doctor?.name) {
    lines.push(`Her regular doctor: ${profile.regular_doctor.name}${profile.regular_doctor.clinic ? " at " + profile.regular_doctor.clinic : ""}`);
    dataPresent = true;
  }
  if (Array.isArray(support_people) && support_people.length) {
    lines.push("Her support people:");
    support_people.forEach((p) => {
      const parts = [p.name];
      if (p.relationship) parts.push(`(${p.relationship})`);
      if (p.when_to_reach) parts.push(`— reach when: ${p.when_to_reach}`);
      lines.push(`  - ${parts.join(" ")}`);
    });
    dataPresent = true;
  }
  if (profile.workout_prefs?.length) lines.push(`Movement she likes: ${profile.workout_prefs.join(", ")}`);
  if (profile.dietary_prefs?.length) lines.push(`Diet: ${profile.dietary_prefs.join(", ")}`);

  if (Array.isArray(entries) && entries.length) {
    const recent = entries.slice(-7);
    lines.push("\nHer last 7 days of daily check-ins (most recent last):");
    recent.forEach((e) => {
      const bits = [];
      if (e.mood) bits.push(`mood ${e.mood}/5`);
      if (e.energy) bits.push(`energy ${e.energy}/5`);
      if (e.sleep_hours != null) bits.push(`slept ${e.sleep_hours}h`);
      if (e.work_stress) bits.push(`work stress ${e.work_stress}/5`);
      if (e.personal_stress) bits.push(`personal stress ${e.personal_stress}/5`);
      if (e.cycle_phase) bits.push(`logged phase that day: ${e.cycle_phase}`);
      if (e.symptoms?.length) bits.push(`noticed: ${e.symptoms.join(", ")}`);
      if (e.moved != null) bits.push(e.moved ? "moved" : "no movement");
      lines.push(`  ${e.entry_date}: ${bits.join(", ") || "(empty)"}`);
    });
    dataPresent = true;
  } else {
    lines.push("\nShe hasn't logged any daily check-ins yet. Do not infer specific symptoms or patterns she hasn't reported.");
  }

  // Hard reminder when there's very little personal data — keeps the model honest.
  if (!dataPresent) {
    lines.push("\nIMPORTANT: She has not given you much profile data. Do not invent specifics about her cycle, conditions, doctor, support people, or symptoms. Respond with care but in general terms, and gently invite her to fill in her profile if appropriate.");
  }
  return lines.join("\n");
}

// ----------------------------------------------------------------------------
// Crisis response shape
// ----------------------------------------------------------------------------
function crisisResponse() {
  return {
    crisis: true,
    text: "I'm really glad you told me. What you're carrying matters, and it's bigger than I can be the right help for. Please reach out to someone trained — your local emergency services, a crisis line, or one of your support people.",
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, gemini: !!GEMINI_KEY, model: MODEL }));

/* Call Gemini with automatic retry on transient errors (503 overload,
   429 rate limit). Free tier hits 503s often during peak hours; a short
   backoff usually clears it. Falls back to a secondary model if set. */
async function callGemini(payload, model = MODEL) {
  const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash";
  const url = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) return { data: await r.json(), model };
      const status = r.status;
      const errText = await r.text();
      console.error(`gemini ${model} attempt ${attempt+1}: ${status}`);
      // Transient — retry after a short delay
      if ((status === 503 || status === 429) && attempt < 2) {
        await new Promise((ok) => setTimeout(ok, 800 * (attempt + 1)));
        continue;
      }
      // Final attempt failed on the primary — try fallback model once
      if (model !== FALLBACK_MODEL && (status === 503 || status === 429)) {
        console.log(`falling back to ${FALLBACK_MODEL}`);
        return callGemini(payload, FALLBACK_MODEL);
      }
      throw new Error(`gemini ${status}: ${errText.slice(0, 200)}`);
    } catch (e) {
      if (attempt < 2) {
        await new Promise((ok) => setTimeout(ok, 800 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

// ----------------------------------------------------------------------------
// Main companion endpoint — takes a question + full context, returns an answer.
// Backwards compatible: also handles { message } shape from older clients.
// ----------------------------------------------------------------------------
app.post("/api/companion/ask", async (req, res) => {
  const { question, message, profile, recent_entries, support_people, domain } = req.body || {};
  const q = (question || message || "").trim();

  if (!q) return res.status(400).json({ error: "missing question" });
  if (isCrisis(q)) return res.json(crisisResponse());

  if (!GEMINI_KEY) {
    return res.json({
      text: "The companion isn't configured yet — your backend needs a GEMINI_API_KEY. In the meantime: what you're noticing matters, and a real conversation with a clinician or someone you trust is always worth more than a chatbot.",
      configured: false,
    });
  }

  const context = buildContext(profile, recent_entries, support_people);
  const userTurn = `${context}\n\nHer question: ${q}`;

  // Build the active system prompt: base SYSTEM + domain lens if one is set.
  // The lens goes AT THE END so it has the strongest pull on the response.
  const lens = domain && DOMAIN_LENS[domain] ? `\n\n--- THIS QUESTION'S LENS ---\n${DOMAIN_LENS[domain]}` : "";
  const activeSystem = SYSTEM + lens;

  const payload = {
    systemInstruction: { parts: [{ text: activeSystem }] },
    contents: [{ role: "user", parts: [{ text: userTurn }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const { data } = await callGemini(payload);
    // If Gemini's own safety blocked the response, treat as crisis-style routing.
    if (data?.candidates?.[0]?.finishReason === "SAFETY") return res.json(crisisResponse());

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text) return res.json({ text: "I'm not sure how to answer that one. Could you rephrase or ask something more specific?" });

    // If we ran into the token cap, append a soft note rather than ending mid-sentence silently.
    let finalText = text;
    if (data?.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      finalText += "\n\n— (I had more to say but ran out of room. Ask me to keep going if useful.)";
    }

    // Secondary crisis check: if the LLM somehow generated something risky, catch it.
    if (isCrisis(finalText)) return res.json(crisisResponse());

    return res.json({ text: finalText });
  } catch (e) {
    console.error("companion crash", e.message);
    const msg = String(e.message || "");
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("overload")) {
      return res.json({ text: "Gemini's free tier is overloaded right now (this happens at peak hours). Try again in a minute — I'll be back.", upstream: "overloaded" });
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return res.json({ text: "We've hit the free-tier rate limit for the moment. Give it 60 seconds and try again.", upstream: "rate_limited" });
    }
    return res.json({ text: "Something went wrong reaching the companion. Try again in a moment." });
  }
});

// Backwards compat: older clients still POST to /api/companion with { message, stage }
app.post("/api/companion", async (req, res) => {
  req.body = { question: req.body?.message, ...req.body };
  return app._router.handle({ ...req, url: "/api/companion/ask", originalUrl: "/api/companion/ask" }, res);
});

/* ----------------------------------------------------------------------------
   Daily read — generates a short, warm paragraph for Home that reads
   *her* current state. Pulled from cycle phase + recent check-ins + profile.
   Lower temperature than the open-ended ask so the voice stays grounded.
   ---------------------------------------------------------------------------- */
const TODAY_SYSTEM = `You are FeBrite, a wellness companion writing one short paragraph for a woman opening her app today.

What you're doing:
- A single warm paragraph, 2-4 sentences, addressed to her by name.
- It should read like a thoughtful friend who noticed where she is right now — her cycle phase, her recent check-ins, what's likely to matter today.
- Reference what you actually see in the context. If you see a recurring symptom, mention it. If sleep has been short, name it. If her mood has been climbing, say so.
- End with one gentle suggestion or thing to pay attention to — not a list, just one thing.

Hard rules:
- Never invent details not in the context. If she has no recent check-ins, write about the cycle phase generally and gently invite her to log.
- Never name a doctor, support person, condition, or medication that isn't listed in the context.
- No bullet points, no lists, no headers. Just prose.
- No medical claims. No diagnoses.
- 80 words maximum. Less is fine.`;

app.post("/api/companion/today", async (req, res) => {
  const { profile, recent_entries, support_people } = req.body || {};

  if (!GEMINI_KEY) {
    return res.json({
      text: "Welcome back. Set up your Gemini key on the server and I'll start writing a fresh read of your day, here, every time you arrive.",
      configured: false,
    });
  }

  const context = buildContext(profile, recent_entries, support_people);
  const userTurn = `${context}\n\nWrite her daily read for today.`;

  const payload = {
    systemInstruction: { parts: [{ text: TODAY_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userTurn }] }],
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 600,
      topP: 0.9,
      thinkingConfig: { thinkingBudget: 0 },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  try {
    const { data } = await callGemini(payload);
    if (data?.candidates?.[0]?.finishReason === "SAFETY") {
      return res.json({ text: "Welcome back. I noticed some things that might be worth talking through — head to your companion when you're ready." });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!text) return res.json({ text: "Welcome back. Log today's check-in and I'll have a real read for you." });
    return res.json({ text });
  } catch (e) {
    console.error("today crash", e.message);
    return res.json({ text: "Welcome back. (Couldn't fetch your daily read just now — try again in a moment.)" });
  }
});

app.listen(PORT, () => {
  console.log(`FeBrite companion API on :${PORT} (model: ${MODEL}, gemini: ${!!GEMINI_KEY})`);
});
