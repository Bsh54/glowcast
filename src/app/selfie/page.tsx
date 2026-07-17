"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Upload, RefreshCw, Check, AlertCircle } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { loadFlow, saveFlow } from "@/lib/flow";

/** Screen 2 — immersive dark (black + gold variant of the style guide).
 *  Guided selfie capture: camera with a golden face guide, or file upload. */
export default function SelfieCapture() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loadFlow().event) router.replace("/");
  }, [router]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraError(
        "We couldn't access your camera. You can allow it in your browser settings, or upload a photo instead."
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Mirror back to natural orientation
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

  function confirm() {
    if (!preview) return;
    saveFlow({ selfieDataUrl: preview });
    router.push("/diagnosis");
  }

  return (
    <main className="flex-1 flex flex-col bg-dark-background text-white">
      <StepIndicator current={2} dark />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-md"
        >
          <h1 className="text-3xl sm:text-4xl text-dark-gold-light">Your selfie</h1>
          <p className="mt-2 text-sm text-white/70">
            Face the camera straight on, in good light, forehead visible, whole
            head inside the golden circle.
          </p>
        </motion.div>

        <div className="relative mt-8 w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden glass-dark">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your selfie preview" className="w-full h-full object-cover" />
          ) : cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/50">
              <Camera className="w-10 h-10" aria-hidden />
              <p className="text-sm">Camera preview</p>
            </div>
          )}

          {/* Golden face guide */}
          {!preview && (
            <div aria-hidden className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[68%] aspect-[3/4] rounded-full border-2 border-dashed border-dark-gold-light/70" />
            </div>
          )}
        </div>

        {cameraError && (
          <p
            role="alert"
            className="mt-4 flex items-center gap-2 text-sm text-amber-300 max-w-sm text-center"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
            {cameraError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {preview ? (
            <>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-dark-border px-5 py-3 text-sm font-medium text-white/80 transition-colors duration-200 hover:border-dark-gold"
              >
                <RefreshCw className="w-4 h-4" aria-hidden />
                Retake
              </button>
              <button
                type="button"
                onClick={confirm}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-6 py-3 text-sm font-semibold text-dark-primary shadow-lg shadow-dark-gold/25 transition-transform duration-200 hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" aria-hidden />
                Use this photo
              </button>
            </>
          ) : cameraOn ? (
            <button
              type="button"
              onClick={capture}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-8 py-3.5 text-base font-semibold text-dark-primary shadow-lg shadow-dark-gold/25 transition-transform duration-200 hover:scale-[1.02]"
            >
              <Camera className="w-5 h-5" aria-hidden />
              Capture
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-6 py-3 text-sm font-semibold text-dark-primary shadow-lg shadow-dark-gold/25 transition-transform duration-200 hover:scale-[1.02]"
              >
                <Camera className="w-4 h-4" aria-hidden />
                Open camera
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-dark-border px-5 py-3 text-sm font-medium text-white/80 transition-colors duration-200 hover:border-dark-gold"
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
                aria-label="Upload a selfie"
              />
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-white/40 max-w-sm text-center">
          Your photo is only used for the analysis you request and is never kept
          beyond your session.
        </p>
      </div>
    </main>
  );
}
