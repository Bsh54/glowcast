"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shirt, Wand2, AlertCircle } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import BackButton from "@/components/BackButton";
import PhotoPicker from "@/components/PhotoPicker";
import { loadFlow, saveFlow, type FlowState } from "@/lib/flow";

/** Screen 5 — the outfit tried on the user (same light theme as the site).
 *  The Clothes VTO needs the upper body visible: if the selfie is too tight
 *  (error_pose), we ask for a dedicated upper-body photo. */
export default function Look() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsBodyPhoto, setNeedsBodyPhoto] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [tried, setTried] = useState<string[]>([]);
  const [needsPhotoIntro, setNeedsPhotoIntro] = useState(false);
  const ran = useRef(false);

  async function requestLook(adjustment?: string, photoOverride?: string) {
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
              "Upload a photo taken from a bit further away."
          );
        }
        throw new Error(`Try-on failed (${detail || data.error}). Please try again.`);
      }
      setTried((p) => [...p, data.templateId]);
      setReason(data.reason);
      interface PieceOut { type: string; label: string; image: string | null; applied: boolean }
      const next = saveFlow({
        lookUrl: data.look,
        lookPieces: ((data.pieces ?? []) as PieceOut[]).map((p) => ({
          kind: p.type,
          label: p.label,
          image: p.image ?? undefined,
          applied: p.applied,
        })),
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
    if (f.lookUrl) {
      setLoading(false);
      return;
    }
    if (ran.current) return;
    ran.current = true;
    if (f.lookPhotoDataUrl) {
      requestLook();
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

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center mt-2">Your look, on you</h1>

        {needsPhotoIntro && !loading && !error && !flow.lookUrl && (
          <div className="mt-8 mx-auto max-w-md glass rounded-3xl p-6 text-center">
            <h2 className="text-lg">One photo for the fitting</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The try-on works best with a photo where your upper body is
              visible (shoulders to waist, or full body). Take one or upload
              one — or use your selfie if it&apos;s wide enough.
            </p>
            <div className="mt-5">
              <PhotoPicker
                guide="wide"
                confirmLabel="Use for the fitting"
                onConfirm={(dataUrl) => {
                  saveFlow({ lookPhotoDataUrl: dataUrl });
                  setNeedsPhotoIntro(false);
                  requestLook(undefined, dataUrl);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setNeedsPhotoIntro(false);
                requestLook(undefined, loadFlow().selfieDataUrl);
              }}
              className="focus-ring tap-target mt-4 rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:border-primary/50"
            >
              Use my selfie instead
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-4" aria-live="polite">
            <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-3xl overflow-hidden glass">
              {flow.selfieDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.selfieDataUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-30"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Shirt className="w-10 h-10 text-primary animate-pulse" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Your stylist is dressing you… up to a minute.
                </p>
              </div>
            </div>
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
                  confirmLabel="Use for the try-on"
                  onConfirm={(dataUrl) => {
                    saveFlow({ lookPhotoDataUrl: dataUrl });
                    requestLook(undefined, dataUrl);
                  }}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {!needsBodyPhoto && (
                <button
                  type="button"
                  onClick={() => requestLook()}
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

        {!loading && !error && flow.lookUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col items-center"
          >
            {(() => {
              const withImages = (flow.lookPieces ?? []).filter((p) => p.image);
              return (
                <div className="w-full max-w-2xl grid gap-4 sm:grid-cols-[1fr_1.8fr] items-start">
                  {/* The pieces designed for this event (only what fits) */}
                  {withImages.length > 0 && (
                    <div className="grid gap-3">
                      {withImages.map((p) => (
                        <figure
                          key={p.label}
                          className="relative rounded-3xl overflow-hidden glass"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image}
                            alt={p.label}
                            className="w-full aspect-square object-cover"
                          />
                          <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-xs text-white">
                            {p.label}
                            {p.applied === false && " (couldn't be applied)"}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  {/* The render on you */}
                  <figure
                    className={[
                      "relative rounded-3xl overflow-hidden glass",
                      withImages.length === 0 ? "sm:col-span-2 max-w-sm mx-auto" : "",
                    ].join(" ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flow.lookUrl}
                      alt="The look tried on you"
                      className="w-full object-cover"
                    />
                    <figcaption className="absolute top-3 left-3 rounded-full bg-primary/80 px-3 py-1 text-xs text-white">
                      On you
                    </figcaption>
                  </figure>
                </div>
              );
            })()}

            {flow.lookPieces && flow.lookPieces.length > 0 && (
              <p className="mt-4 text-center">
                <span className="text-primary font-semibold">
                  {flow.lookPieces
                    .filter((p) => p.applied !== false)
                    .map((p) => p.label)
                    .join(" · ")}
                </span>
                {reason && (
                  <span className="block mt-1 text-sm text-muted-foreground max-w-sm">
                    {reason}
                  </span>
                )}
              </p>
            )}

            {/* Quick adjustments */}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {ADJUSTMENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => requestLook(a.toLowerCase())}
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
              I love it — my summary
              <ArrowRight className="w-5 h-5" aria-hidden />
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
