/** DeepSeek client (OpenAI-compatible API). Used for orchestration:
 *  event parsing, color season, outfit selection, skincare plan. */

const BASE = "https://api.deepseek.com/chat/completions";

export async function deepseekJson<T>(
  system: string,
  user: string,
  { maxTokens = 900 }: { maxTokens?: number } = {}
): Promise<T> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is missing");
  const res = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
