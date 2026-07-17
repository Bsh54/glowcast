import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend — generative styling pipeline:
 *  1. DeepSeek designs the ideal garment as a text description
 *  2. YouCam text-to-image renders it as a product shot
 *  3. Clothes VTO dresses the user with it (ref_file_id mode)
 *  Falls back to the 250-template catalog if generation fails. */

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
  excludeIds?: string[]; // previously tried template ids (fallback mode)
}

interface Design {
  garment_prompt: string;
  piece_label: string;
  reason: string;
}

function eventContext(event: LookBody["event"], palette: LookBody["palette"], adjustment?: string) {
  return `Event: "${event?.description ?? "elegant occasion"}" (in ${event?.daysLeft ?? "?"} days, city: ${event?.city ?? "?"}).
${
  event?.weather
    ? `Weather forecast that day: ${event.weather.condition}, ${event.weather.tempMinC}–${event.weather.tempMaxC}°C${
        event.weather.precipitationChance != null
          ? `, ${event.weather.precipitationChance}% chance of rain`
          : ""
      }. The outfit must work in these conditions (fabric weight, layers).`
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

    // 1. DeepSeek designs the garment
    const design = await deepseekJson<Design>(
      "You are a personal stylist who designs outfits. Reply with strict JSON only.",
      `Design ONE complete outfit for this user.
${eventContext(event, palette, adjustment)}

Return JSON:
{
 "garment_prompt": "detailed visual description of the outfit for an image generator: pieces, exact colors (use the flattering palette), fabric, cut, style — 2-3 sentences, no person, no background details",
 "piece_label": "short human name of the outfit (e.g. 'Emerald silk midi dress')",
 "reason": "1 sentence, addressed to the user, why this outfit fits their event, colors and the weather"
}`,
      { maxTokens: 400 }
    );

    // 2. Generate the garment as a product image
    let look: string | null = null;
    let garmentImage: string | null = null;
    let generated = false;
    try {
      const gen = await runTask("text-to-image/youcam", {
        prompt:
          `Professional e-commerce product photo of an outfit on an invisible mannequin, plain white background, no person, no face. ` +
          design.garment_prompt,
        model: "youcam-image-v2",
      });
      const genUrl = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
      if (gen.task_status === "success" && genUrl) {
        // 3. Try the generated garment on the user (ref mode)
        const garmentRes = await fetch(genUrl);
        const garmentArr = await garmentRes.arrayBuffer();
        const garmentBuf = garmentArr;
        garmentImage = `data:image/jpeg;base64,${Buffer.from(garmentArr).toString("base64")}`;
        const [srcFid, refFid] = await Promise.all([
          uploadImage("cloth", buf, contentType),
          uploadImage("cloth", garmentBuf, "image/jpeg", "garment.jpg"),
        ]);
        const vto = await runTask("cloth", {
          src_file_id: srcFid,
          ref_file_id: refFid,
          garment_category: "auto",
        });
        if (vto.task_status === "error" && String(vto.error).match(/pose|body|face/)) {
          return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
        }
        const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
        if (vto.task_status === "success" && url) {
          look = await urlToDataUrl(url);
          generated = true;
        }
      }
    } catch {
      // fall through to catalog mode
    }

    // Fallback: pick from the official template catalog
    if (!look) {
      const catalog = (templates as { id: string; title: string; category: string }[])
        .filter((t) => !excludeIds.includes(t.id))
        .map((t) => `${t.id} | ${t.title} | ${t.category}`)
        .join("\n");
      const pick = await deepseekJson<{ template_id: string; reason: string; piece_label: string }>(
        "You are a personal stylist. Reply with strict JSON only.",
        `Choose ONE outfit template for this user.
${eventContext(event, palette, adjustment)}

Catalog (id | title | category):
${catalog}

Return JSON: {"template_id": "exact id from catalog", "reason": "1 sentence, addressed to the user", "piece_label": "short human name of the outfit"}`,
        { maxTokens: 400 }
      );
      const valid = (templates as { id: string }[]).some((t) => t.id === pick.template_id);
      if (!valid) {
        return NextResponse.json({ error: "stylist_failed", detail: "invalid template id" }, { status: 500 });
      }
      const fid = await uploadImage("cloth", buf, contentType);
      const vto = await runTask("cloth", { src_file_id: fid, template_id: pick.template_id });
      if (vto.task_status !== "success") {
        return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
      }
      const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
      look = url ? await urlToDataUrl(url) : null;
      return NextResponse.json({
        look,
        templateId: pick.template_id,
        pieceLabel: pick.piece_label,
        reason: pick.reason,
        generated: false,
      });
    }

    return NextResponse.json({
      look,
      garmentImage,
      templateId: `custom-${Date.now()}`,
      pieceLabel: design.piece_label,
      reason: design.reason,
      generated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
