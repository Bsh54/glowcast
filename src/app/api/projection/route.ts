import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";

export const maxDuration = 300;

/** Screen 4 backend: generative "skin potential" image (image-to-image,
 *  replaces the broken skin-simulation endpoint) + skincare plan from DeepSeek. */

interface ProjectionBody {
  selfie: string;
  scores?: Record<string, { ui_score: number }>;
  daysLeft?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { selfie, scores = {}, daysLeft = 7 } = (await req.json()) as ProjectionBody;
    const { buf, contentType } = dataUrlToBuffer(selfie);

    // Target the 3 weakest concerns so the prompt stays focused and honest
    const weakest = Object.entries(scores)
      .sort((a, b) => a[1].ui_score - b[1].ui_score)
      .slice(0, 3)
      .map(([k]) => k.replace(/_/g, " "));
    const focus =
      weakest.length > 0
        ? weakest.join(", ")
        : "overall radiance and even skin texture";

    const fid = await uploadImage("image-to-image/youcam", buf, contentType);
    const [gen, plan] = await Promise.all([
      runTask("image-to-image/youcam", {
        src_file_ids: [fid],
        model: "youcam-image-v2",
        prompt:
          `Same person, same face, same pose, same background and lighting. ` +
          `Improve the skin only: ${focus} noticeably improved, healthy glowing complexion. ` +
          `Keep identity, hair, framing and expression strictly identical.`,
      }),
      deepseekJson<{ plan: string[] }>(
        "You are a pragmatic skincare coach. Reply with strict JSON only.",
        `The user has ${daysLeft} days before an important event. Their weakest skin concerns are: ${focus}.
Build a realistic skincare plan adapted to the time left (${daysLeft} days).
Rules: no exfoliants or acids in the last 3 days; the night before = soothing hydrating mask; keep it simple (drugstore-level products, no brands).
Return JSON: {"plan": ["4 to 6 short imperative steps, each prefixed by when to do it (e.g. 'This week:', '3 days before:', 'The night before:', 'The morning of:')"]}`
      ),
    ]);

    if (gen.task_status !== "success") {
      return NextResponse.json(
        { error: "projection_failed", detail: gen.error, plan: plan.plan },
        { status: 422 }
      );
    }

    const url = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
    const improved = url ? await urlToDataUrl(url) : null;

    return NextResponse.json({ improved, plan: plan.plan, focus: weakest });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "projection_failed", detail: msg }, { status: 500 });
  }
}
