/**
 * Client serveur YouCam API v2 — logique validée par les tests réels (TEST_RESULTS.md).
 * IMPORTANT :
 *  - un file_id n'est PAS réutilisable entre features → upload par feature
 *  - polling continu obligatoire sinon la tâche expire (InvalidTaskId, unités perdues)
 *  - shoes/bag exigent ref_file_id + gender ; hair-color exige pattern + palettes
 */

const BASE = "https://yce-api-01.makeupar.com/s2s/v2.0";

function authHeaders(): Record<string, string> {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("YOUCAM_API_KEY manquante dans les variables d'environnement");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || res.statusText;
    throw new Error(`YouCam ${method} ${path} → ${res.status} ${msg}`);
  }
  return json;
}

/** Upload une image (buffer) pour une feature donnée. Retourne le file_id. */
export async function uploadImage(
  feature: string,
  data: ArrayBuffer,
  contentType = "image/jpeg",
  fileName = "photo.jpg"
): Promise<string> {
  const init = await api("POST", `/file/${feature}`, {
    files: [{ content_type: contentType, file_name: fileName, file_size: data.byteLength }],
  });
  const file = (init.data ?? init.result)?.files?.[0];
  if (!file) throw new Error(`Upload init échoué pour ${feature}`);
  const req = file.requests?.[0] ?? { url: file.url, headers: file.headers, method: "PUT" };
  const put = await fetch(req.url, {
    method: req.method ?? "PUT",
    headers: req.headers ?? { "Content-Type": contentType },
    body: data,
  });
  if (!put.ok) throw new Error(`PUT S3 échoué (${put.status})`);
  return file.file_id as string;
}

export interface TaskResult {
  task_status: "success" | "error" | "running";
  error?: string | null;
  [k: string]: unknown;
}

/** Lance une tâche et poll jusqu'à success/error (timeout paramétrable). */
export async function runTask(
  feature: string,
  body: Record<string, unknown>,
  { timeoutMs = 180_000, intervalMs = 2500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<TaskResult> {
  const start = await api("POST", `/task/${feature}`, body);
  const taskId = (start.data ?? start.result)?.task_id;
  if (!taskId) throw new Error(`Pas de task_id pour ${feature}`);

  const t0 = Date.now();
  for (;;) {
    const poll = await api("GET", `/task/${feature}/${taskId}`);
    const d = (poll.data ?? poll.result ?? {}) as TaskResult;
    if (d.task_status === "success" || d.task_status === "error") return d;
    if (Date.now() - t0 > timeoutMs) {
      return { task_status: "error", error: "timeout_polling" };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** Extrait toutes les URLs http(s) d'un résultat (images S3 signées). */
export function findUrls(obj: unknown): string[] {
  const out: string[] = [];
  const walk = (o: unknown) => {
    if (typeof o === "string" && o.startsWith("http")) out.push(o);
    else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") Object.values(o).forEach(walk);
  };
  walk(obj);
  return out;
}

/** Solde d'unités du compte. */
export async function getCredit(): Promise<number> {
  const res = await fetch("https://yce-api-01.makeupar.com/s2s/v1.0/client/credit", {
    headers: authHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  return json?.results?.[0]?.amount ?? 0;
}
