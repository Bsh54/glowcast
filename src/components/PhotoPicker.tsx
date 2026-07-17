"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload, RefreshCw, Check, AlertCircle } from "lucide-react";
import { downscaleDataUrl } from "@/lib/resize";

/** Reusable photo input: camera capture or file upload, returns a data URL.
 *  Used on step 5 when the try-on needs a wider, upper-body photo. */
export default function PhotoPicker({
  onConfirm,
  confirmLabel = "Use this photo",
  guide = "wide", // "wide" = upper-body framing hint
}: {
  onConfirm: (dataUrl: string) => void;
  confirmLabel?: string;
  guide?: "wide" | "face";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // The <video> element only mounts after cameraOn flips true — attach the
  // stream here, not in startCamera, or the preview stays blank.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Camera unavailable — you can upload a photo instead.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-3xl overflow-hidden glass">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Photo preview" className="w-full h-full object-cover" />
        ) : cameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="w-8 h-8" aria-hidden />
            <p className="text-xs px-6 text-center">
              {guide === "wide"
                ? "Step back so your shoulders and torso are visible"
                : "Camera preview"}
            </p>
          </div>
        )}
        {!preview && cameraOn && guide === "wide" && (
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[86%] rounded-3xl border-2 border-dashed border-accent/60" />
          </div>
        )}
      </div>

      {cameraError && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
          {cameraError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {preview ? (
          <>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium hover:border-primary/50"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              Retake
            </button>
            <button
              type="button"
              onClick={async () => onConfirm(await downscaleDataUrl(preview))}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-accent/25"
            >
              <Check className="w-4 h-4" aria-hidden />
              {confirmLabel}
            </button>
          </>
        ) : cameraOn ? (
          <button
            type="button"
            onClick={capture}
            className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-8 py-3 text-base font-semibold text-on-primary shadow-lg shadow-accent/25"
          >
            <Camera className="w-5 h-5" aria-hidden />
            Capture
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={startCamera}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-accent/25"
            >
              <Camera className="w-4 h-4" aria-hidden />
              Take a photo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium hover:border-primary/50"
            >
              <Upload className="w-4 h-4" aria-hidden />
              Upload a photo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={onFile}
              className="sr-only"
              aria-label="Upload a photo"
            />
          </>
        )}
      </div>
    </div>
  );
}
