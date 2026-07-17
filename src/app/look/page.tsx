"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shirt, Wand2, AlertCircle } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import BackButton from "@/components/BackButton";
import PhotoPicker from "@/components/PhotoPicker";
import { loadFlow, saveFlow, type FlowState, type LookImage } from "@/lib/flow";

/** Screen 5 — four looks rendered on the user, shown together.
 *  Nothing to pick: the four directions ARE the result. */
export default function Look() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsBodyPhoto, setNeedsBodyPhoto] = useState(false);
  const [needsPhotoIntro, setNeedsPhotoIntro] = useState(false);
  const [tried, setTried] = useState<string[]>([]);
  const ran = useRef(false);

  async function requestLooks(adjustment?: string, photoOverride?: string) {
    const f = loadFlow();
    const photo = photoOverride ?? f.lookPhotoDataUrl ?? f.selfieDataUrl;
    setLoading(true);
    setError(null);
    setNeedsBodyPhoto(false);
    try {
      const res = await fetch("/api/look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfie: photo,
          event: f.event,
          palette: f.palette,
          adjustment,
          excludeIds: adjustment ? tried : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = String(data.detail ?? "");
        if (detail.includes("pose") || detail.includes("body") || detail.includes("face")) {
          setNeedsBodyPhoto(true);
          throw new Error(
            "The try-on needs your upper body in the photo (shoulders to waist). " +
              "Take or upload a photo from a bit further away."
          );
        }
        throw new Error(`Try-on failed (${detail || data.error}). Please try again.`);
      }
      setTried((p) => [...p, ...(data.triedIds ?? [])]);
      const next = saveFlow({
        looks: data.looks as LookImage[],
        lookReason: data.reason,
      });
      setFlow(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const f = loadFlow();
    if (!f.selfieDataUrl || !f.palette) {
      router.replace("/");
      return;
    }
    setFlow(f);
    if (f.looks && f.looks.length > 0) {
      setLoading(false);
      return;
    }
    if (ran.current) return;
    ran.current = true;
    if (f.lookPhotoDataUrl) {
      requestLooks();
    } else {
      // The try-on needs the upper body visible — ask for a dedicated
      // photo upfront instead of failing later.
      setNeedsPhotoIntro(true);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const ADJUSTMENTS = ["More formal", "More casual", "Something bolder", "Softer colors"];

  return (
    <main className="iridescent-bg relative flex-1 flex flex-col">
      <BackButton />
      <StepIndicator current={5} />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center mt-2">Your looks, on you</h1>

        {needsPhotoIntro && !loading && !error && !flow.looks && (
          <div className="mt-8 mx-auto max-w-md glass rounded-3xl p-6 text-center">
            <h2 className="text-lg">One photo for the fitting</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The try-on works best with a photo where your upper body is
              visible (shoulders to waist, or full body). Take one or upload one.
            </p>
            <div className="mt-5">
              <PhotoPicker
                guide="wide"
                confirmLabel="Use for the fitting"
                onConfirm={(dataUrl) => {
                  saveFlow({ lookPhotoDataUrl: dataUrl });
                  setNeedsPhotoIntro(false);
                  requestLooks(undefined, dataUrl);
                }}
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-4" aria-live="polite">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-3xl overflow-hidden glass">
                  <div className="skeleton absolute inset-0" />
                  <Shirt
                    className="absolute inset-0 m-auto w-8 h-8 text-primary/60 animate-pulse"
                    aria-hidden
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Your stylist is preparing four directions… about a minute.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-10 mx-auto max-w-md glass rounded-3xl p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-destructive" aria-hidden />
            <p className="mt-3 text-sm">{error}</p>

            {needsBodyPhoto && (
              <div className="mt-5">
                <PhotoPicker
                  guide="wide"
                  confirmLabel="Use for the fitting"
                  onConfirm={(dataUrl) => {
                    saveFlow({ lookPhotoDataUrl: dataUrl });
                    requestLooks(undefined, dataUrl);
                  }}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {!needsBodyPhoto && (
                <button
                  type="button"
                  onClick={() => requestLooks()}
                  className="focus-ring tap-target rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:border-primary/50"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/summary")}
                className="focus-ring tap-target rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:border-primary/50"
              >
                Go to summary
              </button>
            </div>
          </div>
        )}

        {!loading && !error && flow.looks && flow.looks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col items-center"
          >
            {flow.lookReason && (
              <p className="mb-5 text-sm text-muted-foreground text-center max-w-lg">
                {flow.lookReason}
              </p>
            )}

            {/* The four looks — nothing to pick, just look */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {flow.looks.map((look, i) => (
                <motion.figure
                  key={look.url.slice(-24)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative rounded-3xl overflow-hidden glass"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={look.url}
                    alt={`${look.label} tried on you`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-2.5 pt-8 text-white">
                    <span className="block text-sm font-semibold">{look.label}</span>
                    {look.style && (
                      <span className="text-[11px] uppercase tracking-widest text-white/80">
                        {look.style}
                      </span>
                    )}
                  </figcaption>
                </motion.figure>
              ))}
            </div>

            {/* Regenerate four new directions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {ADJUSTMENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => requestLooks(a.toLowerCase())}
                  className="focus-ring tap-target flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm transition-colors duration-200 hover:border-primary/50 hover:text-primary"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden />
                  {a}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/summary")}
              className="focus-ring tap-target mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-8 py-3.5 text-base font-semibold text-on-primary shadow-xl shadow-accent/25 transition-transform duration-300 hover:scale-[1.02]"
            >
              My summary
              <ArrowRight className="w-5 h-5" aria-hidden />
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
