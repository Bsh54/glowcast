"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, AlertCircle, ChevronsLeftRight } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { loadFlow, saveFlow, type FlowState } from "@/lib/flow";

/** Screen 4 — before/after skin projection. The divider line is draggable
 *  directly on the image (plus a hidden range input for keyboard access). */
export default function Projection() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const ran = useRef(false);

  useEffect(() => {
    const f = loadFlow();
    if (!f.selfieDataUrl || !f.scores) {
      router.replace("/");
      return;
    }
    setFlow(f);
    if (f.improvedUrl && f.skincarePlan) {
      setLoading(false);
      return;
    }
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/projection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selfie: f.selfieDataUrl,
            scores: f.scores,
            daysLeft: f.event?.daysLeft ?? 7,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ?? "Projection failed");
        const next = saveFlow({ improvedUrl: data.improved, skincarePlan: data.plan });
        setFlow(next);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setLoading(false);
      }
    })();
  }, [router]);

  function setFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSlider(Math.min(95, Math.max(5, pct)));
  }

  return (
    <main className="iridescent-bg flex-1 flex flex-col">
      <StepIndicator current={4} />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center mt-2">
          Your skin&apos;s <span className="italic text-primary">potential</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-lg mx-auto">
          This is what your skin can look like with the right care before your
          event — not a promise, a direction.
        </p>

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-4" aria-live="polite">
            <div className="skeleton w-full max-w-md aspect-[4/3] rounded-3xl" />
            <p className="text-sm text-muted-foreground">
              Projecting your glow… this can take up to a minute.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-10 mx-auto max-w-md glass rounded-3xl p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-destructive" aria-hidden />
            <p className="mt-3 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/look")}
              className="focus-ring tap-target mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
            >
              Skip to my look
              <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}

        {!loading && !error && flow.improvedUrl && flow.selfieDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Before/after — drag the line directly on the image */}
            <div
              ref={containerRef}
              className="relative mt-8 mx-auto max-w-md aspect-[4/3] rounded-3xl overflow-hidden select-none glass touch-none cursor-ew-resize"
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (dragging.current) setFromClientX(e.clientX);
              }}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flow.improvedUrl}
                alt="Your skin with the right care"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flow.selfieDataUrl}
                  alt="Your skin today"
                  className="h-full object-cover saturate-[0.85]"
                  style={{ width: `${10000 / slider}%`, maxWidth: "none" }}
                  draggable={false}
                />
              </div>

              {/* Draggable divider line + handle */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${slider}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <ChevronsLeftRight className="w-4 h-4 text-primary" />
                </div>
              </div>

              <span className="absolute top-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white pointer-events-none">
                Today
              </span>
              <span className="absolute top-3 right-3 rounded-full bg-primary/80 px-3 py-1 text-xs text-white pointer-events-none">
                Your potential
              </span>
            </div>

            {/* Keyboard-accessible fallback */}
            <label htmlFor="ba-slider" className="sr-only">
              Compare before and after
            </label>
            <input
              id="ba-slider"
              type="range"
              min={5}
              max={95}
              value={Math.round(slider)}
              onChange={(e) => setSlider(Number(e.target.value))}
              className="sr-only"
            />

            {/* Skincare plan */}
            {flow.skincarePlan && flow.skincarePlan.length > 0 && (
              <div className="glass mt-8 rounded-3xl p-6">
                <h2 className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-5 h-5 text-accent" aria-hidden />
                  Your plan for the next {flow.event?.daysLeft} days
                </h2>
                <ol className="mt-4 space-y-3">
                  {flow.skincarePlan.map((step, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.08 }}
                      className="flex gap-3 text-sm"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold">
                        {i + 1}
                      </span>
                      {step}
                    </motion.li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => router.push("/look")}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-8 py-3.5 text-base font-semibold text-on-primary shadow-xl shadow-accent/25 transition-transform duration-300 hover:scale-[1.02]"
              >
                Now, my look
                <ArrowRight className="w-5 h-5" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
