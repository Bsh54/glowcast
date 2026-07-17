import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend: DeepSeek picks the best outfit template for the event,
 *  weather and personal palette, then Clothes VTO renders it on the user. */

interface LookBody {
  selfie: string;
  event?: { description: string; city: string; daysLeft: number };
  palette?: { season: string; colors: string[]; avoid: string[] };
  adjustment?: string; // e.g. "more formal", "more casual", free text
  excludeIds?: string[]; // previously tried templates
}

interface Pick {
  template_id: string;
  reason: string;
  piece_label: string;
}

export async function POST(req: NextRequest) {
  try {
    const { selfie, event, palette, adjustment, excludeIds = [] } =
      (await req.json()) as LookBody;
    const { buf, contentType } = dataUrlToBuffer(selfie);

    const catalog = (templates as { id: string; title: string; category: string }[])
      .filter((t) => !excludeIds.includes(t.id))
      .map((t) => `${t.id} | ${t.title} | ${t.category}`)
      .join("\n");

    const pick = await deepseekJson<Pick>(
      "You are a personal stylist. Reply with strict JSON only.",
      `Choose ONE outfit template for this user.
Event: "${event?.description ?? "elegant occasion"}" (in ${event?.daysLeft ?? "?"} days, city: ${event?.city ?? "?"}).
Personal color season: ${palette?.season ?? "unknown"}. Flattering colors: ${palette?.colors?.join(", ") ?? "any"}. Colors to avoid: ${palette?.avoid?.join(", ") ?? "none"}.
${adjustment ? `User adjustment request: "${adjustment}".` : ""}

Catalog (id | title | category):
${catalog}

Return JSON: {"template_id": "exact id from catalog", "reason": "1 sentence, addressed to the user, why this outfit fits their event and colors", "piece_label": "short human name of the outfit"}`,
      { maxTokens: 400 }
    );

    const valid = (templates as { id: string }[]).some((t) => t.id === pick.template_id);
    if (!valid) {
      return NextResponse.json(
        { error: "stylist_failed", detail: "invalid template id" },
        { status: 500 }
      );
    }

    const fid = await uploadImage("cloth", buf, contentType);
    const vto = await runTask("cloth", { src_file_id: fid, template_id: pick.template_id });

    if (vto.task_status !== "success") {
      return NextResponse.json(
        { error: "vto_failed", detail: vto.error },
        { status: 422 }
      );
    }

    const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
    const look = url ? await urlToDataUrl(url) : null;

    return NextResponse.json({
      look,
      templateId: pick.template_id,
      pieceLabel: pick.piece_label,
      reason: pick.reason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
