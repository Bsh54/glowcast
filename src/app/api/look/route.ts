import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend — hybrid styling pipeline.
 *
 *  Main outfit: the stylist first shops the official 250-template catalog
 *  (template thumbnail == what gets rendered, so what we show matches what
 *  the user wears). Only when nothing in the catalog fits the event does it
 *  design a custom garment (text-to-image → ref VTO), accepting some visual
 *  drift as the trade-off for an infinite wardrobe.
 *
 *  Accessories (hat/bag/scarf): generated and applied in sequence, only when
 *  the event genuinely calls for them. */

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

type AccessoryType = "hat" | "bag" | "scarf";

interface Plan {
  gender: "female" | "male";
  reason: string;
  outfit:
    | { mode: "template"; template_id: string; label: string }
    | { mode: "custom"; label: string; prompt: string };
  accessories: { type: AccessoryType; label: string; prompt: string }[];
}

interface PieceOut {
  type: string;
  label: string;
  image: string | null;
  applied: boolean;
}

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

    const catalogEntries = (templates as { id: string; title: string; category: string; thumb: string }[])
      .filter((t) => !excludeIds.includes(t.id));
    const catalog = catalogEntries.map((t) => `${t.id} | ${t.title} | ${t.category}`).join("\n");

    // 1. The stylist plans the look
    const plan = await deepseekJson<Plan>(
      "You are a personal stylist. Reply with strict JSON only.",
      `Plan what this user should wear.
${eventContext(event, palette, adjustment)}

OUTFIT CATALOG (id | title | category):
${catalog}

Rules:
- STRONGLY prefer an outfit from the catalog (mode "template"): pick the one
  that best fits the event, weather and the user's flattering colors.
- Use mode "custom" ONLY if truly nothing in the catalog suits the event
  (e.g. a very specific cultural or themed dress code).
- Accessories: only include one if the event genuinely calls for it (a beach
  day may need a hat; a gala may deserve a bag). 0 to 2 accessories, types
  allowed: "hat", "bag", "scarf". Most events need none.

Return JSON:
{
 "gender": "female|male (best guess from the event description, default female)",
 "reason": "1 sentence, addressed to the user, why this look fits their event, colors and weather",
 "outfit": {"mode": "template", "template_id": "exact id from catalog", "label": "short human name"}
        OR {"mode": "custom", "label": "short human name", "prompt": "detailed visual description for an image generator: exact colors, fabric, cut — no person, no background"},
 "accessories": [ {"type": "hat", "label": "short name", "prompt": "visual description — no person"} ]
}`,
      { maxTokens: 700 }
    );

    const pieces: PieceOut[] = [];

    // 2. Apply the main outfit
    let current: { buf: ArrayBuffer; contentType: string } | null = null;

    if (plan.outfit.mode === "template") {
      const entry = catalogEntries.find((t) => t.id === (plan.outfit as { template_id: string }).template_id);
      if (!entry) {
        return NextResponse.json({ error: "stylist_failed", detail: "invalid template id" }, { status: 500 });
      }
      const fid = await uploadImage("cloth", buf, contentType);
      const vto = await runTask("cloth", { src_file_id: fid, template_id: entry.id });
      if (vto.task_status !== "success") {
        return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
      }
      const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
      if (!url) {
        return NextResponse.json({ error: "vto_failed", detail: "no result image" }, { status: 500 });
      }
      const renderRes = await fetch(url);
      current = { buf: await renderRes.arrayBuffer(), contentType: "image/jpeg" };
      // The catalog thumbnail IS the garment the engine renders — coherent.
      pieces.push({ type: "cloth", label: plan.outfit.label, image: entry.thumb, applied: true });
    } else {
      // Custom design — rare path, catalog didn't fit the event
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
      const productImage = `data:image/jpeg;base64,${Buffer.from(productBuf).toString("base64")}`;
      const [srcFid, refFid] = await Promise.all([
        uploadImage("cloth", buf, contentType),
        uploadImage("cloth", productBuf, "image/jpeg", "garment.jpg"),
      ]);
      const vto = await runTask("cloth", {
        src_file_id: srcFid,
        ref_file_id: refFid,
        garment_category: "auto",
      });
      if (vto.task_status !== "success") {
        return NextResponse.json({ error: "vto_failed", detail: vto.error }, { status: 422 });
      }
      const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
      if (!url) {
        return NextResponse.json({ error: "vto_failed", detail: "no result image" }, { status: 500 });
      }
      const renderRes = await fetch(url);
      current = { buf: await renderRes.arrayBuffer(), contentType: "image/jpeg" };
      pieces.push({ type: "cloth", label: plan.outfit.label, image: productImage, applied: true });
    }

    // 3. Accessories in sequence (best effort — a failure never breaks the look)
    for (const acc of (plan.accessories ?? []).slice(0, 2)) {
      let ok = false;
      let productImage: string | null = null;
      try {
        const gen = await runTask("text-to-image/youcam", {
          prompt:
            `Professional e-commerce product photo of a single ${acc.type}, plain white background, no person, no face. ` +
            acc.prompt,
          model: "youcam-image-v2",
        });
        const genUrl = findUrls(gen).find((u) => u.includes("amazonaws") || u.includes("s3"));
        if (gen.task_status === "success" && genUrl) {
          const productRes = await fetch(genUrl);
          const productBuf = await productRes.arrayBuffer();
          productImage = `data:image/jpeg;base64,${Buffer.from(productBuf).toString("base64")}`;
          const [srcFid, refFid] = await Promise.all([
            uploadImage(acc.type, current.buf, current.contentType),
            uploadImage(acc.type, productBuf, "image/jpeg", "acc.jpg"),
          ]);
          const vto = await runTask(acc.type, {
            src_file_id: srcFid,
            ref_file_id: refFid,
            gender: plan.gender ?? "female",
          });
          const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
          if (vto.task_status === "success" && url) {
            const renderRes = await fetch(url);
            current = { buf: await renderRes.arrayBuffer(), contentType: "image/jpeg" };
            ok = true;
          }
        }
      } catch {
        // keep previous render
      }
      pieces.push({ type: acc.type, label: acc.label, image: productImage, applied: ok });
    }

    const look = `data:${current.contentType};base64,${Buffer.from(current.buf).toString("base64")}`;
    return NextResponse.json({
      look,
      pieces,
      templateId:
        plan.outfit.mode === "template"
          ? (plan.outfit as { template_id: string }).template_id
          : `custom-${Date.now()}`,
      pieceLabel: pieces
        .filter((p) => p.applied)
        .map((p) => p.label)
        .join(" · "),
      reason: plan.reason,
      generated: plan.outfit.mode === "custom",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
