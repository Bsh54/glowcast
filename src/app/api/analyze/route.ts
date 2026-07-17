import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import { cleanText, cleanHexList } from "@/lib/guard";

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
  title: string;
  event: { kind: string; formality: string; vibe: string };
  insights: Record<string, string>;
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

    // Mask URLs are signed S3 links that expire in ~2h — re-encode them as
    // data URLs so the client can show them at any time.
    await Promise.all(
      Object.entries(scores).map(async ([, v]) => {
        if (v.maskUrl) {
          try {
            v.maskUrl = await urlToDataUrl(v.maskUrl);
          } catch {
            v.maskUrl = undefined;
          }
        }
      })
    );

    const toneResults = tone.results as { color?: Record<string, string> };
    const color = toneResults?.color ?? {};

    const scoreList = Object.entries(scores)
      .map(([k, v]) => `${k}: ${v.ui_score}/100`)
      .join(", ");

    const ai = await deepseekJson<PaletteAI>(
      "You are a professional color analyst and event stylist. Reply with strict JSON only.",
      `Facial colors of the user (hex): skin ${color.skin_color}, eyes ${color.eye_color} (${color.eye_color_name}), lips ${color.lip_color}, eyebrows ${color.eyebrow_color}, hair ${color.hair_color} (${color.hair_color_name}).
Event described by the user: "${event?.description ?? "not provided"}" in ${event?.city ?? "?"} in ${event?.daysLeft ?? "?"} days.
Skin scan scores (higher is better): ${scoreList}.

Return JSON:
{
 "season": "Spring|Summer|Autumn|Winter",
 "colors": ["8 hex colors that flatter this person"],
 "avoid": ["3 hex colors to avoid"],
 "description": "2 elegant sentences, addressed to the user (\\"you\\"), explaining their undertone and what flatters them; only mention features actually present in the data",
 "title": "a short elegant English title for this event, max 5 words, title case (e.g. 'Beach Day with Friends')",
 "event": {"kind": "wedding|interview|party|date|shoot|gala|other", "formality": "casual|smart-casual|semi-formal|formal|black-tie", "vibe": "3-5 words describing the desired mood"},
 "insights": {"<concern key exactly as given>": "one warm plain-language sentence (max 90 chars), addressed to the user, saying what this score means and the single most useful action — one entry for EVERY score listed"}
}`
    );

    return NextResponse.json({
      scores,
      globalScore,
      tone: color,
      palette: {
        season: ["Spring", "Summer", "Autumn", "Winter"].includes(ai.season)
          ? ai.season
          : "Autumn",
        colors: cleanHexList(ai.colors, 8),
        avoid: cleanHexList(ai.avoid, 3),
        description: cleanText(
          ai.description,
          280,
          "Your natural coloring shines with warm, rich tones — lean on your palette below."
        ),
      },
      parsedEvent: ai.event,
      eventTitle: cleanText(ai.title, 48, "Your Big Day"),
      insights: Object.fromEntries(
        Object.keys(scores).map((k) => [
          k,
          cleanText(ai.insights?.[k], 110, "A solid area — keep up your current routine."),
        ])
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "analyze_failed", detail: msg }, { status: 500 });
  }
}
