"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shirt, Wand2, AlertCircle, Send } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { loadFlow, saveFlow, type FlowState } from "@/lib/flow";

/** Screen 5 — immersive dark (black + gold): the outfit tried on the user,
 *  with quick adjustments and a free-text request field. */
export default function Look() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [tried, setTried] = useState<string[]>([]);
  const ran = useRef(false);

  async function requestLook(adjustment?: string) {
    const f = loadFlow();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfie: f.selfieDataUrl,
          event: f.event,
          palette: f.palette,
          adjustment,
          excludeIds: adjustment ? tried : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          String(data.detail).includes("face") || String(data.detail).includes("body")
            ? "The try-on needs a photo where your upper body is visible. You can still continue to your summary."
            : `Try-on failed (${data.detail ?? data.error}). Please try again.`
        );
      }
      setTried((p) => [...p, data.templateId]);
      setReason(data.reason);
      const next = saveFlow({
        lookUrl: data.look,
        lookPieces: [{ kind: "outfit", label: data.pieceLabel }],
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
    requestLook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const ADJUSTMENTS = ["More formal", "More casual", "Something bolder", "Softer colors"];

  return (
    <main className="flex-1 flex flex-col bg-dark-background text-white">
      <StepIndicator current={5} dark />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center mt-2 text-dark-gold-light">
          Your look, on you
        </h1>

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-4" aria-live="polite">
            <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden glass-dark">
              {flow.selfieDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.selfieDataUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-30"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Shirt className="w-10 h-10 text-dark-gold-light animate-pulse" aria-hidden />
                <p className="text-sm text-white/70">
                  Your stylist is dressing you… up to a minute.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-10 mx-auto max-w-md glass-dark rounded-3xl p-6 text-center"
          >
            <AlertCircle className="w-8 h-8 mx-auto text-amber-300" aria-hidden />
            <p className="mt-3 text-sm text-white/85">{error}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => requestLook()}
                className="focus-ring tap-target rounded-2xl border border-dark-border px-5 py-2.5 text-sm font-medium text-white/85 hover:border-dark-gold"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => router.push("/summary")}
                className="focus-ring tap-target rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-5 py-2.5 text-sm font-semibold text-dark-primary"
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
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden glass-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flow.lookUrl} alt="The outfit tried on you" className="w-full" />
            </div>

            {flow.lookPieces?.[0] && (
              <p className="mt-4 text-center">
                <span className="text-dark-gold-light font-semibold">
                  {flow.lookPieces[0].label}
                </span>
                {reason && <span className="block mt-1 text-sm text-white/70">{reason}</span>}
              </p>
            )}

            {/* Quick adjustments */}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {ADJUSTMENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => requestLook(a.toLowerCase())}
                  className="focus-ring tap-target flex items-center gap-1.5 rounded-2xl border border-dark-border px-4 py-2.5 text-sm text-white/85 transition-colors duration-200 hover:border-dark-gold hover:text-dark-gold-light"
                >
                  <Wand2 className="w-3.5 h-3.5" aria-hidden />
                  {a}
                </button>
              ))}
            </div>

            {/* Free-text request */}
            <form
              className="mt-4 flex w-full max-w-sm gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) {
                  requestLook(custom.trim());
                  setCustom("");
                }
              }}
            >
              <label htmlFor="custom-request" className="sr-only">
                Tell your stylist what to change
              </label>
              <input
                id="custom-request"
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Tell me what to change…"
                className="focus-ring flex-1 tap-target rounded-2xl border border-dark-border bg-dark-primary/60 px-4 text-sm text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={!custom.trim()}
                aria-label="Send your request"
                className="focus-ring tap-target rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-4 text-dark-primary disabled:opacity-40"
              >
                <Send className="w-4 h-4" aria-hidden />
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push("/summary")}
              className="focus-ring tap-target mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-dark-gold to-dark-gold-light px-8 py-3.5 text-base font-semibold text-dark-primary shadow-lg shadow-dark-gold/25 transition-transform duration-300 hover:scale-[1.02]"
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
