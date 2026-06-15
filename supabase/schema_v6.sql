-- FeBrite schema v6
-- Voices from the Community: curated peer experiences from women in
-- different life stages. Submissions land as 'pending' and become
-- 'published' after admin review (you, via Supabase dashboard).
--
-- Why this exists rather than free-form chat:
-- - Lower moderation surface (review before publish, not after)
-- - No real-time infrastructure needed
-- - Empty-room problem solved by seed content
-- - Delivers the actual value of community (peer wisdom, "I'm not alone")
--   without the harassment / silence failure modes of open chat.

-- =================== TABLE ===================
create table if not exists public.community_voices (
  id            uuid primary key default gen_random_uuid(),
  stage         text not null check (stage in ('teen','young','mid','meno','elder')),
  topic         text not null check (topic in ('gynae','medical','psychiatry','psychology','nutrition','fitness','life')),
  title         text not null,
  body          text not null,
  author_label  text,                          -- e.g. "Maya, 28, young"
  status        text not null default 'pending' check (status in ('pending','published','rejected')),
  submitted_by  uuid references auth.users(id) on delete set null,
  submitted_at  timestamptz not null default now(),
  published_at  timestamptz,
  admin_note    text                           -- optional reason if rejected
);

create index if not exists idx_voices_published
  on public.community_voices (stage, topic, published_at desc)
  where status = 'published';

create index if not exists idx_voices_pending
  on public.community_voices (submitted_at desc)
  where status = 'pending';

-- =================== RLS ===================
alter table public.community_voices enable row level security;

-- Anyone authenticated can read published voices
drop policy if exists "voices_read_published" on public.community_voices;
create policy "voices_read_published"
  on public.community_voices
  for select
  to authenticated
  using (status = 'published');

-- Anyone authenticated can read their own submissions (any status)
-- so they can see "your submission is pending" later if we add that UI
drop policy if exists "voices_read_own" on public.community_voices;
create policy "voices_read_own"
  on public.community_voices
  for select
  to authenticated
  using (submitted_by = auth.uid());

-- Authenticated users can submit, but ONLY as pending and only attributed
-- to themselves. They cannot self-publish.
drop policy if exists "voices_submit" on public.community_voices;
create policy "voices_submit"
  on public.community_voices
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
  );

-- =================== SEED VOICES (20) ===================
-- These are written as authentic-feeling testimonials covering all five
-- life stages and varied topics. They're seed content — submitted_by is
-- NULL because no real user submitted them. Treat them as a starting
-- corpus you can edit, replace, or remove via Supabase dashboard.

insert into public.community_voices (stage, topic, title, body, author_label, status, published_at) values

-- TEEN
('teen', 'gynae', 'My first period was nothing like what they said in school',
 'I thought I''d know it was coming. Spoiler: I didn''t. It just showed up. The cramping that first day was sharper than anyone described. What helped: a heating pad on low, the most basic ibuprofen, and texting my older sister who told me "yes this is normal, also yes it''s annoying, also you''ll find your rhythm." She was right on all three.',
 'Maya, 16, teen', 'published', now()),

('teen', 'psychology', 'Mood swings before my period made me think something was wrong',
 'Honestly I thought I was losing it. One day I felt fine, the next I cried at a YouTube ad. I asked my mum and she said "welcome to the next 30 years." It helped to name it. I track now, and the days before my period make so much more sense in context.',
 'Aisha, 17, teen', 'published', now()),

('teen', 'life', 'Going to school during my period felt like a secret mission',
 'For ages I was terrified of staining my uniform or running out of supplies in the middle of math. I now keep a small pouch in my backpack — pad, panty liner, painkiller, a snack — and just having it makes me less anxious all day. Practical things matter.',
 'Wanjiku, 15, teen', 'published', now()),

('teen', 'fitness', 'I stopped skipping sports during my period and felt better, not worse',
 'For two years I''d skip practice on heavy days. Then a coach explained that gentle movement actually helps cramps for most people. Now I go and just take it easier — water, stretches, fewer sprints. I feel more in my body, not less. Some days I do skip, and that''s fine too.',
 'Tamara, 16, teen', 'published', now()),

-- YOUNG
('young', 'gynae', 'I assumed my cycle would be regular forever. Then stress hit.',
 'I had clockwork 28-day cycles through my early 20s. Then I started a demanding job, didn''t sleep enough, lost some weight without meaning to, and my cycle went haywire — twice I skipped a month entirely. My doctor reminded me that stress and weight changes directly affect cycles. It came back when life calmed down.',
 'Leila, 27, young', 'published', now()),

('young', 'psychiatry', 'I didn''t know my anxiety could be tied to my cycle',
 'I always thought my anxiety was just "me." Then I started tracking, and saw that the worst days were the week before my period. Every single time. My therapist called it premenstrual dysphoric disorder once we ruled other things out. Knowing this didn''t fix it, but it stopped me from blaming myself for the bad weeks.',
 'Sara, 29, young', 'published', now()),

('young', 'nutrition', 'What I eat actually changes how my luteal week feels',
 'I used to crash hard on cramps day 1. Then I started adding more iron the week before — leafy greens, beans, the occasional liver — and the cramps softened. I''m not saying food is a cure but for me, paying attention to what I eat in the second half of my cycle made a real difference.',
 'Amani, 26, young', 'published', now()),

('young', 'fitness', 'Heavy lifting in my follicular phase, gentle yoga in luteal',
 'I used to push hard at the gym all month and wonder why I felt broken by the end of every cycle. A trainer told me about cycle-syncing. I lift heavier in the follicular and ovulation weeks, then dial down to yoga and walks in luteal. Same total movement, much less burnout.',
 'Khadija, 31, young', 'published', now()),

('young', 'life', 'Telling my partner about my cycle changed our relationship',
 'For years I''d just snap at him in luteal and apologize later. We had the most awkward conversation about it — "in about a week I''ll feel less patient, please don''t take it personally" — and it''s been one of the most useful things I''ve ever done. He''s gentler. I''m gentler. It''s not magic but it helps.',
 'Priya, 30, young', 'published', now()),

-- MID
('mid', 'gynae', 'My 30s cycles aren''t the same as my 20s. That''s normal.',
 'My cycle shifted from 28 days like clockwork to anywhere between 26 and 31 days. At first I panicked. My GP said "your body is recalibrating, this is what most women in their late 30s experience." Knowing that quieted the fear. I track variations now without spiraling about them.',
 'Beatrice, 38, mid', 'published', now()),

('mid', 'life', 'Caring for kids and aging parents at the same time broke me before I named it',
 'No one tells you the sandwich years are real. I was holding work, two kids under 10, and a mum with early dementia. I kept thinking "I should be coping." A friend said: "you''re not failing. You''re carrying too much." That sentence changed something. I started actually asking people to take things off my plate.',
 'Nadia, 41, mid', 'published', now()),

('mid', 'psychology', 'I started therapy at 36 and wish I''d started at 26',
 'I thought therapy was for crisis. Turns out it''s also for learning how to actually live with the version of yourself that came out of your 20s. I have language for things now — boundaries, regulation, the pattern I keep repeating with my mother — that I didn''t have before. Worth it.',
 'Ifeoma, 39, mid', 'published', now()),

('mid', 'medical', 'Persistent fatigue at 35 turned out to be thyroid',
 'I''d been exhausted for almost a year and chalked it up to "just life with two kids." A blood test for something unrelated caught it: my thyroid was underactive. Medication helped within weeks. Lesson I keep telling friends: chronic fatigue isn''t always lifestyle. Get the basics tested.',
 'Diana, 37, mid', 'published', now()),

-- MENO
('meno', 'gynae', 'Perimenopause started earlier than I expected',
 'I''m 44 and assumed I had at least a decade before menopause stuff would matter. Then my cycles started skipping, my sleep cracked, and I had two months of mystery anxiety. My doctor said "this is perimenopause" and I was honestly relieved to have a name. It''s a long road but at least I know what road I''m on.',
 'Grace, 44, meno', 'published', now()),

('meno', 'medical', 'Hot flashes aren''t just hot. They''re disorienting.',
 'No one explained how disorienting a hot flash is — not just heat but sometimes a wave of anxiety with it. What helps me: cool layers, less caffeine after lunch, telling the people I work with so they know I''m not having a moment for no reason. Naming it to others is half the relief.',
 'Mei, 49, meno', 'published', now()),

('meno', 'fitness', 'Strength training in my late 40s changed everything',
 'I never lifted weights in my 20s or 30s. Started in my 40s when my doctor warned me about bone density. Two years in, I sleep better, my mood is steadier, and I feel strong for the first time in my life. Wish I''d started 20 years ago — but starting now still works.',
 'Ruth, 48, meno', 'published', now()),

('meno', 'psychology', 'My mood swings in perimenopause felt like a different person',
 'I am not a crier. Then for about six months I cried at advertisements. My therapist and I worked through it as a hormonal-shift response, not a personality change. It passed. I share this because if you''re going through it, you''re not losing yourself — your hormones are recalibrating and so are you.',
 'Ngozi, 51, meno', 'published', now()),

-- ELDER
('elder', 'life', 'Connection matters more than any supplement I''ve ever taken',
 'I''m 67. I take care of my health — walking, decent sleep, eating reasonably — but the single biggest difference between my good years and hard ones has been who I''m talking to. Loneliness is a health condition. I call my old friends every week, not because I have to but because it''s medicine.',
 'Margaret, 67, elder', 'published', now()),

('elder', 'medical', 'Any bleeding after menopause needs a doctor — no exceptions',
 'I had a small spot of bleeding two years after my last period. I almost ignored it. A nurse friend told me firmly: any post-menopausal bleeding gets checked. It turned out to be benign but I had a friend whose similar bleeding turned out to be early endometrial cancer, caught in time. Please don''t wait.',
 'Hannah, 64, elder', 'published', now()),

('elder', 'fitness', 'Walking is underrated as you get older',
 'I''m 71 and I walk every day. Not far, not fast — sometimes just around the block twice. My doctor says it''s done more for my balance, bone density, and mood than any pill she could prescribe. The bar is so much lower than people think.',
 'Esther, 71, elder', 'published', now()),

('elder', 'nutrition', 'Protein matters more than I realized',
 'No one told me how much harder muscle gets to keep as you age, and how much it depends on getting enough protein. I add some at every meal now — eggs at breakfast, fish or chicken or beans at lunch. The difference in how I feel after a year is real.',
 'Joan, 69, elder', 'published', now()),

('elder', 'psychology', 'Grieving my husband took longer than anyone said it would',
 'My husband passed five years ago and I''m still finding new corners of the grief. People mean well when they say "give it time," but time alone doesn''t do the work — sitting with it does. The hardest year was the third, not the first. I share this for anyone in their hardest year, whichever year that turns out to be.',
 'Catherine, 73, elder', 'published', now());
