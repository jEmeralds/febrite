import { supabase, hasSupabase } from "./supabase";

/* Data layer for the practitioners table. The catalogue of specialties and
   AI resources lives in src/data/ — this file is just CRUD. */

export async function getPractitionerByUserId(userId) {
  if (!hasSupabase || !userId) return null;
  const { data, error } = await supabase
    .from("practitioners").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("getPractitioner", error); return null; }
  return data;
}

/* Public getter for the profile page — RLS only returns verified rows. */
export async function getPractitioner(id) {
  if (!hasSupabase || !id) return null;
  const { data, error } = await supabase
    .from("practitioners").select("*").eq("id", id).maybeSingle();
  if (error) { console.error("getPractitioner", error); return null; }
  return data;
}

export async function upsertPractitioner(userId, patch) {
  if (!hasSupabase) throw new Error("Database not connected");
  const { data, error } = await supabase
    .from("practitioners")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function listVerifiedPractitioners({ specialty = null, limit = 24 } = {}) {
  if (!hasSupabase) return [];
  let q = supabase.from("practitioners").select("*")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (specialty) q = q.eq("specialty", specialty);
  const { data, error } = await q;
  if (error) { console.error("listPractitioners", error); return []; }
  return data || [];
}

/* "Is this practitioner ready to be reviewed?" — gates whether we land them on /pro/setup or /pro/status. */
export function isPractitionerProfileComplete(p) {
  if (!p) return false;
  return !!(p.display_name && p.specialty && p.bio && p.registration_number && p.location);
}
