/** Output guardrails for AI-generated advice: structural validation so the
 *  worst case is a bland sentence, never a weird or unsafe one. */

const BANNED = [
  "cure",
  "cures",
  "guarantee",
  "guaranteed",
  "medical",
  "diagnos",
  "prescription",
  "retin-a",
  "accutane",
  "tretinoin",
  "botox",
  "filler",
  "surgery",
];

export function cleanText(s: unknown, maxLen: number, fallback: string): string {
  if (typeof s !== "string") return fallback;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t || t.length > maxLen) return fallback;
  const low = t.toLowerCase();
  if (BANNED.some((w) => low.includes(w))) return fallback;
  return t;
}

export function cleanHexList(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((h): h is string => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h.trim()))
    .map((h) => h.trim().toUpperCase())
    .slice(0, max);
}
