"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Download, RotateCcw, Sparkles } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import BackButton from "@/components/BackButton";
import PlanTimeline from "@/components/PlanTimeline";
import { loadFlow, resetFlow, type FlowState } from "@/lib/flow";
import { downloadPlanPdf } from "@/lib/pdf";

/** Screen 6 — editorial summary: the four looks, the palette, the plan —
 *  everything, with a direct PDF download. */
export default function Summary() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  async function onDownload() {
    if (!flow || downloading) return;
    setDownloading(true);
    try {
      await downloadPlanPdf(flow);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="iridescent-bg flex-1 flex flex-col">
      <div className="relative">
        <BackButton href="/look" />
        <StepIndicator current={6} />
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-3xl p-4 sm:p-10"
        >
          {/* Header */}
          <header className="text-center border-b border-border pb-6">
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-accent">
              GlowCast · Your event plan
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl leading-snug">
              {flow.eventTitle ?? "Your Big Day"}
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
            {flow.event?.weather && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {flow.event.weather.condition}, {flow.event.weather.tempMinC}–
                {flow.event.weather.tempMaxC}°C
                {flow.event.weather.precipitationChance != null &&
                  ` · ${flow.event.weather.precipitationChance}% chance of rain`}
              </p>
            )}
          </header>

          {/* The four looks */}
          {flow.looks && flow.looks.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg">Your looks</h2>
              {flow.lookReason && (
                <p className="mt-1 text-sm text-muted-foreground">{flow.lookReason}</p>
              )}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                {flow.looks.map((look) => (
                  <figure key={look.url.slice(-24)} className="relative rounded-2xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={look.url}
                      alt={`${look.label} tried on you`}
                      className="w-full h-auto"
                    />
                    <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-6 text-white">
                      <span className="block text-xs font-semibold leading-tight">
                        {look.label}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* Palette + score */}
          <div className="mt-8 grid sm:grid-cols-[1fr_auto] gap-6 items-start">
            {flow.palette && (
              <section>
                <h2 className="text-lg">
                  Your colors —{" "}
                  <span className="text-accent uppercase tracking-widest text-sm">
                    {flow.palette.season}
                  </span>
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {flow.palette.colors.map((hex) => (
                    <div key={hex} className="flex flex-col items-center gap-1">
                      <div
                        className="w-11 h-11 rounded-xl border border-border"
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
              <section className="rounded-2xl bg-muted/60 px-5 py-4 text-sm text-center">
                <p className="text-muted-foreground">Skin score today</p>
                <p className="text-3xl font-semibold text-primary tabular-nums">
                  {flow.globalScore}
                  <span className="text-base text-muted-foreground">/100</span>
                </p>
              </section>
            )}
          </div>

          {/* Skincare plan timeline */}
          {flow.skincarePlan && flow.skincarePlan.length > 0 && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-lg">
                <Sparkles className="w-4 h-4 text-accent" aria-hidden />
                Skincare plan until the big day
              </h2>
              <PlanTimeline entries={flow.skincarePlan} />
            </section>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-accent/25 disabled:opacity-60"
          >
            <Download className="w-4 h-4" aria-hidden />
            {downloading ? "Preparing your PDF…" : "Download my plan (PDF)"}
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
