import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend — one complete look, one image.
 *  The stylist shops the official 250-template catalog for the outfit that
 *  fits the event, weather and the user's colors; only when nothing in the
 *  catalog fits does it design a custom garment (text-to-image → ref VTO).
 *  The Clothes VTO renders the full look on the user in a single image. */

interface LookBody {
  selfie: string;
  event?: {
    description: string;
    city: string;
    daysLeft: number;
    weather?: { tempMaxC: number; tempMinC: number; condition: string; precipitationChance?: number };
  };
  palette?: { season: string; colors: string[]; avoid: string[] };
  adjustment?: string;
  excludeIds?: string[];
}

interface Plan {
  reason: string;
  outfit:
    | { mode: "template"; template_id: string; label: string }
    | { mode: "custom"; label: string; prompt: string };
}

function eventContext(event: LookBody["event"], palette: LookBody["palette"], adjustment?: string) {
  return `Event: "${event?.description ?? "elegant occasion"}" (in ${event?.daysLeft ?? "?"} days, city: ${event?.city ?? "?"}).
${
  event?.weather
    ? `Weather forecast that day: ${event.weather.condition}, ${event.weather.tempMinC}–${event.weather.tempMaxC}°C${
        event.weather.precipitationChance != null
          ? `, ${event.weather.precipitationChance}% chance of rain`
          : ""
      }. The outfit must work in these conditions.`
    : ""
}
Personal color season: ${palette?.season ?? "unknown"}. Flattering colors: ${palette?.colors?.join(", ") ?? "any"}. Colors to avoid: ${palette?.avoid?.join(", ") ?? "none"}.
${adjustment ? `User adjustment request: "${adjustment}".` : ""}`;
}

export async function POST(req: NextRequest) {
  try {
    const { selfie, event, palette, adjustment, excludeIds = [] } =
      (await req.json()) as LookBody;
    const { buf, contentType } = dataUrlToBuffer(selfie);

    const catalogEntries = (templates as { id: string; title: string; category: string }[])
      .filter((t) => !excludeIds.includes(t.id));
    const catalog = catalogEntries.map((t) => `${t.id} | ${t.title} | ${t.category}`).join("\n");

    // 1. The stylist picks (or, rarely, designs) the complete outfit
    const plan = await deepseekJson<Plan>(
      "You are a personal stylist. Reply with strict JSON only.",
      `Choose the complete outfit this user should wear.
${eventContext(event, palette, adjustment)}

OUTFIT CATALOG (id | title | category):
${catalog}

Rules:
- STRONGLY prefer an outfit from the catalog (mode "template"): pick the one
  that best fits the event, weather and the user's flattering colors.
- Use mode "custom" ONLY if truly nothing in the catalog suits the event
  (e.g. a very specific cultural or themed dress code).

Return JSON:
{
 "reason": "1 sentence, addressed to the user, why this look fits their event, colors and weather",
 "outfit": {"mode": "template", "template_id": "exact id from catalog", "label": "short human name"}
        OR {"mode": "custom", "label": "short human name", "prompt": "detailed visual description of the complete outfit for an image generator: exact colors, fabric, cut — no person, no background"}
}`,
      { maxTokens: 500 }
    );

    // 2. Render the look on the user
    let vto;
    if (plan.outfit.mode === "template") {
      const entry = catalogEntries.find(
        (t) => t.id === (plan.outfit as { template_id: string }).template_id
      );
      if (!entry) {
        return NextResponse.json({ error: "stylist_failed", detail: "invalid template id" }, { status: 500 });
      }
      const fid = await uploadImage("cloth", buf, contentType);
      vto = await runTask("cloth", { src_file_id: fid, template_id: entry.id });
    } else {
      const gen = await runTask("text-to-image/youcam", {
        prompt:
          `Professional e-commerce product photo, plain white background, no person, no face, no mannequin head. ` +
          plan.outfit.prompt,
        model: "youcam-image-v2",
      });
      const genUrl = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
      if (gen.task_status !== "success" || !genUrl) {
        return NextResponse.json({ error: "generation_failed", detail: gen.error }, { status: 500 });
      }
      const productRes = await fetch(genUrl);
      const productBuf = await productRes.arrayBuffer();
      const [srcFid, refFid] = await Promise.all([
        uploadImage("cloth", buf, contentType),
        uploadImage("cloth", productBuf, "image/jpeg", "garment.jpg"),
      ]);
      vto = await runTask("cloth", {
        src_file_id: srcFid,
        ref_file_id: refFid,
        garment_category: "auto",
      });
    }

    if (vto.task_status !== "success") {
      return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
    }
    const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
    const look = url ? await urlToDataUrl(url) : null;

    return NextResponse.json({
      look,
      templateId:
        plan.outfit.mode === "template"
          ? (plan.outfit as { template_id: string }).template_id
          : `custom-${Date.now()}`,
      pieceLabel: plan.outfit.label,
      reason: plan.reason,
      generated: plan.outfit.mode === "custom",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
