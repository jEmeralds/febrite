import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create a real client when configured; the app runs on seed data otherwise.
export const supabase = url && key ? createClient(url, key) : null;
export const hasSupabase = !!supabase;
