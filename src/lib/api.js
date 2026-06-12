import { CONTENT } from "../data/content";

const API = import.meta.env.VITE_API_URL;

const CRISIS = ["suicide","kill myself","end it","hurt myself","self harm","want to die","can't go on"];

const find = (q) => CONTENT.find((c) => c.title.toLowerCase().includes(q));

// Local, deterministic fallback so the companion always works in dev.
export function localReply(text) {
  const low = text.toLowerCase();
  if (CRISIS.some((k) => low.includes(k)))
    return { crisis:true, text:"I'm really glad you told me. What you're feeling matters, and you deserve support from someone who can be with you right now. I can't handle a crisis myself — please reach out to a trained person." };
  if (low.match(/period|cycle|cramp/)) return { text:"Cycle changes and cramps are common and can shift with each phase. There's a clinician-reviewed piece on reading your cycle as a mood map that many find grounding. Severe or sudden pain is worth a clinician's look.", link:find("mood map") };
  if (low.match(/hot flash|menopause|sweat/)) return { text:"Hot flashes happen as estrogen fluctuates — real and manageable. There are lifestyle and medical options worth discussing.", link:find("hot flashes") };
  if (low.match(/iron|tired|exhaust|fatigue/)) return { text:"Persistent tiredness has many causes — low iron is a common, easily-missed one. A simple blood test checks it. Please don't self-supplement without testing.", link:find("iron") };
  if (low.match(/sad|anxious|anxiety|stress|overwhelm|depress/)) return { text:"That sounds heavy, and it's okay to feel it. If low mood or worry has stuck around a couple of weeks or is getting in the way of life, it's worth talking to a professional.", link:find("low mood") };
  if (low.match(/bone|calcium|nutrition|eat|diet/)) return { text:"Eating well across life stages is one of the highest-value things you can do — especially for bone and energy after 40.", link:find("bone strength") };
  return { text:"Thank you for sharing that. I'm here to support and inform, not replace a clinician. There may be a reviewed article that helps, and you can connect with a real professional whenever you're ready." };
}

// Calls the backend when VITE_API_URL is set; otherwise uses the local fallback.
export async function askCompanion(message, stage) {
  if (!API) return localReply(message);
  try {
    const res = await fetch(`${API}/companion`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message, stage }),
    });
    if (!res.ok) throw new Error("bad status");
    return await res.json();
  } catch (e) {
    console.error("companion api failed, using local", e);
    return localReply(message);
  }
}
