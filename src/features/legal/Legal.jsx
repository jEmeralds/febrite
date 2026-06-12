import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { C } from "../../theme/tokens";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "FeBrite is built privacy-first. We collect only what's needed to provide your care experience: your account details, the life stage and preferences you choose, and the wellness entries you create.",
      "Your health-related data is encrypted and protected by row-level security, meaning only you can access your own records. We never sell your data, and analytics run only with your explicit consent.",
      "You can export or permanently delete your data at any time from Settings. This is a starting template — a production launch requires review by a qualified data-protection professional for the regions you operate in.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "By using FeBrite you agree to use it for personal wellness and informational purposes. FeBrite supports your wellbeing but does not provide medical diagnosis or treatment.",
      "You're responsible for keeping your account secure. We may update features and these terms over time, and we'll surface material changes in the app.",
      "This is a starting template and should be reviewed by legal counsel before launch.",
    ],
  },
  disclaimer: {
    title: "Medical Disclaimer",
    body: [
      "FeBrite provides general, evidence-informed wellness information and supportive tools. It is not a substitute for professional medical advice, diagnosis, or treatment.",
      "Always seek the advice of a qualified health provider with any questions about a medical condition. Never disregard professional advice or delay seeking it because of something you read here.",
      "If you think you may have a medical emergency, contact your local emergency services immediately. If you are in crisis, the Support section lists help lines staffed by trained people.",
    ],
  },
};

export default function Legal() {
  const { doc } = useParams();
  const d = DOCS[doc] || DOCS.privacy;
  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 24px 80px" }}>
        <Link to="/" style={{ display:"inline-flex", alignItems:"center", gap:6, color:C.inkSoft, fontSize:14, textDecoration:"none", marginBottom:20 }}><ArrowLeft size={16}/> Home</Link>
        <h1 style={{ fontFamily:"Fraunces, serif", fontWeight:400, fontSize:"clamp(28px,6vw,38px)", margin:"0 0 8px" }}>{d.title}</h1>
        <p style={{ fontSize:13, color:C.inkSoft, marginBottom:24 }}>Last updated {new Date().toLocaleDateString()}</p>
        {d.body.map((p,i)=>(<p key={i} style={{ fontSize:16, lineHeight:1.7, color:C.ink, marginBottom:18 }}>{p}</p>))}
        <div style={{ marginTop:24, display:"flex", gap:16, fontSize:14 }}>
          <Link to="/legal/privacy" style={{ color:C.clay }}>Privacy</Link>
          <Link to="/legal/terms" style={{ color:C.clay }}>Terms</Link>
          <Link to="/legal/disclaimer" style={{ color:C.clay }}>Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
