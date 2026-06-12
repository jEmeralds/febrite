# FeBrite

**Fe**minine + **Brite** — a holistic, stage-aware wellness home for women.
Seven professional lenses (gynaecology, general medicine, psychiatry, psychology, nutrition, movement, life) woven into one app that adapts its content **and its colour theme** to the user's age bracket and the topic they're reading.

## Stack
- **Frontend:** Vite + React, lazy-loaded feature routes, dynamic CSS-variable theming, installable PWA, cookie consent. Deploy to **Vercel**.
- **Backend:** Node/Express companion endpoint (proxies the Anthropic API, runs crisis guardrails). Deploy to **Railway**.
- **Data + Auth:** Supabase Postgres with row-level security (`supabase/schema.sql`).

## Run it locally
```bash
npm install
npm run dev            # http://localhost:5173
```
It runs immediately on built-in seed content — no backend or database required to see the whole app.

### Optional: live AI companion
```bash
cd server && npm install
cp .env.example .env   # add ANTHROPIC_API_KEY
npm run dev            # http://localhost:8080
```
Then set `VITE_API_URL=http://localhost:8080/api` in a root `.env`. Without it, the companion uses a safe local fallback.

### Optional: connect Supabase
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (creates tables, RLS, seeds the 7 domains).
3. Copy `.env.example` → `.env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## What works today
- Onboarding → 5 life stages, each re-themes the whole app.
- Library (lazy-loaded) with domain + stage filters → full article reader.
- AI companion with crisis-escalation guardrail (local or live).
- Holistic daily check-in (mood, sleep, water, movement, cycle, symptoms) + trend.
- Care Team, Support resources.
- Installable (PWA) + cookie consent.

## Project structure
```
src/
  theme/        tokens.js + ThemeProvider (age × topic → CSS variables)
  data/         content.js (seed: domains, stages, articles, care team, resources)
  lib/          supabase.js, consent.js, api.js (companion w/ fallback)
  pwa/          useInstallPrompt.js
  components/   ui.jsx (primitives), Overlays.jsx (cookie/install/theme chip)
  features/     Onboarding, Home, Library, Article, Companion, Tracking, CareTeam, Resources
  app/          Shell.jsx (nav, routing-by-state, lazy loading)
server/         Express companion endpoint (Railway)
supabase/       schema.sql
```

## Build order (next steps)
1. Auth + onboarding writes `life_stage` to `profiles`.
2. Library reads `content` from Supabase instead of seed data.
3. Tracking upserts daily check-ins (`tracking_entries`).
4. Companion endpoint adds retrieval over `content`.
5. Phase 2: flip `role='professional'`, fill `professionals`, add booking/payments **only when that screen is built**.

## Notes
- Content authors/credentials here are **illustrative**. A live product needs a real clinical board to author and sign off every article.
- Crisis detection is keyword-based — production needs more robust detection plus clinical review.
