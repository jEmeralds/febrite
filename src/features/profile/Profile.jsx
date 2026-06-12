import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Target, Stethoscope, Pill, CalendarHeart, UsersRound,
  Dumbbell, Plus, X, Check, Save, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/ThemeProvider";
import { STAGES } from "../../data/content";
import { Card, SectionHead, C } from "../../components/ui";
import { PageHeader } from "../../components/Logo";

/* ============================================================
   The Bio / Profile page — built around progressive disclosure.
   Each section saves independently; nothing is forced upfront.
   ============================================================ */

export default function Profile() {
  const { profile, updateProfile, isDemo } = useAuth();
  const { accent } = useTheme();
  const nav = useNavigate();
  const stage = profile?.life_stage;
  const showCycle = stage && !["elder"].includes(stage);

  const filled = useMemo(() => completionMap(profile), [profile]);
  const completion = useMemo(() => {
    const keys = Object.keys(filled);
    const done = keys.filter((k) => filled[k]).length;
    return Math.round((done / keys.length) * 100);
  }, [filled]);

  if (!profile) return <div style={{ padding:40, color:C.inkSoft }}>Loading…</div>;

  const save = (patch) => updateProfile(patch);

  return (
    <div style={{ minHeight:"100vh", background:`radial-gradient(120% 70% at 100% -5%, ${accent}14, ${C.cream} 52%)`, fontFamily:"Karla, sans-serif", color:C.ink }}>
      <PageHeader/>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 20px 80px" }}>
        <button onClick={()=>nav(-1)} style={backBtn}><ArrowLeft size={16}/> Back</button>

        <SectionHead eyebrow="Owned by you · saved as you go" title="Your profile" accent={accent} style={{ marginBottom:14 }}/>
        <p style={{ fontSize:15, color:C.inkSoft, lineHeight:1.6, margin:"0 0 18px" }}>
          The more we know, the more FeBrite shapes itself to you. Fill in what feels right, skip what doesn't, come back any time — each section saves on its own.
        </p>

        {/* Progress */}
        <Card style={{ marginBottom:24, padding:"16px 18px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, fontWeight:600 }}>
              <span style={{ color:C.ink }}>Your profile</span>
              <span style={{ color:accent }}>{completion}% complete</span>
            </div>
            <div style={{ height:8, borderRadius:99, background:"rgba(44,35,32,.08)" }}>
              <div style={{ width:`${completion}%`, height:"100%", borderRadius:99, background:accent, transition:".5s" }}/>
            </div>
          </div>
        </Card>

        {isDemo && (
          <Card style={{ marginBottom:20, background:"rgba(118,135,106,.1)", borderColor:"rgba(118,135,106,.3)", fontSize:13, color:C.ink, lineHeight:1.55 }}>
            <ShieldCheck size={16} style={{ color:C.sage, marginBottom:4 }}/>
            <div><b style={{ color:C.sage }}>Demo mode.</b> Your data is saved only in this browser. Once Supabase is connected, everything you enter here is encrypted and syncs to your account.</div>
          </Card>
        )}

        <AboutYou      profile={profile} save={save} accent={accent} done={filled.about}/>
        <StageGoals    profile={profile} save={save} accent={accent} done={filled.stage}/>
        <Health        profile={profile} save={save} accent={accent} done={filled.health}/>
        <Medications   profile={profile} save={save} accent={accent} done={filled.meds}/>
        {showCycle && <Cycle profile={profile} save={save} accent={accent} done={filled.cycle}/>}
        <Support       profile={profile} save={save} accent={accent} done={filled.support}/>
        <Lifestyle     profile={profile} save={save} accent={accent} done={filled.lifestyle}/>

        <p style={{ fontSize:12, color:C.inkSoft, marginTop:24, lineHeight:1.5 }}>
          You can edit or remove anything here at any time. Data is encrypted, never sold, and shared only with your consent.
        </p>
      </div>
    </div>
  );
}

const backBtn = { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:C.inkSoft, fontSize:14, marginBottom:14, fontFamily:"Karla, sans-serif" };

/* completion check per section — returns a map of section -> filled? */
function completionMap(p) {
  if (!p) return {};
  const has = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  return {
    about:     has(p.display_name) && (has(p.date_of_birth) || has(p.pronouns) || has(p.city)),
    stage:     has(p.life_stage) && (has(p.focus_areas) || has(p.goals)),
    health:    has(p.conditions) || has(p.allergies),
    meds:      Array.isArray(p.medications) && p.medications.length > 0,
    cycle:     has(p.cycle_start_date) || has(p.birth_control),
    support:   (p.emergency_contact && has(p.emergency_contact.name))
               || (p.regular_doctor && has(p.regular_doctor.name))
               || (Array.isArray(p.support_people) && p.support_people.length > 0),
    lifestyle: has(p.workout_prefs) || has(p.dietary_prefs),
  };
}

/* ============================================================
   Reusable section wrapper + form primitives
   ============================================================ */

function Section({ title, icon:Icon, desc, accent, done, dirty, saved, onSave, children }) {
  const [open, setOpen] = useState(true);
  return (
    <Card style={{ marginBottom:14, padding:0, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", fontFamily:"Karla, sans-serif" }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${accent}1A`, color:accent, display:"grid", placeItems:"center", flexShrink:0 }}><Icon size={18}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"Fraunces, serif", fontSize:18, color:C.ink, display:"flex", alignItems:"center", gap:8 }}>
            {title}
            {done && <Check size={15} style={{ color:C.sage }}/>}
          </div>
          {desc && <div style={{ fontSize:13, color:C.inkSoft, marginTop:2, lineHeight:1.5 }}>{desc}</div>}
        </div>
        <span style={{ fontSize:18, color:C.inkSoft, transform:open?"rotate(180deg)":"none", transition:".2s" }}>⌃</span>
      </button>
      {open && (
        <div style={{ padding:"4px 18px 18px", borderTop:`1px solid ${C.line}` }}>
          {children}
          <div style={{ marginTop:14, display:"flex", justifyContent:"flex-end" }}>
            <button onClick={onSave} disabled={!dirty || saved} style={{
              display:"flex", alignItems:"center", gap:7, padding:"10px 16px", borderRadius:11, border:"none",
              background: saved ? C.sage : (dirty ? accent : "rgba(44,35,32,.12)"),
              color: dirty || saved ? "#fff" : C.inkSoft,
              cursor: dirty && !saved ? "pointer" : "default",
              fontSize:14, fontWeight:600, fontFamily:"Karla, sans-serif", transition:".15s",
            }}>
              {saved ? <><Check size={15}/> Saved</> : <><Save size={15}/> Save section</>}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function useSection(initial) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const onSave = async (saver) => { await saver(form); setSaved(true); setTimeout(()=>setSaved(false), 1800); };
  // sync if profile changes from outside (only when not dirty)
  useEffect(()=>{ if (!dirty) setForm(initial); /* eslint-disable-next-line */ }, [JSON.stringify(initial)]);
  return { form, set:(patch)=>{ setForm(f=>({...f, ...patch})); setSaved(false); }, dirty, saved, onSave };
}

const inp = {
  padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:"#fff",
  fontSize:14.5, color:C.ink, outline:"none", fontFamily:"Karla, sans-serif", width:"100%",
};
const lbl = { fontSize:13, fontWeight:600, color:C.ink, marginBottom:6, display:"block" };
const helper = { fontSize:12, color:C.inkSoft, marginTop:4, lineHeight:1.4 };
const grid2 = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(200px,100%),1fr))", gap:12 };

const TextField = ({ label, value, onChange, type="text", placeholder, hint }) => (
  <div><label style={lbl}>{label}</label>
    <input type={type} value={value ?? ""} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} style={inp}/>
    {hint && <div style={helper}>{hint}</div>}
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div><label style={lbl}>{label}</label>
    <select value={value ?? ""} onChange={(e)=>onChange(e.target.value)} style={inp}>
      <option value="">—</option>
      {options.map((o)=>(<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  </div>
);

function TagInput({ label, value=[], onChange, placeholder, hint, accent }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (!v) return; if (!value.includes(v)) onChange([...value, v]); setDraft(""); };
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
        {value.map((v,i)=>(
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:99, background:`${accent}1A`, color:accent, fontSize:13, fontWeight:600 }}>
            {v} <button onClick={()=>onChange(value.filter((_,k)=>k!==i))} style={{ background:"none", border:"none", cursor:"pointer", color:accent, display:"inline-flex" }}><X size={13}/></button>
          </span>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <input value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{ if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} style={inp}/>
        <button onClick={add} style={{ padding:"0 14px", borderRadius:10, border:`1px solid ${C.line}`, background:"transparent", cursor:"pointer", color:C.ink, fontSize:14, fontFamily:"Karla, sans-serif" }}>Add</button>
      </div>
      {hint && <div style={helper}>{hint}</div>}
    </div>
  );
}

/* ============================================================
   Section components
   ============================================================ */

function AboutYou({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    display_name: profile.display_name || "",
    pronouns: profile.pronouns || "",
    date_of_birth: profile.date_of_birth || "",
    phone: profile.phone || "",
    city: profile.city || "",
    country: profile.country || "",
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  return (
    <Section title="About you" desc="The basics — name, where you are, how to call you." icon={User} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={grid2}>
        <TextField label="Name" value={form.display_name} onChange={(v)=>set({display_name:v})}/>
        <TextField label="Pronouns" value={form.pronouns} onChange={(v)=>set({pronouns:v})} placeholder="e.g. she/her"/>
        <TextField label="Date of birth" type="date" value={form.date_of_birth} onChange={(v)=>set({date_of_birth:v})}/>
        <TextField label="Phone" value={form.phone} onChange={(v)=>set({phone:v})} placeholder="Optional, for reminders"/>
        <TextField label="City" value={form.city} onChange={(v)=>set({city:v})}/>
        <TextField label="Country" value={form.country} onChange={(v)=>set({country:v})}/>
      </div>
    </Section>
  );
}

function StageGoals({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    life_stage: profile.life_stage || "",
    focus_areas: profile.focus_areas || [],
    goals: profile.goals || [],
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  const stageOpts = Object.entries(STAGES).map(([id,s])=>({ value:id, label:`${s.label} · ${s.range}` }));
  return (
    <Section title="Stage & goals" desc="The life season you're in, and what you'd like from FeBrite." icon={Target} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Select label="Life stage" value={form.life_stage} onChange={(v)=>set({life_stage:v})} options={stageOpts}/>
        <TagInput label="What you want focus on" value={form.focus_areas} onChange={(v)=>set({focus_areas:v})} placeholder="e.g. mood, cycle, sleep" hint="Press Enter to add." accent={accent}/>
        <TagInput label="Your goals" value={form.goals} onChange={(v)=>set({goals:v})} placeholder="e.g. better sleep, less anxiety" accent={accent}/>
      </div>
    </Section>
  );
}

function Health({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    conditions: profile.conditions || [],
    allergies: profile.allergies || [],
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  return (
    <Section title="Health profile" desc="Conditions you live with and allergies we should know about." icon={Stethoscope} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <TagInput label="Conditions" value={form.conditions} onChange={(v)=>set({conditions:v})} placeholder="e.g. PCOS, anaemia, asthma" hint="Anything diagnosed that you'd like FeBrite to be aware of." accent={accent}/>
        <TagInput label="Allergies" value={form.allergies} onChange={(v)=>set({allergies:v})} placeholder="e.g. penicillin, peanuts" accent={accent}/>
      </div>
    </Section>
  );
}

function Medications({ profile, save, accent, done }) {
  const initial = useMemo(()=>({ medications: profile.medications || [] }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  const updateAt = (i, patch) => set({ medications: form.medications.map((m, k) => k === i ? { ...m, ...patch } : m) });
  const removeAt = (i) => set({ medications: form.medications.filter((_, k) => k !== i) });
  const addNew = () => set({ medications: [...form.medications, { name:"", dose:"", schedule:"", started:"" }] });
  return (
    <Section title="Current medications" desc="What you're taking. FeBrite can help you stay consistent — but never changes a dose." icon={Pill} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {form.medications.length === 0 && <div style={{ fontSize:13.5, color:C.inkSoft }}>You haven't added any yet.</div>}
        {form.medications.map((m, i) => (
          <div key={i} style={{ position:"relative", padding:14, borderRadius:12, background:"rgba(44,35,32,.03)", border:`1px solid ${C.line}` }}>
            <button onClick={()=>removeAt(i)} style={{ position:"absolute", top:8, right:8, background:"none", border:"none", cursor:"pointer", color:C.inkSoft }}><X size={16}/></button>
            <div style={grid2}>
              <TextField label="Name" value={m.name} onChange={(v)=>updateAt(i, {name:v})} placeholder="e.g. Vitamin D"/>
              <TextField label="Dose" value={m.dose} onChange={(v)=>updateAt(i, {dose:v})} placeholder="e.g. 1000 IU"/>
              <TextField label="When" value={m.schedule} onChange={(v)=>updateAt(i, {schedule:v})} placeholder="e.g. morning, with food"/>
              <TextField label="Started" type="date" value={m.started} onChange={(v)=>updateAt(i, {started:v})}/>
            </div>
          </div>
        ))}
        <button onClick={addNew} style={{ alignSelf:"flex-start", display:"flex", alignItems:"center", gap:7, padding:"9px 14px", borderRadius:10, border:`1px dashed ${C.line}`, background:"transparent", cursor:"pointer", color:C.ink, fontSize:14, fontFamily:"Karla, sans-serif" }}>
          <Plus size={15}/> Add medication
        </button>
        <div style={{ fontSize:11.5, color:C.inkSoft, lineHeight:1.5 }}>
          FeBrite tracks what you tell it. It doesn't prescribe, change doses, or replace your doctor's advice.
        </div>
      </div>
    </Section>
  );
}

function Cycle({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    cycle_start_date: profile.cycle_start_date || "",
    cycle_length: profile.cycle_length ?? 28,
    period_length: profile.period_length ?? 5,
    birth_control: profile.birth_control || "",
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  return (
    <Section title="Your cycle" desc="Your last period start date helps us predict upcoming phases on your calendar." icon={CalendarHeart} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={grid2}>
        <TextField label="Last period start date" type="date" value={form.cycle_start_date} onChange={(v)=>set({cycle_start_date:v})} hint="We'll predict the next one from this."/>
        <TextField label="Average cycle length (days)" type="number" value={form.cycle_length} onChange={(v)=>set({cycle_length: Number(v) || 28 })} hint="Default is 28."/>
        <TextField label="Average period length (days)" type="number" value={form.period_length} onChange={(v)=>set({period_length: Number(v) || 5 })}/>
        <TextField label="Birth control / contraception" value={form.birth_control} onChange={(v)=>set({birth_control:v})} placeholder="Optional, e.g. pill, IUD, none"/>
      </div>
    </Section>
  );
}

function Support({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    emergency_contact: profile.emergency_contact || { name:"", relationship:"", phone:"" },
    regular_doctor: profile.regular_doctor || { name:"", clinic:"", phone:"" },
    support_people: profile.support_people || [],
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  const updPerson = (i, patch) => set({ support_people: form.support_people.map((p,k)=>k===i?{...p,...patch}:p) });
  const removePerson = (i) => set({ support_people: form.support_people.filter((_,k)=>k!==i) });
  const addPerson = () => set({ support_people: [...form.support_people, { name:"", relationship:"", when_to_reach:"", phone:"" }] });

  return (
    <Section title="Your support network" desc="Who's there for you. We'll gently surface the right person at the right time." icon={UsersRound} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

        <div>
          <div style={{ ...lbl, fontSize:14, marginBottom:10 }}>Emergency contact</div>
          <div style={grid2}>
            <TextField label="Name" value={form.emergency_contact.name} onChange={(v)=>set({emergency_contact:{...form.emergency_contact, name:v}})}/>
            <TextField label="Relationship" value={form.emergency_contact.relationship} onChange={(v)=>set({emergency_contact:{...form.emergency_contact, relationship:v}})} placeholder="e.g. partner, sister"/>
            <TextField label="Phone" value={form.emergency_contact.phone} onChange={(v)=>set({emergency_contact:{...form.emergency_contact, phone:v}})}/>
          </div>
        </div>

        <div>
          <div style={{ ...lbl, fontSize:14, marginBottom:10 }}>Your regular doctor</div>
          <div style={grid2}>
            <TextField label="Name" value={form.regular_doctor.name} onChange={(v)=>set({regular_doctor:{...form.regular_doctor, name:v}})}/>
            <TextField label="Clinic / hospital" value={form.regular_doctor.clinic} onChange={(v)=>set({regular_doctor:{...form.regular_doctor, clinic:v}})}/>
            <TextField label="Phone" value={form.regular_doctor.phone} onChange={(v)=>set({regular_doctor:{...form.regular_doctor, phone:v}})}/>
          </div>
        </div>

        <div>
          <div style={{ ...lbl, fontSize:14, marginBottom:6 }}>Your go-to people</div>
          <div style={{ ...helper, marginBottom:10 }}>The person you want to talk to during specific moods or phases — FeBrite will gently nudge you to reach out when those moments come.</div>
          {form.support_people.length === 0 && <div style={{ fontSize:13.5, color:C.inkSoft, marginBottom:10 }}>No one added yet.</div>}
          {form.support_people.map((p,i)=>(
            <div key={i} style={{ position:"relative", padding:14, borderRadius:12, background:"rgba(44,35,32,.03)", border:`1px solid ${C.line}`, marginBottom:10 }}>
              <button onClick={()=>removePerson(i)} style={{ position:"absolute", top:8, right:8, background:"none", border:"none", cursor:"pointer", color:C.inkSoft }}><X size={16}/></button>
              <div style={grid2}>
                <TextField label="Name" value={p.name} onChange={(v)=>updPerson(i, {name:v})}/>
                <TextField label="Relationship" value={p.relationship} onChange={(v)=>updPerson(i, {relationship:v})} placeholder="e.g. friend, mum"/>
                <TextField label="When to reach out" value={p.when_to_reach} onChange={(v)=>updPerson(i, {when_to_reach:v})} placeholder="e.g. when I'm anxious, before my period"/>
                <TextField label="Phone" value={p.phone} onChange={(v)=>updPerson(i, {phone:v})}/>
              </div>
            </div>
          ))}
          <button onClick={addPerson} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 14px", borderRadius:10, border:`1px dashed ${C.line}`, background:"transparent", cursor:"pointer", color:C.ink, fontSize:14, fontFamily:"Karla, sans-serif" }}>
            <Plus size={15}/> Add a support person
          </button>
        </div>
      </div>
    </Section>
  );
}

function Lifestyle({ profile, save, accent, done }) {
  const initial = useMemo(()=>({
    workout_prefs: profile.workout_prefs || [],
    dietary_prefs: profile.dietary_prefs || [],
  }), [profile]);
  const { form, set, dirty, saved, onSave } = useSection(initial);
  return (
    <Section title="Lifestyle" desc="How you like to move, eat, and live. Helps us recommend the right things." icon={Dumbbell} accent={accent} done={done} dirty={dirty} saved={saved} onSave={()=>onSave(save)}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <TagInput label="How you like to move" value={form.workout_prefs} onChange={(v)=>set({workout_prefs:v})} placeholder="e.g. walking, yoga, strength" accent={accent}/>
        <TagInput label="Dietary preferences" value={form.dietary_prefs} onChange={(v)=>set({dietary_prefs:v})} placeholder="e.g. vegetarian, lactose-free" accent={accent}/>
      </div>
    </Section>
  );
}
