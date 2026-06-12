/* Self-reflection check-ins.
   IMPORTANT: these are original, educational reflections — NOT validated clinical
   instruments and NOT a diagnosis. Mental-health check-ins include a safety item;
   any sign of crisis overrides the score and routes the user to real support. */

const FREQ = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];
const SEVERITY = [
  { label: "Not at all", value: 0 },
  { label: "A little", value: 1 },
  { label: "Quite a bit", value: 2 },
  { label: "A lot", value: 3 },
];

// Gentle, non-numeric result bands (fraction of max score).
const bands = (low, mid, articles, withCrisisRefs) => ([
  { upTo: 0.25, tone: "calm", label: "You seem to be doing okay",
    message: "Nothing here stands out as a concern right now. Keep noticing how you feel — checking in regularly is a quiet act of self-care.",
    actions: [{ type: "articles", ids: articles.slice(0, 1) }] },
  { upTo: 0.55, tone: "watch", label: "A few things worth keeping an eye on",
    message: mid,
    actions: [{ type: "articles", ids: articles }, { type: "companion" }] },
  { upTo: 1.01, tone: "reach", label: "It might really help to talk to someone",
    message: low,
    actions: [{ type: "professional" }, { type: "companion" }, { type: "articles", ids: articles }, ...(withCrisisRefs ? [{ type: "resources" }] : [])] },
]);

const SAFETY = {
  text: "In the past two weeks, have you had thoughts that you'd be better off gone, or of hurting yourself?",
  options: [
    { label: "Not at all", crisis: false },
    { label: "Yes, some of the time", crisis: true },
    { label: "Yes, much of the time", crisis: true },
  ],
};

export const ASSESSMENTS = {
  mood: {
    id: "mood", domain: "psychiatry", stages: ["teen","young","mid","meno","elder"],
    title: "How has your mood been?", minutes: 2,
    intro: "A short, private reflection on how you've felt over the past two weeks. This isn't a diagnosis — it's a way to notice patterns and decide whether extra support might help.",
    questionIntro: "Over the past two weeks, how often have you…",
    questions: [
      { text: "Felt down, low, or hopeless", options: FREQ },
      { text: "Had little interest or pleasure in things you usually enjoy", options: FREQ },
      { text: "Felt tired or low on energy", options: FREQ },
      { text: "Found it hard to concentrate", options: FREQ },
      { text: "Felt bad about yourself, or that you're letting people down", options: FREQ },
      { text: "Felt restless, tense, or on edge", options: FREQ },
    ],
    safety: SAFETY,
    bands: bands(
      "Several of these have been weighing on you for a couple of weeks. That's a real signal — talking to a professional can make a genuine difference, and reaching out is a strength.",
      "A few of these have been present lately. Small, kind routines can help, and it's worth keeping an eye on how things go.",
      ["low-mood"], true),
  },
  anxiety: {
    id: "anxiety", domain: "psychiatry", stages: ["teen","young","mid","meno"],
    title: "Checking in on worry & stress", minutes: 2,
    intro: "A private reflection on anxiety and stress over the past two weeks. It's educational, not a diagnosis.",
    questionIntro: "Over the past two weeks, how often have you…",
    questions: [
      { text: "Felt nervous, anxious, or on edge", options: FREQ },
      { text: "Found it hard to stop or control worrying", options: FREQ },
      { text: "Had trouble relaxing", options: FREQ },
      { text: "Felt easily annoyed or irritable", options: FREQ },
      { text: "Felt as though something awful might happen", options: FREQ },
    ],
    safety: SAFETY,
    bands: bands(
      "Worry has been taking up a lot of space lately. Anxiety this persistent responds well to support — a professional can help you find footing.",
      "Some worry and tension have been around. Grounding routines and gentle structure often help; keep noticing what eases it.",
      ["anxiety"], true),
  },
  sleep: {
    id: "sleep", domain: "medical", stages: ["teen","young","mid","meno","elder"],
    title: "How's your sleep?", minutes: 2,
    intro: "A quick, private look at your sleep over the past two weeks.",
    questionIntro: "Over the past two weeks, how much have you experienced…",
    questions: [
      { text: "Trouble falling asleep", options: SEVERITY },
      { text: "Waking in the night and struggling to settle again", options: SEVERITY },
      { text: "Waking too early and not getting back to sleep", options: SEVERITY },
      { text: "Feeling unrested when you wake", options: SEVERITY },
      { text: "Daytime tiredness affecting your day", options: SEVERITY },
    ],
    bands: bands(
      "Your sleep has been disrupted enough to affect your days. Persistent sleep trouble is worth raising with a clinician — it's common and treatable.",
      "Your sleep has been a bit unsettled. Small, consistent wind-down habits often help more than any single fix.",
      ["3am-waking"], false),
  },
  menopause: {
    id: "menopause", domain: "gynae", stages: ["mid","meno"],
    title: "Menopause symptom check-in", minutes: 2,
    intro: "A private reflection on symptoms many women experience around perimenopause and menopause.",
    questionIntro: "Over the past month, how much have you been bothered by…",
    questions: [
      { text: "Hot flashes or night sweats", options: SEVERITY },
      { text: "Sleep disruption", options: SEVERITY },
      { text: "Mood changes or irritability", options: SEVERITY },
      { text: "Vaginal dryness or discomfort", options: SEVERITY },
      { text: "Joint aches or stiffness", options: SEVERITY },
      { text: "Brain fog or forgetfulness", options: SEVERITY },
    ],
    bands: bands(
      "These symptoms are affecting your daily life. You don't have to just cope — a clinician can discuss options, including whether HRT is right for you.",
      "A few menopause-related symptoms are showing up. There's a lot that helps, from lifestyle shifts to medical options worth exploring.",
      ["hot-flashes","perimenopause"], false),
  },
  cycle: {
    id: "cycle", domain: "gynae", stages: ["teen","young","mid"],
    title: "Your cycle & how it affects you", minutes: 2,
    intro: "A private reflection on how your menstrual cycle affects your mood and body.",
    questionIntro: "In the days before and during your period, how much do you experience…",
    questions: [
      { text: "Mood dips, sadness, or feeling overwhelmed", options: SEVERITY },
      { text: "Physical symptoms (cramps, bloating, headaches) that disrupt your day", options: SEVERITY },
      { text: "Irritability or tension", options: SEVERITY },
      { text: "Fatigue or low energy", options: SEVERITY },
      { text: "Effects on your relationships, school, or work", options: SEVERITY },
    ],
    bands: bands(
      "Your cycle is affecting your life quite a lot. If pre-period mood changes are severe, it's worth asking a clinician about PMDD — it's recognised and treatable.",
      "Your cycle has a noticeable effect on you. Tracking the pattern across a few months often makes it feel more manageable.",
      ["cycle-mood-map","pmdd"], false),
  },
};

export const findAssessment = (domain, stage) =>
  Object.values(ASSESSMENTS).find(
    (a) => a.domain === domain && (!stage || a.stages.includes(stage))
  ) || null;

export const assessmentsForStage = (stage) =>
  Object.values(ASSESSMENTS).filter((a) => a.stages.includes(stage));
