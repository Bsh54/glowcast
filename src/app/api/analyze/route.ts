import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer } from "@/lib/image";

export const maxDuration = 300;

/** Screen 3 backend: skin analysis + facial color tones in parallel,
 *  then DeepSeek derives the color season, palette and event insights. */

const SD_ACTIONS = [
  "moisture",
  "radiance",
  "texture",
  "redness",
  "acne",
  "oiliness",
  "pore",
  "dark_circle_v2",
];

interface AnalyzeBody {
  selfie: string; // data URL
  event?: { description: string; date: string; city: string; daysLeft: number };
}

interface PaletteAI {
  season: string;
  colors: string[];
  avoid: string[];
  description: string;
  event: { kind: string; formality: string; vibe: string };
}

export async function POST(req: NextRequest) {
  try {
    const { selfie, event } = (await req.json()) as AnalyzeBody;
    const { buf, contentType } = dataUrlToBuffer(selfie);

    // file_ids are NOT shared across features → one upload per feature
    const [skinFid, toneFid] = await Promise.all([
      uploadImage("skin-analysis", buf, contentType),
      uploadImage("skin-tone-analysis", buf, contentType),
    ]);

    const [skin, tone] = await Promise.all([
      runTask("skin-analysis", {
        src_file_id: skinFid,
        dst_actions: SD_ACTIONS,
        format: "json",
        miniserver_args: { enable_mask_overlay: true },
      }),
      runTask("skin-tone-analysis", { src_file_id: toneFid, format: "json" }),
    ]);

    if (skin.task_status === "error") {
      return NextResponse.json(
        { error: "skin_analysis_failed", detail: skin.error },
        { status: 422 }
      );
    }
    if (tone.task_status === "error") {
      return NextResponse.json(
        { error: "tone_analysis_failed", detail: tone.error },
        { status: 422 }
      );
    }

    const results = skin.results as {
      output?: {
        type: string;
        ui_score: number;
        raw_score: number;
        score?: number; // used by the "all" and "skin_age" entries
        mask_urls?: string[];
      }[];
    };
    // The output also contains technical entries ("all", "skin_age",
    // "resize_image") — keep only the requested concerns as gauges.
    const scores: Record<string, { ui_score: number; raw_score: number; maskUrl?: string }> = {};
    let globalScore: number | undefined;
    for (const o of results?.output ?? []) {
      if (o.type === "all") {
        globalScore = o.score != null ? Math.round(o.score) : undefined;
      } else if (SD_ACTIONS.includes(o.type)) {
        scores[o.type] = {
          ui_score: o.ui_score,
          raw_score: o.raw_score,
          maskUrl: o.mask_urls?.[0],
        };
      }
    }
    if (globalScore == null) {
      globalScore = Math.round(
        Object.values(scores).reduce((s, v) => s + v.ui_score, 0) /
          Math.max(1, Object.keys(scores).length)
      );
    }

    const toneResults = tone.results as { color?: Record<string, string> };
    const color = toneResults?.color ?? {};

    const ai = await deepseekJson<PaletteAI>(
      "You are a professional color analyst and event stylist. Reply with strict JSON only.",
      `Facial colors of the user (hex): skin ${color.skin_color}, eyes ${color.eye_color} (${color.eye_color_name}), lips ${color.lip_color}, eyebrows ${color.eyebrow_color}, hair ${color.hair_color} (${color.hair_color_name}).
Event described by the user: "${event?.description ?? "not provided"}" in ${event?.city ?? "?"} in ${event?.daysLeft ?? "?"} days.

Return JSON:
{
 "season": "Spring|Summer|Autumn|Winter",
 "colors": ["8 hex colors that flatter this person"],
 "avoid": ["3 hex colors to avoid"],
 "description": "2 elegant sentences, addressed to the user (\\"you\\"), explaining their undertone and what flatters them",
 "event": {"kind": "wedding|interview|party|date|shoot|gala|other", "formality": "casual|smart-casual|semi-formal|formal|black-tie", "vibe": "3-5 words describing the desired mood"}
}`
    );

    return NextResponse.json({
      scores,
      globalScore,
      tone: color,
      palette: {
        season: ai.season,
        colors: ai.colors,
        avoid: ai.avoid,
        description: ai.description,
      },
      parsedEvent: ai.event,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "analyze_failed", detail: msg }, { status: 500 });
  }
}
