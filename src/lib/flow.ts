/** État partagé du parcours GlowCast (6 écrans), persisté en sessionStorage. */

export type EventType =
  | "mariage"
  | "entretien"
  | "soiree"
  | "date"
  | "shooting"
  | "gala"
  | "autre";

export interface EventInfo {
  type: EventType;
  label: string;
  date: string; // ISO yyyy-mm-dd
  city: string;
  daysLeft: number;
  weather?: { tempC: number; condition: string; icon: string };
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
  season: "Printemps" | "Été" | "Automne" | "Hiver";
  colors: string[];
  avoid: string[];
  description: string;
}

export interface FlowState {
  event?: EventInfo;
  selfieDataUrl?: string; // base64 du selfie capturé
  scores?: SkinScores;
  skinAge?: number;
  globalScore?: number;
  tone?: ToneColors;
  palette?: Palette;
  improvedUrl?: string; // projection peau
  skincarePlan?: string[];
  lookUrl?: string; // rendu VTO courant
  lookPieces?: { kind: string; label: string }[];
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

export const EVENT_OPTIONS: { type: EventType; label: string; emojiFree: string }[] = [
  { type: "mariage", label: "Mariage", emojiFree: "rings" },
  { type: "entretien", label: "Entretien", emojiFree: "briefcase" },
  { type: "soiree", label: "Soirée", emojiFree: "sparkles" },
  { type: "date", label: "Date", emojiFree: "heart" },
  { type: "shooting", label: "Shooting", emojiFree: "camera" },
  { type: "gala", label: "Gala", emojiFree: "star" },
  { type: "autre", label: "Autre", emojiFree: "dots" },
];

export function daysUntil(dateIso: string): number {
  const d = new Date(dateIso + "T12:00:00");
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000));
}
