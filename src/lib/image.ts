/** Helpers to move images between the browser (data URLs) and YouCam (buffers). */

export function dataUrlToBuffer(dataUrl: string): { buf: ArrayBuffer; contentType: string } {
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL");
  const bin = Buffer.from(m[2], "base64");
  return { buf: bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), contentType: m[1] };
}

/** Downloads a (short-lived, signed) result URL and re-encodes it as a data URL
 *  so the client never depends on expiring S3 links. */
export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch result image (${res.status})`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}
