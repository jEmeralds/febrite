import { getRecentEntries } from "./trackingApi";
import { currentCyclePhase } from "./cycleMath";
import { getPhaseLogs, derivePhaseNow } from "./cyclePhases";

const API = import.meta.env.VITE_API_URL;
const TODAY_CACHE_KEY = "febrite_daily_read";

const PHASE_TITLE = { menstrual:"Menstrual", follicular:"Follicular", ovulation:"Ovulation", luteal:"Luteal" };
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

/* Real, logged-phase summary sent to the server — replaces the old
   server-side fixed-math cyclePhaseSummary(profile). This is computed
   from her actual cycle_phase_logs, same source of truth as the Track
   page and the wheel, so the AI's context can never disagree with what
   she sees in the app. Returns null if nothing's been logged yet. */
async function buildPhaseSummary(userId) {
  if (!userId) return null;
  try {
    const logs = await getPhaseLogs(userId, null, null);
    const now = derivePhaseNow(logs, localToday());
    if (!now) return null;
    return `Currently in her ${PHASE_TITLE[now.phase]} phase — day ${now.dayInPhase}, as logged by her (not a prediction).`;
  } catch (e) {
    console.error("buildPhaseSummary failed", e);
    return null;
  }
}

/* Fetch the daily read for Home. Cached per user per day, AND
   invalidated when she logs a new check-in (so the paragraph
   updates if she logs mid-day and comes back to Home). */
export async function fetchDailyRead({ profile, userId, force = false }) {
  const today = localToday();
  let entries = [];
  if (userId) {
    try { entries = await getRecentEntries(userId, 14); } catch {}
  }
  const latestEntryDate = entries.length ? entries[entries.length - 1].entry_date : "none";
  const cacheKey = `${userId || "anon"}:${today}:${latestEntryDate}`;

  if (!force) {
    try {
      const raw = localStorage.getItem(TODAY_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.key === cacheKey && cached.text) {
          return { text: cached.text, cached: true };
        }
      }
    } catch {}
  }

  if (!API) {
    return { text: "Welcome back. Your companion will write you a fresh read each day once we connect the backend.", configured: false };
  }

  const current_phase_summary = await buildPhaseSummary(userId);

  try {
    const r = await fetch(`${API}/api/companion/today`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, recent_entries: entries, support_people: profile?.support_people || [], current_phase_summary }),
    });
    if (!r.ok) throw new Error("bad status " + r.status);
    const data = await r.json();
    if (data?.text) {
      try { localStorage.setItem(TODAY_CACHE_KEY, JSON.stringify({ key: cacheKey, text: data.text })); } catch {}
    }
    return data;
  } catch (e) {
    console.error("daily read failed", e);
    return { text: "Welcome back. Couldn't reach your companion just now — try again in a moment.", error: true };
  }
}

/* Ask the companion. Pulls the user's latest tracking entries and bundles
   them with profile + support_people into the request, so the answer is
   shaped by who she actually is. The `domain` arg lets callers tell
   the server which professional lens to answer through. */
export async function askCompanion({ question, profile, userId, domain = null }) {
  let recent_entries = [];
  if (userId) {
    try { recent_entries = await getRecentEntries(userId, 14); }
    catch (e) { console.error("entries fetch", e); }
  }
  const support_people = profile?.support_people || [];
  const current_phase_summary = await buildPhaseSummary(userId);

  if (!API) {
    return {
      text: "I'm not connected to the companion right now. Add VITE_API_URL to your .env and start the server (see server/.env.example for the Gemini key). When that's set up, I'll answer here using your profile and your recent check-ins.",
      configured: false,
    };
  }

  try {
    const r = await fetch(`${API}/api/companion/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, profile, recent_entries, support_people, domain, current_phase_summary }),
    });
    if (!r.ok) throw new Error("bad status " + r.status);
    return await r.json();
  } catch (e) {
    console.error("companion api failed", e);
    return { text: "I couldn't reach the companion just now. Try again in a moment.", error: true };
  }
}

/* NEW: natural-language check-in parsing. Takes her free text and returns
   structured suggestions — mood/energy/symptoms/phase/etc — for the
   check-in form to pre-fill. NEVER auto-saves; the caller always shows
   these back to her to confirm or adjust before anything is written. */
export async function parseCheckinText({ text, userId, includeTodayContext = true }) {
  if (!API) {
    return { error: "not_configured", text: "The companion isn't connected yet, so I can't interpret free text — you can still fill in the fields directly." };
  }
  const current_phase_summary = includeTodayContext ? await buildPhaseSummary(userId) : null;
  try {
    const r = await fetch(`${API}/api/companion/parse-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, current_phase_summary }),
    });
    if (!r.ok) throw new Error("bad status " + r.status);
    return await r.json();
  } catch (e) {
    console.error("parse-checkin failed", e);
    return { error: true, text: "Couldn't reach the companion just now to interpret that — try again in a moment, or fill in the fields directly." };
  }
}

// ============================================================================
// SUGGESTED QUESTIONS
// (unchanged from before — still reads currentCyclePhase(profile) from the
// old cycleMath.js for its phase-aware question prompts. This is a known
// follow-up: migrating it to real logged phases needs the caller to pass
// an already-computed phaseNow in, since this function is called
// synchronously. Left as-is for now to avoid guessing at Companion.jsx's
// current structure blind.)
// ============================================================================

const DOMAIN_STAGE = {
  gynae: {
    teen:  ["Is my period supposed to be this irregular?", "When should I see a gynaecologist for the first time?", "How do I know if my cramps are too much?"],
    young: ["Should I be tracking ovulation even if I'm not trying to conceive?", "What contraception is actually safe long-term?", "What's a normal cycle at my age?"],
    mid:   ["Am I in perimenopause already?", "Why has my cycle changed in my 40s?", "What screenings matter most right now?"],
    meno:  ["What can I do about vaginal dryness?", "Should I consider HRT?", "How long do menopausal symptoms last?"],
    elder: ["What gynaecological checkups still matter at this age?", "Should I be worried about post-menopausal bleeding?"],
  },
  medical: {
    teen:  ["What checks should I be doing as a teenager?", "How do I know when fatigue is worth a doctor visit?"],
    young: ["What annual checks should I keep up at this age?", "Which labs are worth running routinely?", "When is being tired worth seeing a doctor?"],
    mid:   ["What checks change for women in their 40s?", "Should I get my hormones tested?", "How often should I check my thyroid?"],
    meno:  ["What checks become more important in menopause?", "What's worth testing after 50?"],
    elder: ["What's the minimum preventive care I should keep doing?", "How do I tell what's aging vs what needs attention?"],
  },
  psychiatry: {
    teen:  ["Is what I'm feeling normal for a teenager?", "When should a teen see a therapist?", "How do I tell stress from depression?"],
    young: ["Is my anxiety in my 20s normal?", "How do I find a therapist I'd actually trust?", "Why does life feel like this much pressure?"],
    mid:   ["How does midlife actually affect mental health?", "When does perimenopause-mood become depression?", "What I'm feeling — is it normal for my 40s?"],
    meno:  ["How does menopause affect mental health?", "Why does my anxiety feel different now?"],
    elder: ["Why might my mood be shifting in this stage of life?", "Is loneliness part of this, or something more?"],
  },
  psychology: {
    teen:  ["Why do I feel everything so intensely?", "How do I tell who I really am?", "How do I deal with friendship stuff?"],
    young: ["How do I tell burnout from depression?", "Why do I feel like I should have it more together?", "How do I rebuild after a hard stretch?"],
    mid:   ["How do I navigate identity in midlife?", "How do I manage being everything for everyone?", "Why does my self-image keep shifting?"],
    meno:  ["How do I find purpose in this new phase?", "Who am I beyond the roles I've held?"],
    elder: ["How do I navigate this season with grace?", "How do I sit with loss and change?"],
  },
  nutrition: {
    teen:  ["Do I need supplements as a teenager?", "How should I eat for my hormones during puberty?", "What's actually true about diets for young women?"],
    young: ["What should I eat in my luteal phase?", "Do I really need iron or B12 supplements?", "What's the most overrated nutrition advice for women?"],
    mid:   ["What should change about how I eat in my 40s?", "Are there foods that help perimenopause?", "What about iron as my cycles get heavier?"],
    meno:  ["What should I eat to help with menopause?", "Do I need calcium supplements now?", "What foods can take the edge off hot flashes?"],
    elder: ["What should I prioritise in my diet for bone and brain health?", "Are supplements actually necessary at this age?"],
  },
  fitness: {
    teen:  ["How should I start strength training safely?", "Is it bad to skip workouts during my period?"],
    young: ["How should my workouts change with my cycle?", "Is it normal to feel weaker in my luteal phase?", "How do I strength train safely as a woman?"],
    mid:   ["How should fitness change in my 40s?", "Is HIIT still right for me?", "Why is recovery taking longer than it used to?"],
    meno:  ["What's the best exercise for menopause?", "How do I keep muscle as estrogen drops?"],
    elder: ["What movement matters most for older women?", "How do I keep my strength as I age?"],
  },
  life: {
    teen:  ["How do I manage school stress?", "How do I deal with friendships that feel hard?"],
    young: ["How do I balance career and life?", "How do I keep healthy habits when life is busy?", "How do I talk to my partner about how I'm feeling?"],
    mid:   ["How do I manage being the sandwich generation?", "How do I take care of myself when others need me?"],
    meno:  ["How do I find new meaning in this stage?", "How do I navigate the empty nest or shifting roles?"],
    elder: ["How do I stay connected in this stage of life?", "How do I deal with loss and change?"],
  },
};

const STAGE_FALLBACK = {
  teen:  "Is my period normal?",
  young: "Should I be thinking about fertility yet?",
  mid:   "What are the early signs of perimenopause?",
  meno:  "What helps hot flashes that I can actually try at home?",
  elder: "What should I be doing for bone health now?",
};

function personalQuestions(profile, entries) {
  const out = [];
  const push = (text, ...domains) => out.push({ text, domains });
  const real = entries.filter((e) => e.mood != null).slice(-3);

  const sleeps = real.filter((e) => e.sleep_hours != null);
  if (sleeps.length >= 2 && sleeps.every((e) => e.sleep_hours < 6.5))
    push("My sleep has been short for a few nights — what's likely going on?", "medical", "psychiatry", "life");

  const works = real.filter((e) => e.work_stress != null);
  if (works.length >= 2 && works.every((e) => e.work_stress >= 4))
    push("Work stress has been heavy lately — how do I actually cope?", "psychology", "life");

  const persStress = real.filter((e) => e.personal_stress != null);
  if (persStress.length >= 2 && persStress.every((e) => e.personal_stress >= 4))
    push("Personal stress has been a lot — what helps when it stays this high?", "psychology", "life");

  if (real.length >= 2 && real.every((e) => e.mood <= 2))
    push("My mood has been low these past few days — should I be worried?", "psychiatry", "psychology");

  const energies = real.filter((e) => e.energy != null);
  if (energies.length >= 2 && energies.every((e) => e.energy <= 2))
    push("Why has my energy been so low this week?", "medical", "nutrition", "fitness");

  if (real.length >= 3) {
    const first = real[0].mood, last = real[real.length - 1].mood;
    if (last > first + 0.8) push("My mood has been lifting — what's likely driving that?", "psychology", "psychiatry");
    if (first > last + 0.8) push("My mood has been declining over the past few days — should I be paying attention?", "psychiatry", "psychology");
  }

  const symptomCounts = {};
  entries.forEach((e) => (e.symptoms || []).forEach((s) => {
    const k = s.toLowerCase();
    symptomCounts[k] = (symptomCounts[k] || 0) + 1;
  }));
  const recurring = (...keys) => keys.some((k) => Object.entries(symptomCounts).some(([s, n]) => n >= 2 && s.includes(k)));

  if (recurring("cramp"))      push("My cramps keep coming back — when does that need a closer look?", "gynae", "medical");
  if (recurring("headache"))   push("My headaches have been recurring — what's likely driving them?", "medical");
  if (recurring("bloat"))      push("Why does bloating keep showing up for me?", "gynae", "nutrition", "medical");
  if (recurring("hot flash"))  push("Hot flashes keep showing up — what actually helps?", "gynae", "medical");
  if (recurring("anxious"))    push("Anxiety has been showing up a lot — what helps when it does?", "psychiatry", "psychology");
  if (recurring("poor sleep")) push("My sleep has been disrupted — what's likely going on?", "medical", "psychiatry");
  if (recurring("irritable"))  push("Why have I been more irritable than usual lately?", "psychology", "psychiatry");
  if (recurring("fatigue"))    push("Fatigue keeps coming up — what should I look at?", "medical", "nutrition", "fitness");
  if (recurring("breast"))     push("My breasts have been tender lately — when is that worth checking?", "gynae", "medical");
  if (recurring("nausea"))     push("Why has nausea been showing up for me?", "gynae", "medical");

  const cyc = currentCyclePhase(profile);
  const phase = cyc?.phase;
  if (phase === "Luteal") {
    push("I'm in my luteal phase right now — what should I be paying attention to?", "gynae", "life");
    push("What foods help me through luteal phase?", "nutrition");
    push("How should I train during my luteal phase?", "fitness");
  }
  if (phase === "Menstrual") {
    push("My period's here — what would actually help me through it?", "gynae", "life");
    push("What should I eat while I'm on my period?", "nutrition");
    push("Should I exercise on my period — and how?", "fitness");
  }
  if (phase === "Ovulation") {
    push("I'm ovulating — what's normal to feel right now?", "gynae", "life");
    push("Is this the best week to push hard in workouts?", "fitness");
  }
  if (phase === "Follicular") {
    push("I'm in my follicular phase — how can I make the most of this?", "gynae", "life");
    push("What workouts fit my follicular phase best?", "fitness");
    push("What foods support me in my follicular phase?", "nutrition");
  }

  const conds = (profile?.conditions || []).map((c) => c.toLowerCase());
  conds.forEach((c) => {
    if (c.includes("pcos")) {
      push("What does my PCOS mean for how I should eat and exercise?", "gynae", "nutrition", "fitness");
      push("Which foods actually help with PCOS?", "nutrition");
    }
    if (c.includes("endometriosis")) push("What can actually help with my endometriosis pain?", "gynae", "medical");
    if (c.includes("anaemia") || c.includes("anemia")) {
      push("How do I tell if my iron is dropping again?", "medical");
      push("What iron-rich foods should I add to my diet?", "nutrition");
    }
    if (c.includes("thyroid"))   push("How does my thyroid affect my cycle and mood?", "gynae", "medical");
    if (c.includes("fibroid"))   push("How do I manage my fibroid symptoms day-to-day?", "gynae", "life");
    if (c.includes("anxiety"))   push("What can help my anxiety on the heavier days?", "psychiatry", "psychology");
    if (c.includes("depression"))push("What can help when depression makes everything feel heavier?", "psychiatry", "psychology");
    if (c.includes("diabetes")) {
      push("How does diabetes interact with my cycle?", "gynae", "medical");
      push("What should I eat for blood sugar stability?", "nutrition");
    }
    if (c.includes("migraine"))  push("Why are my migraines tied to my cycle, and what helps?", "gynae", "medical");
  });

  const goals = (profile?.goals || []).map((g) => g.toLowerCase());
  goals.forEach((g) => {
    if (g.includes("sleep"))   push("What actually improves my sleep quality, not just how long I sleep?", "medical", "life");
    if (g.includes("anxiety")) push("Daily things that ease my anxiety without medication", "psychology", "psychiatry");
    if (g.includes("weight"))  push("How does my cycle affect weight changes for me?", "gynae", "nutrition", "fitness");
    if (g.includes("energy"))  push("What might be quietly draining my energy that I'm missing?", "medical", "nutrition");
    if (g.includes("focus"))   push("Why does my focus shift through my cycle?", "gynae", "psychology");
    if (g.includes("strength") || g.includes("fitness")) push("How should I structure workouts around my cycle?", "fitness");
  });

  const focuses = (profile?.focus_areas || []).map((f) => f.toLowerCase());
  focuses.forEach((f) => {
    if (f.includes("cycle") && f.includes("mood")) push("How is my cycle actually connected to my mood?", "gynae", "psychology");
    if (f.includes("burnout"))   push("Given my recent days, am I heading toward burnout?", "psychology", "life");
    if (f.includes("fertility")) push("If I'm thinking about fertility, what should I be tracking?", "gynae");
    if (f.includes("perimenopause") || f.includes("menopause")) push("How do I tell what's hormones vs what's just life right now?", "gynae", "life");
  });

  if (profile?.medications?.length) {
    push("How might my current medications be affecting my cycle or mood?", "medical", "gynae");
  }

  return out;
}

function genericQuestions(profile, domain) {
  const out = [];
  const stage = profile?.life_stage;

  if (domain && stage && DOMAIN_STAGE[domain]?.[stage]) {
    out.push(...DOMAIN_STAGE[domain][stage]);
  } else if (domain && stage) {
    Object.values(DOMAIN_STAGE[domain] || {}).slice(0, 1).forEach((arr) => out.push(...arr));
  }

  if (!domain && stage) out.push(STAGE_FALLBACK[stage]);

  out.push("What does my recent data suggest I should pay attention to?");
  out.push("What's something most women my age get wrong about their health?");
  return out;
}

export function suggestedQuestions(profile, recent_entries = [], domain = null) {
  const personalObjs = personalQuestions(profile || {}, recent_entries || []);
  const filteredPersonal = domain
    ? personalObjs.filter((q) => q.domains.includes(domain))
    : personalObjs;

  const generic = genericQuestions(profile || {}, domain);
  const seen = new Set();
  const out = [];
  const tryAdd = (text) => {
    if (!text || seen.has(text)) return false;
    seen.add(text);
    out.push(text);
    return true;
  };

  const TOTAL = 6;
  if (domain) {
    const personalSlots = Math.max(3, TOTAL - 3);
    let personalAdded = 0;
    for (const q of filteredPersonal) {
      if (personalAdded >= personalSlots) break;
      if (tryAdd(q.text)) personalAdded++;
    }
    for (const q of generic) { if (out.length >= TOTAL) break; tryAdd(q); }
  } else {
    for (const q of filteredPersonal) { if (out.length >= TOTAL) break; tryAdd(q.text); }
    for (const q of generic)          { if (out.length >= TOTAL) break; tryAdd(q); }
  }
  return out;
}
