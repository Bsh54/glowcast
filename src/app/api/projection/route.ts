import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import { cleanText } from "@/lib/guard";

export const maxDuration = 300;

/** Screen 4 backend: generative "skin potential" image + an adaptive
 *  skincare timeline. Day-by-day (AM/PM) when the event is close;
 *  phase-based with a detailed final week when it is further out. */

interface ProjectionBody {
  selfie: string;
  scores?: Record<string, { ui_score: number }>;
  daysLeft?: number;
}

export interface PlanEntry {
  label: string; // e.g. "Day 3 — Tue, Aug 12" or "Weeks 1–2"
  am?: string;
  pm?: string;
  tip?: string;
}

interface PlanAI {
  entries: { label: string; am?: string; pm?: string; tip?: string }[];
}

const SAFETY_RULES = `Safety rules (mandatory):
- no exfoliants, acids, retinoids or new products in the last 3 days;
- the night before = gentle cleanse + soothing hydrating mask;
- the morning of = rinse with cool water, light moisturizer, SPF if daytime;
- drugstore-level generic products only (cleanser, moisturizer, serum, SPF, mask) — never brand names;
- never promise results; these are care habits, not treatments.`;

export async function POST(req: NextRequest) {
  try {
    const { selfie, scores = {}, daysLeft = 7 } = (await req.json()) as ProjectionBody;
    const { buf, contentType } = dataUrlToBuffer(selfie);

    const weakest = Object.entries(scores)
      .sort((a, b) => a[1].ui_score - b[1].ui_score)
      .slice(0, 3)
      .map(([k]) => k.replace(/_/g, " "));
    const focus =
      weakest.length > 0 ? weakest.join(", ") : "overall radiance and even skin texture";

    const daily = daysLeft <= 10;
    const planPrompt = daily
      ? `Build a DAY-BY-DAY plan for the ${daysLeft} day(s) left before the event (Day 1 = today, last day = event day).
Each day has "am" and "pm" (short imperative instructions, max 90 characters each) and optionally one "tip".
Label each day "Day N".`
      : `Build a PHASE-BASED plan for the ${daysLeft} days left before the event:
one entry per phase (e.g. "Until 2 weeks out", "Final week", "Last 3 days", "The night before", "The morning of").
Each entry has "am" and "pm" (short imperative instructions, max 90 characters each) and optionally one "tip".
The final week must be concrete and specific.`;

    const fid = await uploadImage("image-to-image/youcam", buf, contentType);
    const [gen, planAI] = await Promise.all([
      runTask("image-to-image/youcam", {
        src_file_ids: [fid],
        model: "youcam-image-v2",
        prompt:
          `Same person, same face, same pose, same background and lighting. ` +
          `Improve the skin only: ${focus} noticeably improved, healthy glowing complexion. ` +
          `Keep identity, hair, framing and expression strictly identical.`,
      }),
      deepseekJson<PlanAI>(
        `You are a pragmatic skincare coach. Reply with strict JSON only.
Hard rules for every text field: plain warm English, max 90 characters,
no brand names, no promises, no medical language.`,
        `The user's weakest skin readings are: ${focus}.
${planPrompt}
${SAFETY_RULES}

Return JSON: {"entries": [{"label": "...", "am": "...", "pm": "...", "tip": "..."}]}`,
        { maxTokens: 1400 }
      ),
    ]);

    // Guardrails: validate every entry, drop anything malformed
    const entries: PlanEntry[] = (planAI.entries ?? [])
      .map((e) => ({
        label: cleanText(e.label, 40, ""),
        am: e.am ? cleanText(e.am, 110, "Gentle cleanser, moisturizer, SPF.") : undefined,
        pm: e.pm ? cleanText(e.pm, 110, "Cleanse gently and moisturize.") : undefined,
        tip: e.tip ? cleanText(e.tip, 110, "") || undefined : undefined,
      }))
      .filter((e) => e.label && (e.am || e.pm))
      .slice(0, daily ? 14 : 7);

    if (entries.length === 0) {
      entries.push(
        { label: "Every day", am: "Gentle cleanser, moisturizer, SPF.", pm: "Cleanse gently and moisturize." },
        { label: "The night before", pm: "Gentle cleanse + soothing hydrating mask." },
        { label: "The morning of", am: "Cool water rinse, light moisturizer, SPF." }
      );
    }

    if (gen.task_status !== "success") {
      return NextResponse.json(
        { error: "projection_failed", detail: gen.error, plan: entries, planMode: daily ? "daily" : "phases" },
        { status: 422 }
      );
    }

    const url = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
    const improved = url ? await urlToDataUrl(url) : null;

    return NextResponse.json({
      improved,
      plan: entries,
      planMode: daily ? "daily" : "phases",
      focus: weakest,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "projection_failed", detail: msg }, { status: 500 });
  }
}
