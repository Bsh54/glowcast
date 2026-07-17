/** Shared state for the 6-screen GlowCast journey.
 *
 *  Persistence: in-memory first (always authoritative, zero quota issues),
 *  mirrored to IndexedDB (no 5MB limit, survives reloads). `FlowProvider`
 *  hydrates memory from IndexedDB before the app renders. */

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

export interface LookImage {
  url: string;
  label: string;
  style?: string;
}

export interface PlanEntry {
  label: string;
  am?: string;
  pm?: string;
  tip?: string;
}

export interface FlowState {
  event?: EventInfo;
  eventTitle?: string; // short AI-generated title for the event
  selfieDataUrl?: string; // captured selfie as base64
  lookPhotoDataUrl?: string; // optional upper-body photo used for the try-on
  scores?: SkinScores;
  globalScore?: number;
  tone?: ToneColors;
  palette?: Palette;
  improvedUrl?: string; // skin projection image
  skincarePlan?: PlanEntry[];
  planMode?: "daily" | "phases";
  looks?: LookImage[]; // the four rendered looks
  lookReason?: string;
}

// ---------- IndexedDB mirror (no quota headaches, async, best-effort) ----------

const DB_NAME = "glowcast";
const STORE = "flow";
const RECORD = "state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(state: FlowState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, RECORD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(): Promise<FlowState | null> {
  const db = await openDb();
  const state = await new Promise<FlowState | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(RECORD);
    req.onsuccess = () => resolve((req.result as FlowState) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return state;
}

async function idbClear(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(RECORD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ---------- Sync facade over in-memory state ----------

let memoryFlow: FlowState = {};
let hydrated = false;

/** Loads IndexedDB into memory once, before the app renders (FlowProvider). */
export async function hydrateFlow(): Promise<void> {
  if (hydrated || typeof window === "undefined") return;
  try {
    memoryFlow = (await idbGet()) ?? {};
  } catch {
    memoryFlow = {};
  }
  hydrated = true;
}

export function loadFlow(): FlowState {
  return memoryFlow;
}

export function saveFlow(patch: Partial<FlowState>): FlowState {
  memoryFlow = { ...memoryFlow, ...patch };
  // Fire-and-forget mirror — memory stays authoritative either way.
  idbSet(memoryFlow).catch(() => {});
  return memoryFlow;
}

export function resetFlow() {
  memoryFlow = {};
  idbClear().catch(() => {});
}

export function daysUntil(dateIso: string): number {
  const d = new Date(dateIso + "T12:00:00");
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000));
}
