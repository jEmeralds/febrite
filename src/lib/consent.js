const KEY = "febrite_consent";

export function getConsent() {
  const m = document.cookie.split("; ").find((c) => c.startsWith(KEY + "="));
  return m ? m.split("=")[1] : null;
}

export function setConsent(val) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${KEY}=${val}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  if (val === "all") loadAnalytics();
}

function loadAnalytics() {
  // Inject analytics ONLY after explicit consent. Left intentionally empty.
}
