/* The professional disciplines a practitioner can register under.
   id is what we store in DB; label is the user-facing name. */
export const SPECIALTIES = [
  { id: "gynae",         label: "Obstetrician–Gynaecologist",     short: "Gynae",         color: "#B25A38" },
  { id: "gp",            label: "General Practitioner",             short: "Medical",       color: "#3E6E8C" },
  { id: "psychiatry",    label: "Psychiatrist",                     short: "Psychiatry",    color: "#7A4F8A" },
  { id: "psychology",    label: "Clinical Psychologist",            short: "Psychology",    color: "#B25A38" },
  { id: "counselling",   label: "Mental Health Counsellor",         short: "Counselling",   color: "#9A4E5B" },
  { id: "nutrition",     label: "Registered Dietitian / Nutritionist", short: "Nutrition",  color: "#76876A" },
  { id: "physio",        label: "Women's Health Physiotherapist",   short: "Fitness",       color: "#C9893F" },
  { id: "midwife",       label: "Midwife",                          short: "Midwifery",     color: "#B25A38" },
  { id: "doula",         label: "Doula",                            short: "Birth",         color: "#A66B4E" },
  { id: "lactation",     label: "Lactation Consultant",             short: "Lactation",     color: "#76876A" },
  { id: "sextherapy",    label: "Sex Therapist",                    short: "Intimacy",      color: "#9A4E5B" },
  { id: "fertility",     label: "Fertility Specialist",             short: "Fertility",     color: "#B25A38" },
  { id: "endocrinology", label: "Endocrinologist",                  short: "Hormones",      color: "#3E6E8C" },
];

export const SPECIALTY_BY_ID = Object.fromEntries(SPECIALTIES.map((s) => [s.id, s]));
