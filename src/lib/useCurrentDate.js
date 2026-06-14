import { useEffect, useState } from "react";

/* useCurrentDate
   ----------------------------------------------------------------
   Returns today's date as a YYYY-MM-DD string and updates it
   automatically when the calendar date changes — at midnight while
   the tab is open, or when the user returns to a tab they left open
   across a date boundary.

   Why this exists:
   - The Track tab caches "today's" entry by date. Without this
     hook, opening Track at 11pm and coming back at 12:05am still
     showed yesterday's check-in form as today.
   - The Home tab's daily read is cached by date in localStorage —
     when the date changes, the cache key changes and we want a new
     read to fetch automatically.

   Implementation:
   - Polls every 60 seconds (cheap, no setup cost)
   - Also checks on `visibilitychange` so date refreshes immediately
     when the user returns to the tab (most common real-world case) */
export function useCurrentDate() {
  const [date, setDate] = useState(() => todayString());

  useEffect(() => {
    const check = () => {
      const now = todayString();
      setDate((prev) => (prev === now ? prev : now));
    };

    const interval = setInterval(check, 60_000);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  return date;
}

/* Local-time date string, NOT UTC. Using toISOString().slice(0,10)
   would give the UTC date which is wrong for anyone east of GMT
   after their evening — e.g. a user in Nairobi (UTC+3) logging at
   11pm would have toISOString put them on "tomorrow" already. */
function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
