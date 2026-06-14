import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, hasSupabase } from "./supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const LS_USER = "febrite_demo_user";
const LS_PROFILE = "febrite_demo_profile";

/* Auth provider:
   - Uses Supabase auth when VITE_SUPABASE_* is configured.
   - Falls back to a local demo mode (localStorage) so the app is fully
     usable in development with no backend. Clearly labelled in the UI. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // ---- load session ----
  useEffect(() => {
    let active = true;
    async function init() {
      if (hasSupabase) {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setUser(data.session?.user ?? null);
        if (data.session?.user) await loadProfile(data.session.user.id);
        supabase.auth.onAuthStateChange((_e, session) => {
          setUser(session?.user ?? null);
          if (session?.user) loadProfile(session.user.id);
          else setProfile(null);
        });
      } else {
        const u = JSON.parse(localStorage.getItem(LS_USER) || "null");
        const p = JSON.parse(localStorage.getItem(LS_PROFILE) || "null");
        setUser(u); setProfile(p);
      }
      setLoading(false);
    }
    init();
    return () => { active = false; };
  }, []);

  const loadProfile = useCallback(async (id) => {
    if (!hasSupabase) return;
    setProfileLoading(true);
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(data || null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ---- actions ----
  const signUp = async ({ email, password, name }) => {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { display_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;     // { user, session } — session is null when email confirmation is on
    }
    const u = { id: "demo-" + Date.now(), email };
    const p = { id: u.id, display_name: name, life_stage: null, region: "", focus_areas: [] };
    localStorage.setItem(LS_USER, JSON.stringify(u));
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    setUser(u); setProfile(p);
    return { user: u, session: { user: u } };   // demo mode always "signed in"
  };

  const resendConfirmation = async (email) => {
    if (!hasSupabase) return { ok: true };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return { ok: true };
  };

  // Practitioners sign up with is_pro=true so the DB trigger creates a
  // practitioners row instead of a profiles row.
  const signUpAsPro = async ({ email, password, name }) => {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { display_name: name, is_pro: true },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
    }
    // Demo mode: same as user signup but tagged
    const u = { id: "demo-pro-" + Date.now(), email, is_pro: true };
    localStorage.setItem(LS_USER, JSON.stringify(u));
    setUser(u);
    return { user: u, session: { user: u } };
  };

  const signIn = async ({ email, password }) => {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }
    let p = JSON.parse(localStorage.getItem(LS_PROFILE) || "null");
    const u = { id: p?.id || "demo-" + Date.now(), email };
    if (!p) { p = { id: u.id, display_name: email.split("@")[0], life_stage: null, region: "", focus_areas: [] }; }
    localStorage.setItem(LS_USER, JSON.stringify(u));
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    setUser(u); setProfile(p);
    return { user: u };
  };

  const signOut = async () => {
    if (hasSupabase) await supabase.auth.signOut();
    else { localStorage.removeItem(LS_USER); }
    setUser(null);
  };

  const updateProfile = async (patch) => {
    const next = { ...(profile || {}), ...patch };
    setProfile(next);
    if (hasSupabase && user) {
      await supabase.from("profiles").update(patch).eq("id", user.id);
    } else {
      localStorage.setItem(LS_PROFILE, JSON.stringify(next));
    }
    return next;
  };

  const deleteAccount = async () => {
    // Demo mode: wipe local. Supabase: call the SECURITY DEFINER RPC
    // we ship in schema_v5 — it deletes the auth.users row (cascading
    // to profiles + tracking_entries), then we sign out client-side.
    if (hasSupabase) {
      try {
        const { error } = await supabase.rpc("delete_my_account");
        if (error) throw error;
      } catch (e) {
        console.error("delete_my_account RPC failed", e);
        // Fall through to client-side cleanup so user isn't trapped.
      }
      await supabase.auth.signOut();
    }
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_PROFILE);
    setUser(null); setProfile(null);
  };

  return (
    <AuthCtx.Provider value={{
      user, profile, loading, profileLoading, isDemo: !hasSupabase,
      signUp, signUpAsPro, signIn, signOut, updateProfile, deleteAccount, resendConfirmation,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
