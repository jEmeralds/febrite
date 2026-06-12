import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { upsertPractitioner, getPractitionerByUserId } from "../../lib/practitioners";
import { SPECIALTIES } from "../../data/specialties";
import { C } from "../../theme/tokens";
import { PageHeader } from "../../components/Logo";

export default function ProSetup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    display_name: "", credentials: "", specialty: "", bio: "",
    registration_number: "", registration_authority: "",
    years_practising: "", location: "",
    languages: ["English"], languagesDraft: "",
    fee_model: "probono", hourly_rate_kes: "", probono_slots_per_month: "",
    contact_email: "", contact_phone: "", website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await getPractitionerByUserId(user.id);
      if (p) {
        setForm((f) => ({
          ...f,
          display_name: p.display_name || "",
          credentials: p.credentials || "",
          specialty: p.specialty || "",
          bio: p.bio || "",
          registration_number: p.registration_number || "",
          registration_authority: p.registration_authority || "",
          years_practising: p.years_practising ?? "",
          location: p.location || "",
          languages: p.languages?.length ? p.languages : ["English"],
          fee_model: p.fee_model || "probono",
          hourly_rate_kes: p.hourly_rate_kes ?? "",
          probono_slots_per_month: p.probono_slots_per_month ?? "",
          contact_email: p.contact_email || user.email || "",
          contact_phone: p.contact_phone || "",
          website: p.website || "",
        }));
      } else {
        setForm((f) => ({ ...f, contact_email: user.email || "" }));
      }
      setLoading(false);
    })();
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addLanguage = () => {
    const v = (form.languagesDraft || "").trim();
    if (!v) return;
    if (!form.languages.includes(v)) set("languages", [...form.languages, v]);
    set("languagesDraft", "");
  };

  const submit = async () => {
    setErr("");
    if (!form.display_name.trim()) return setErr("Please enter your full name.");
    if (!form.specialty) return setErr("Please pick your primary specialty.");
    if (!form.bio.trim() || form.bio.length < 60) return setErr("Please write a short bio (at least 60 characters).");
    if (!form.registration_number.trim()) return setErr("Registration number is required for verification.");
    if (!form.registration_authority.trim()) return setErr("Which professional body issued your registration?");
    if (!form.location.trim()) return setErr("Please tell us where you're based.");
    if (form.fee_model !== "probono" && !form.hourly_rate_kes) return setErr("Please set your hourly rate (KES).");

    setSaving(true);
    try {
      await upsertPractitioner(user.id, {
        display_name: form.display_name.trim(),
        credentials: form.credentials.trim() || null,
        specialty: form.specialty,
        bio: form.bio.trim(),
        registration_number: form.registration_number.trim(),
        registration_authority: form.registration_authority.trim(),
        years_practising: form.years_practising ? Number(form.years_practising) : null,
        location: form.location.trim(),
        languages: form.languages,
        fee_model: form.fee_model,
        hourly_rate_kes: form.fee_model === "probono" ? null : Number(form.hourly_rate_kes),
        probono_slots_per_month: form.fee_model === "mixed" && form.probono_slots_per_month ? Number(form.probono_slots_per_month) : null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        website: form.website.trim() || null,
      });
      nav("/pro/status", { replace: true });
    } catch (e) {
      setErr(e.message || "Couldn't save your application.");
    } finally { setSaving(false); }
  };

  if (loading) return <Wrap><p style={{ color:C.inkSoft }}>Loading…</p></Wrap>;

  return (
    <Wrap>
      <button onClick={()=>nav(-1)} style={backBtn}><ArrowLeft size={15}/> Back</button>
      <div style={{ fontSize:12, letterSpacing:".1em", textTransform:"uppercase", color:C.clay, fontWeight:700, marginBottom:8 }}>Application · Step 2 of 2</div>
      <h1 style={{ fontFamily:"Fraunces, serif", fontSize:"clamp(26px,5vw,34px)", color:C.ink, margin:"0 0 8px", lineHeight:1.15 }}>Your professional profile</h1>
      <p style={{ fontSize:15, color:C.inkSoft, lineHeight:1.6, margin:"0 0 24px" }}>
        This is what users will see — and what our editorial team uses to verify you. Be specific; vague applications take longer.
      </p>

      <Section title="Identity & specialty">
        <div style={grid2}>
          <TextField label="Full name (as on registration)" value={form.display_name} onChange={(v)=>set("display_name",v)} placeholder="e.g. Dr Amani Mwangi"/>
          <TextField label="Credentials (post-nominals)" value={form.credentials} onChange={(v)=>set("credentials",v)} placeholder="e.g. MD, MMed"/>
          <SelectField label="Primary specialty" value={form.specialty} onChange={(v)=>set("specialty",v)} options={SPECIALTIES.map((s)=>({value:s.id,label:s.label}))}/>
          <TextField label="Where are you based?" value={form.location} onChange={(v)=>set("location",v)} placeholder="e.g. Nairobi, Kenya"/>
        </div>
        <TextArea label="Short bio · what you focus on, your approach" value={form.bio} onChange={(v)=>set("bio",v)} rows={4} placeholder="e.g. I'm an OB-GYN with 12 years' experience and a special interest in PCOS and perimenopause. I work bilingually in English and Kiswahili."/>
        <div style={{ fontSize:12, color:C.inkSoft, marginTop:-6 }}>{(form.bio || "").length}/600 · minimum 60</div>
      </Section>

      <Section title="Verification">
        <div style={grid2}>
          <TextField label="Registration number" value={form.registration_number} onChange={(v)=>set("registration_number",v)} placeholder="e.g. KMPDC-1234"/>
          <TextField label="Issuing body" value={form.registration_authority} onChange={(v)=>set("registration_authority",v)} placeholder="e.g. Kenya Medical Practitioners and Dentists Council"/>
          <TextField label="Years practising" type="number" value={form.years_practising} onChange={(v)=>set("years_practising",v)}/>
        </div>
        <div>
          <label style={lblStyle}>Languages you practise in</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
            {form.languages.map((l,i)=>(
              <span key={l} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:`${C.clay}1A`, color:C.clay, fontSize:13, fontWeight:600 }}>
                {l} <button onClick={()=>set("languages", form.languages.filter((_,k)=>k!==i))} style={{ background:"none", border:"none", cursor:"pointer", color:C.clay }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <input style={inpStyle} value={form.languagesDraft} onChange={(e)=>set("languagesDraft", e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&(e.preventDefault(), addLanguage())} placeholder="e.g. Kiswahili"/>
            <button onClick={addLanguage} style={addBtn}>Add</button>
          </div>
        </div>
      </Section>

      <Section title="How you'd like to offer your time">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(180px,100%),1fr))", gap:10, marginBottom:14 }}>
          <FeeOption value="probono" current={form.fee_model} onPick={(v)=>set("fee_model",v)} title="Pro-bono only" desc="Free sessions. No fee to FeBrite."/>
          <FeeOption value="mixed"   current={form.fee_model} onPick={(v)=>set("fee_model",v)} title="Mixed" desc="Some free slots, some paid. Discounted FeBrite fee."/>
          <FeeOption value="paid"    current={form.fee_model} onPick={(v)=>set("fee_model",v)} title="Paid only" desc="Standard FeBrite fee (15% per paid session)."/>
        </div>
        {form.fee_model !== "probono" && (
          <div style={grid2}>
            <TextField label="Hourly rate (KES)" type="number" value={form.hourly_rate_kes} onChange={(v)=>set("hourly_rate_kes",v)} placeholder="e.g. 4500"/>
            {form.fee_model === "mixed" && (
              <TextField label="Pro-bono slots per month" type="number" value={form.probono_slots_per_month} onChange={(v)=>set("probono_slots_per_month",v)} placeholder="e.g. 4"/>
            )}
          </div>
        )}
      </Section>

      <Section title="Contact (optional)">
        <p style={{ fontSize:12.5, color:C.inkSoft, marginTop:-6, marginBottom:10 }}>Hidden from users until you accept a session. Used by our team for verification.</p>
        <div style={grid2}>
          <TextField label="Contact email" type="email" value={form.contact_email} onChange={(v)=>set("contact_email",v)}/>
          <TextField label="Phone" value={form.contact_phone} onChange={(v)=>set("contact_phone",v)}/>
          <TextField label="Website" value={form.website} onChange={(v)=>set("website",v)} placeholder="https://"/>
        </div>
      </Section>

      {err && <div style={{ fontSize:13.5, color:"#B23A3A", background:"#FBEDED", padding:"10px 13px", borderRadius:10, marginBottom:14, display:"flex", gap:8, alignItems:"center" }}><AlertCircle size={16}/> {err}</div>}

      <button onClick={submit} disabled={saving} style={{
        display:"inline-flex", alignItems:"center", gap:8, padding:"12px 22px", borderRadius:12, border:"none",
        background: C.clay, color:"#fff", fontSize:15, fontWeight:600, cursor: saving ? "default" : "pointer",
        fontFamily:"Karla, sans-serif", opacity: saving ? .7 : 1,
      }}>
        {saving ? "Submitting…" : <><Save size={16}/> Submit for verification</>}
      </button>
    </Wrap>
  );
}

const Wrap = ({ children }) => (
  <div style={{ minHeight:"100vh", background: C.cream, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
    <div style={{ maxWidth:760, margin:"0 auto", padding:"40px 22px 80px" }}>{children}</div>
  </div>
);
const backBtn = { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:14, fontFamily:"Karla, sans-serif" };
const inpStyle = { padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff", fontSize:14.5, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif", width:"100%" };
const lblStyle = { fontSize:13, fontWeight:600, color:C.ink, marginBottom:6, display:"block" };
const grid2 = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(220px,100%),1fr))", gap:12, marginBottom:12 };
const addBtn = { padding:"0 14px", borderRadius:10, border:`1px solid ${C.line}`, background:"transparent", cursor:"pointer", color:C.ink, fontSize:14, fontFamily:"Karla, sans-serif" };

const Section = ({ title, children }) => (
  <div style={{ background:"#fff", border:`1px solid ${C.line}`, borderRadius:16, padding:"18px 18px 16px", marginBottom:14 }}>
    <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, marginBottom:14 }}>{title}</div>
    {children}
  </div>
);
const TextField = ({ label, value, onChange, type="text", placeholder }) => (
  <div><label style={lblStyle}>{label}</label><input type={type} value={value ?? ""} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={inpStyle}/></div>
);
const TextArea = ({ label, value, onChange, rows, placeholder }) => (
  <div><label style={lblStyle}>{label}</label><textarea value={value ?? ""} onChange={(e)=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...inpStyle, resize:"vertical", fontFamily:"inherit" }} maxLength={600}/></div>
);
const SelectField = ({ label, value, onChange, options }) => (
  <div><label style={lblStyle}>{label}</label><select value={value ?? ""} onChange={(e)=>onChange(e.target.value)} style={inpStyle}><option value="">—</option>{options.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
);
function FeeOption({ value, current, onPick, title, desc }) {
  const active = value === current;
  return (
    <button onClick={()=>onPick(value)} style={{
      textAlign:"left", padding:"14px 14px", borderRadius:12, cursor:"pointer",
      border: `2px solid ${active ? C.clay : C.line}`,
      background: active ? `${C.clay}10` : "#fff",
      fontFamily:"Karla, sans-serif",
    }}>
      <div style={{ fontWeight:700, color:C.ink, fontSize:14, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
        {active && <Check size={14} style={{ color:C.clay }}/>}{title}
      </div>
      <div style={{ fontSize:12.5, color:C.inkSoft, lineHeight:1.45 }}>{desc}</div>
    </button>
  );
}
