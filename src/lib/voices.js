import { supabase } from "./supabase";

/* fetchVoices
   ----------------------------------------------------------------
   Returns published voices filtered by stage and (optionally) topic.
   Most recent first. Caps at 6 unless otherwise specified.

   Why filter by stage: a 16-year-old reading the perimenopause grief
   piece by a 67-year-old isn't peer wisdom — it's a misplaced match.
   We filter to her stage so what she sees is from women like her.

   If a topic is set, we filter to that topic, but if fewer than 3
   voices match (because the seed corpus is small), we widen back to
   all topics for the same stage. Better one good voice than no voices. */
export async function fetchVoices({ stage, topic = null, limit = 6 }) {
  if (!supabase || !stage) return [];

  const tryQuery = async (withTopic) => {
    let q = supabase
      .from("community_voices")
      .select("*")
      .eq("status", "published")
      .eq("stage", stage)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (withTopic && topic) q = q.eq("topic", topic);
    const { data, error } = await q;
    if (error) {
      console.error("voices fetch", error);
      return [];
    }
    return data || [];
  };

  let voices = await tryQuery(true);
  if (topic && voices.length < 3) {
    // Widen back to all topics for this stage so the section isn't sparse
    voices = await tryQuery(false);
  }
  return voices;
}

/* submitVoice
   ----------------------------------------------------------------
   Inserts a new pending submission. RLS only allows submissions
   attributed to the calling user and status='pending', so the
   user can never self-publish. The admin (you) reviews via the
   Supabase dashboard and flips status to 'published' (or 'rejected'). */
export async function submitVoice({ userId, stage, topic, title, body, authorLabel }) {
  if (!supabase) return { error: "Not configured" };
  if (!userId)   return { error: "You need to be signed in to share a story." };
  if (!stage || !topic || !title?.trim() || !body?.trim()) {
    return { error: "Title, story, stage, and topic are all needed." };
  }
  const { error } = await supabase.from("community_voices").insert({
    submitted_by: userId,
    stage,
    topic,
    title: title.trim().slice(0, 120),
    body: body.trim().slice(0, 1200),
    author_label: (authorLabel || "").trim().slice(0, 60) || null,
    status: "pending",
  });
  if (error) {
    console.error("voice submit", error);
    return { error: error.message || "Couldn't submit. Try again in a moment." };
  }
  return { ok: true };
}
