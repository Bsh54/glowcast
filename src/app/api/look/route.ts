import { NextRequest, NextResponse } from "next/server";
import { uploadImage, runTask, findUrls } from "@/lib/youcam";
import { deepseekJson } from "@/lib/deepseek";
import { dataUrlToBuffer, urlToDataUrl } from "@/lib/image";
import { cleanText } from "@/lib/guard";
import templates from "@/data/cloth-templates.json";

export const maxDuration = 300;

/** Screen 5 backend — four looks at once.
 *  The stylist picks 4 distinct outfits from the official catalog (four
 *  directions within the user's palette), and all four are rendered on the
 *  user in parallel. No choice to make — the four renders are the result. */

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
  picks: { template_id: string; label: string; style: string }[];
}

function eventContext(event: LookBody["event"], palette: LookBody["palette"], adjustment?: string) {
  return `Event: "${event?.description ?? "elegant occasion"}" (in ${event?.daysLeft ?? "?"} days, city: ${event?.city ?? "?"}).
${
  event?.weather
    ? `Weather forecast that day: ${event.weather.condition}, ${event.weather.tempMinC}–${event.weather.tempMaxC}°C${
        event.weather.precipitationChance != null
          ? `, ${event.weather.precipitationChance}% chance of rain`
          : ""
      }. Every outfit must work in these conditions.`
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

    // 1. The stylist picks 4 distinct outfits
    const plan = await deepseekJson<Plan>(
      `You are a personal stylist. Reply with strict JSON only.
Hard rules for every text field: address the user as "you"; max 140 characters;
no brand names; no medical or beauty-result promises; plain warm English.`,
      `Pick FOUR distinct outfits from the catalog for this user — four different
directions that all respect their flattering colors and the dress code:
1) a safe classic, 2) a bolder statement, 3) a softer/relaxed take,
4) your stylist's wildcard.
${eventContext(event, palette, adjustment)}

OUTFIT CATALOG (id | title | category):
${catalog}

Return JSON:
{
 "reason": "1 short sentence, addressed to the user, why these four directions fit their event, colors and weather",
 "picks": [
   {"template_id": "exact id from catalog", "label": "short human name", "style": "Classic|Statement|Relaxed|Wildcard"},
   ... exactly 4 picks, 4 different template_ids ...
 ]
}`,
      { maxTokens: 600 }
    );

    const picks = (plan.picks ?? [])
      .filter((p) => catalogEntries.some((t) => t.id === p.template_id))
      .filter((p, i, arr) => arr.findIndex((q) => q.template_id === p.template_id) === i)
      .slice(0, 4);
    if (picks.length === 0) {
      return NextResponse.json({ error: "stylist_failed", detail: "no valid picks" }, { status: 500 });
    }

    // 2. Render all picks in parallel (one upload per task — file ids are single-use)
    const results = await Promise.all(
      picks.map(async (pick) => {
        try {
          const fid = await uploadImage("cloth", buf, contentType);
          const vto = await runTask("cloth", { src_file_id: fid, template_id: pick.template_id });
          if (vto.task_status !== "success") {
            return { pick, look: null, error: String(vto.error ?? "vto_failed") };
          }
          const url = findUrls(vto).find((u) => u.includes("amazonaws") || u.includes("s3"));
          return { pick, look: url ? await urlToDataUrl(url) : null, error: null };
        } catch (e) {
          return { pick, look: null, error: e instanceof Error ? e.message : "vto_failed" };
        }
      })
    );

    const looks = results
      .filter((r) => r.look)
      .map((r) => ({
        url: r.look as string,
        label: cleanText(r.pick.label, 60, "Your look"),
        style: cleanText(r.pick.style, 20, ""),
        templateId: r.pick.template_id,
      }));

    if (looks.length === 0) {
      const firstError = results.find((r) => r.error)?.error ?? "vto_failed";
      const status = /pose|body|face/.test(firstError) ? 422 : 500;
      return NextResponse.json({ error: "vto_failed", detail: firstError }, { status });
    }

    return NextResponse.json({
      looks,
      reason: cleanText(
        plan.reason,
        160,
        "Four directions in your colors, all matched to your event."
      ),
      triedIds: picks.map((p) => p.template_id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "look_failed", detail: msg }, { status: 500 });
  }
}
