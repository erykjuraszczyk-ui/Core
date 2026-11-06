export type PersonalityStyle = "balanced" | "analytical" | "warm" | "concise";
export type CortanaMood = "neutral" | "curious" | "supportive" | "focused" | "positive" | "calm";

const STORAGE_KEY = "cortana.personality.style.v1";
const STYLES: PersonalityStyle[] = ["balanced", "analytical", "warm", "concise"];

export function readPersonality(): PersonalityStyle {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return STYLES.includes(value as PersonalityStyle) ? value as PersonalityStyle : "balanced";
  } catch { return "balanced"; }
}
export function savePersonality(value: PersonalityStyle): void {
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* persistence is optional */ }
}

/** Lightweight interaction cue classifier. It does not diagnose or claim to know a person's feelings. */
export function classifyInteraction(text: string): CortanaMood {
  const value = text.toLocaleLowerCase("pl-PL");
  if (/(dziękuj|super|świetn|udało się|wspaniał|ciesz)/u.test(value)) return "positive";
  if (/(pomóż|martwię|trudno mi|boję|przykro|zmartw|stres)/u.test(value)) return "supportive";
  if (/(jak działa|dlaczego|wyjaśnij|ciekaw|co to|zbadaj)/u.test(value)) return "curious";
  if (/(krok po kroku|napraw|błąd|debug|wdroż|zbuduj|implementuj)/u.test(value)) return "focused";
  if (/(spokojnie|bez pośpiechu|na spokojnie)/u.test(value)) return "calm";
  return "neutral";
}
