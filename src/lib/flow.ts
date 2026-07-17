/** Shared state for the 6-screen GlowCast journey, persisted in sessionStorage. */

export interface EventInfo {
  description: string; // free-text description of the event
  date: string; // ISO yyyy-mm-dd
  city: string;
  country?: string;
  lat?: number;
  lon?: number;
  daysLeft: number;
  /** Filled from Open-Meteo when the event is within the 16-day forecast window. */
  weather?: { tempMaxC: number; tempMinC: number; condition: string; precipitationChance?: number };
  // Derived by the AI from the description (filled later)
  parsed?: { kind: string; formality: string; vibe: string };
}

export interface SkinScores {
  [concern: string]: { ui_score: number; raw_score: number; maskUrl?: string };
}

export interface ToneColors {
  skin_color: string;
  eye_color: string;
  eye_color_name?: string;
  lip_color: string;
  eyebrow_color: string;
  hair_color: string;
  hair_color_name?: string;
}

export interface Palette {
  season: "Spring" | "Summer" | "Autumn" | "Winter";
  colors: string[];
  avoid: string[];
  description: string;
}

export interface FlowState {
  event?: EventInfo;
  selfieDataUrl?: string; // captured selfie as base64
  lookPhotoDataUrl?: string; // optional upper-body photo used for the try-on
  scores?: SkinScores;
  globalScore?: number;
  tone?: ToneColors;
  palette?: Palette;
  improvedUrl?: string; // skin projection image
  skincarePlan?: string[];
  lookUrl?: string; // current VTO render
  lookPieces?: { kind: string; label: string; image?: string; applied?: boolean }[];
}

const KEY = "glowcast-flow";

export function loadFlow(): FlowState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveFlow(patch: Partial<FlowState>): FlowState {
  const next = { ...loadFlow(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetFlow() {
  sessionStorage.removeItem(KEY);
}

export function daysUntil(dateIso: string): number {
  const d = new Date(dateIso + "T12:00:00");
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000));
}
