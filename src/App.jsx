import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider, useAuth } from "./lib/auth";
import { C } from "./theme/tokens";

import Landing from "./features/marketing/Landing";
import Signup from "./features/auth/Signup";
import Login from "./features/auth/Login";
import CheckEmail from "./features/auth/CheckEmail";
import AuthCallback from "./features/auth/AuthCallback";
import Welcome from "./features/auth/Welcome";
import Settings from "./features/settings/Settings";
import Profile from "./features/profile/Profile";
import JoinAsPro from "./features/practitioners/JoinAsPro";
import ProSetup from "./features/practitioners/ProSetup";
import ProStatus from "./features/practitioners/ProStatus";
import PractitionerProfile from "./features/practitioners/PractitionerProfile";
import Legal from "./features/legal/Legal";
import Shell from "./app/Shell";

function Splash() {
  return <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:C.cream, color:C.inkSoft, fontFamily:"Karla, sans-serif" }}>Loading…</div>;
}

// Gate app routes behind authentication.
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash/>;
  if (!user) return <Navigate to="/login" replace/>;
  return children;
}

// Send users to /welcome only if their loaded profile has no stage.
// Critical: wait until profile.id matches user.id, otherwise we redirect
// off the back of a stale (or null) profile while the fetch is in flight.
function RequireStage({ children }) {
  const { user, profile, loading, profileLoading } = useAuth();
  if (loading) return <Splash/>;
  if (!user) return <Navigate to="/login" replace/>;
  // Pros don't belong in /app — bounce to their dashboard.
  if (user.user_metadata?.is_pro === true) return <Navigate to="/pro/status" replace/>;
  // We haven't finished loading this user's profile yet.
  if (profileLoading || !profile || profile.id !== user.id) return <Splash/>;
  if (!profile.life_stage) return <Navigate to="/welcome" replace/>;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/signup" element={<Signup/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/check-email" element={<CheckEmail/>}/>
          <Route path="/auth/callback" element={<AuthCallback/>}/>
          <Route path="/legal/:doc" element={<Legal/>}/>
          <Route path="/welcome" element={<Protected><Welcome/></Protected>}/>
          <Route path="/profile" element={<Protected><Profile/></Protected>}/>
          <Route path="/settings" element={<Protected><Settings/></Protected>}/>
          <Route path="/join-as-pro" element={<JoinAsPro/>}/>
          <Route path="/pro/setup" element={<Protected><ProSetup/></Protected>}/>
          <Route path="/pro/status" element={<Protected><ProStatus/></Protected>}/>
          <Route path="/practitioner/:id" element={<PractitionerProfile/>}/>
          <Route path="/app" element={<Protected><RequireStage><Shell/></RequireStage></Protected>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
