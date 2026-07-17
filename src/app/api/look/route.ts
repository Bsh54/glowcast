import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend — generative styling pipeline:
 *  1. DeepSeek decides WHICH pieces the event calls for (nothing is forced —
 *     a beach day gets swimwear and sandals, an interview just the outfit)
 *     and describes each piece.
 *  2. Each piece is rendered as a product shot (text-to-image).
 *  3. Pieces are applied on the user in sequence (each VTO starts from the
 *     previous render). Falls back to the template catalog if needed. */

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

type PieceType = "cloth" | "shoes" | "hat" | "bag" | "scarf";

interface Plan {
  gender: "female" | "male";
  reason: string;
  pieces: { type: PieceType; label: string; prompt: string }[];
}

/** Shoes need the feet, hats crop to a portrait — apply in this order. */
const APPLY_ORDER: PieceType[] = ["shoes", "cloth", "bag", "scarf", "hat"];

function eventContext(event: LookBody["event"], palette: LookBody["palette"], adjustment?: string) {
  return `Event: "${event?.description ?? "elegant occasion"}" (in ${event?.daysLeft ?? "?"} days, city: ${event?.city ?? "?"}).
${
  event?.weather
    ? `Weather forecast that day: ${event.weather.condition}, ${event.weather.tempMinC}–${event.weather.tempMaxC}°C${
        event.weather.precipitationChance != null
          ? `, ${event.weather.precipitationChance}% chance of rain`
          : ""
      }. The pieces must work in these conditions.`
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

    // 1. The stylist decides which pieces the event actually needs
    const plan = await deepseekJson<Plan>(
      "You are a personal stylist. Reply with strict JSON only.",
      `Decide what this user should wear, piece by piece.
${eventContext(event, palette, adjustment)}

Rules:
- Only include pieces that genuinely fit the event. Never pad the list: an
  office interview usually needs only the outfit; a beach day calls for light
  clothing and maybe a hat; a gala may deserve a bag. 1 to 3 pieces maximum.
- "cloth" (the main outfit) is always required and listed once.
- Allowed piece types: "cloth", "shoes", "hat", "bag", "scarf".
- Colors must come from the flattering palette.

Return JSON:
{
 "gender": "female|male (best guess from the event description, default female)",
 "reason": "1 sentence, addressed to the user, why this look fits their event, colors and weather",
 "pieces": [
   {"type": "cloth", "label": "short name (e.g. 'Terracotta silk midi dress')", "prompt": "detailed visual description for an image generator: exact colors, fabric, cut — no person, no background"},
   ...
 ]
}`,
      { maxTokens: 700 }
    );

    const pieces = (plan.pieces ?? [])
      .filter((p) => APPLY_ORDER.includes(p.type))
      .sort((a, b) => APPLY_ORDER.indexOf(a.type) - APPLY_ORDER.indexOf(b.type))
      .slice(0, 3);
    if (!pieces.some((p) => p.type === "cloth")) {
      pieces.unshift({
        type: "cloth",
        label: "Outfit",
        prompt: "elegant outfit in the user's flattering colors",
      });
    }

    // 2 & 3. Generate each piece, then apply it on the current render
    let current = { buf, contentType };
    let anyApplied = false;
    const applied: { type: PieceType; label: string; image: string | null; applied: boolean }[] = [];

    for (const piece of pieces) {
      let productImage: string | null = null;
      let ok = false;
      try {
        const gen = await runTask("text-to-image/youcam", {
          prompt:
            `Professional e-commerce product photo, plain white background, no person, no face, no mannequin head. ` +
            piece.prompt,
          model: "youcam-image-v2",
        });
        const genUrl = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
        if (gen.task_status === "success" && genUrl) {
          const productRes = await fetch(genUrl);
          const productBuf = await productRes.arrayBuffer();
          productImage = `data:image/jpeg;base64,${Buffer.from(productBuf).toString("base64")}`;

          const feature = piece.type === "cloth" ? "cloth" : piece.type;
          const [srcFid, refFid] = await Promise.all([
            uploadImage(feature, current.buf, current.contentType),
            uploadImage(feature, productBuf, "image/jpeg", "piece.jpg"),
          ]);
          const body: Record<string, unknown> =
            piece.type === "cloth"
              ? { src_file_id: srcFid, ref_file_id: refFid, garment_category: "auto" }
              : { src_file_id: srcFid, ref_file_id: refFid, gender: plan.gender ?? "female" };
          const vto = await runTask(feature, body);

          if (
            piece.type === "cloth" &&
            vto.task_status === "error" &&
            String(vto.error).match(/pose|body|face/)
          ) {
            return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
          }
          const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
          if (vto.task_status === "success" && url) {
            const renderRes = await fetch(url);
            const renderBuf = await renderRes.arrayBuffer();
            current = { buf: renderBuf, contentType: "image/jpeg" };
            ok = true;
            anyApplied = true;
          }
        }
      } catch {
        // skip this piece, keep the previous render
      }
      applied.push({ type: piece.type, label: piece.label, image: productImage, applied: ok });
    }

    if (anyApplied) {
      const look = `data:${current.contentType};base64,${Buffer.from(current.buf).toString("base64")}`;
      return NextResponse.json({
        look,
        pieces: applied,
        templateId: `custom-${Date.now()}`,
        pieceLabel: applied
          .filter((p) => p.applied)
          .map((p) => p.label)
          .join(" · "),
        reason: plan.reason,
        generated: true,
      });
    }

    // Fallback: official template catalog
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
    return NextResponse.json({
      look: url ? await urlToDataUrl(url) : null,
      pieces: [{ type: "cloth", label: pick.piece_label, image: null, applied: true }],
      templateId: pick.template_id,
      pieceLabel: pick.piece_label,
      reason: pick.reason,
      generated: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
