import { useEffect, useState } from "react";

/* usePreference
   ----------------------------------------------------------------
   Per-device preference, persisted in localStorage. Used for
   accessibility-style toggles that should stay local to a device
   and respond instantly (not roundtrip to Supabase).

   Keys are prefixed with `febrite:pref:` so they're easy to find
   if a user ever clears settings manually. */
export function usePreference(key, defaultValue) {
  const fullKey = `febrite:pref:${key}`;
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = localStorage.getItem(fullKey);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch { return defaultValue; }
  });

  useEffect(() => {
    try { localStorage.setItem(fullKey, JSON.stringify(value)); }
    catch { /* quota, private browsing, etc */ }
  }, [fullKey, value]);

  return [value, setValue];
}

/* Convenience helpers for the prefs we currently use. Keep this
   small — add specific helpers only when they're shared in 2+ places.
   For one-off toggles, use usePreference directly. */
export const useReduceMotionPref = () => usePreference("reduce_motion", false);
