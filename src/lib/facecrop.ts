/** Client-side smart crop to tame YouCam's framing requirements
 *  (face ≥ 60% of image width, whole head in frame, frontal pose).
 *
 *  When the browser exposes the FaceDetector API (Chrome/Edge), we detect the
 *  face and crop a 3:4 portrait around it with a comfortable margin. When the
 *  API is unavailable, the original image is returned untouched. */

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface FaceDetectorLike {
  detect(image: ImageBitmapSource): Promise<DetectedFace[]>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

export async function autoCropFace(dataUrl: string): Promise<string> {
  if (typeof window === "undefined" || !window.FaceDetector) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(img);
    if (!faces.length) return dataUrl;

    const box = faces[0].boundingBox;

    // Target: the face fills ~55% of the crop width, head fully visible.
    const cropW = Math.min(img.width, box.width / 0.55);
    const cropH = Math.min(img.height, (cropW * 4) / 3);
    const faceCx = box.x + box.width / 2;
    // Slight upward bias so hair and forehead stay inside the frame
    const faceCy = box.y + box.height * 0.42;

    let x = faceCx - cropW / 2;
    let y = faceCy - cropH / 2;
    x = Math.max(0, Math.min(img.width - cropW, x));
    y = Math.max(0, Math.min(img.height - cropH, y));

    // Only crop when it actually helps (face currently small in frame)
    if (box.width / img.width > 0.5) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, x, y, cropW, cropH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
