"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Printer, RotateCcw, Sparkles, Shirt } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { loadFlow, resetFlow, type FlowState } from "@/lib/flow";

/** Screen 6 — editorial summary card the user can keep (print/screenshot). */
export default function Summary() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState | null>(null);

  useEffect(() => {
    const f = loadFlow();
    if (!f.event || !f.selfieDataUrl) {
      router.replace("/");
      return;
    }
    setFlow(f);
  }, [router]);

  if (!flow) return null;

  const dateLabel = flow.event
    ? new Date(flow.event.date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <main className="iridescent-bg flex-1 flex flex-col">
      <div className="print:hidden">
        <StepIndicator current={6} />
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-3xl p-6 sm:p-10 print:shadow-none"
        >
          {/* Header */}
          <header className="text-center border-b border-border pb-6">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-accent">
              GlowCast · Your event plan
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl leading-snug">
              {flow.event?.description && flow.event.description.length > 90
                ? flow.event.description.slice(0, 90) + "…"
                : flow.event?.description}
            </h1>
            <p className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" aria-hidden />
                {dateLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" aria-hidden />
                {flow.event?.city}
              </span>
            </p>
          </header>

          {/* Look + palette */}
          <div className="mt-8 grid sm:grid-cols-2 gap-6 items-start">
            <div>
              {flow.lookUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.lookUrl}
                  alt="Your final look"
                  className="rounded-2xl w-full shadow-md"
                />
              ) : (
                flow.selfieDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flow.selfieDataUrl}
                    alt="Your selfie"
                    className="rounded-2xl w-full shadow-md"
                  />
                )
              )}
              {flow.lookPieces?.[0] && (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <Shirt className="w-4 h-4 text-accent" aria-hidden />
                  <span className="font-medium">{flow.lookPieces[0].label}</span>
                </p>
              )}
            </div>

            <div className="space-y-6">
              {flow.palette && (
                <section>
                  <h2 className="text-lg">
                    Your colors —{" "}
                    <span className="text-accent uppercase tracking-widest text-sm">
                      {flow.palette.season}
                    </span>
                  </h2>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {flow.palette.colors.map((hex) => (
                      <div key={hex} className="flex flex-col items-center gap-1">
                        <div
                          className="w-full aspect-square rounded-xl border border-border"
                          style={{ backgroundColor: hex }}
                          role="img"
                          aria-label={`Color ${hex}`}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Show these swatches in-store or search them online.
                  </p>
                </section>
              )}

              {flow.globalScore != null && (
                <section className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
                  Skin score today:{" "}
                  <span className="font-semibold text-primary tabular-nums">
                    {flow.globalScore}/100
                  </span>
                </section>
              )}
            </div>
          </div>

          {/* Skincare plan */}
          {flow.skincarePlan && flow.skincarePlan.length > 0 && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-lg">
                <Sparkles className="w-4 h-4 text-accent" aria-hidden />
                Skincare plan until the big day
              </h2>
              <ol className="mt-3 space-y-2">
                {flow.skincarePlan.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-accent/25"
          >
            <Printer className="w-4 h-4" aria-hidden />
            Save as PDF
          </button>
          <button
            type="button"
            onClick={() => {
              resetFlow();
              router.push("/");
            }}
            className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3 text-sm font-medium hover:border-primary/50"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            Start over with another event
          </button>
        </div>
      </div>
    </main>
  );
}
