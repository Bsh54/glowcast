"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import BackButton from "@/components/BackButton";
import ScoreGauge from "@/components/ScoreGauge";
import { loadFlow, saveFlow, type FlowState } from "@/lib/flow";

const CONCERN_LABELS: Record<string, string> = {
  moisture: "Hydration",
  radiance: "Radiance",
  texture: "Texture",
  redness: "Redness",
  acne: "Clarity",
  oiliness: "Oil balance",
  pore: "Pores",
  dark_circle_v2: "Dark circles",
};

const LOADING_MESSAGES = [
  "Reading your radiance…",
  "Mapping your skin tones…",
  "Measuring hydration and texture…",
  "Finding your color season…",
];

export default function Diagnosis() {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    const f = loadFlow();
    if (!f.selfieDataUrl) {
      router.replace("/");
      return;
    }
    setFlow(f);
    if (f.scores && f.palette) {
      setLoading(false);
      return;
    }
    if (ran.current) return;
    ran.current = true;

    const timer = setInterval(
      () => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      3500
    );

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selfie: f.selfieDataUrl, event: f.event }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.detail === "error_no_face" || String(data.detail).includes("face")
              ? "We couldn't read your face clearly. Try a brighter, front-facing photo."
              : `Analysis failed (${data.detail ?? data.error}). Please try again.`
          );
        }
        const next = saveFlow({
          scores: data.scores,
          insights: data.insights,
          globalScore: data.globalScore,
          eventTitle: data.eventTitle,
          tone: data.tone,
          palette: data.palette,
          event: f.event ? { ...f.event, parsed: data.parsedEvent } : f.event,
        });
        setFlow(next);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setLoading(false);
      } finally {
        clearInterval(timer);
      }
    })();

    return () => clearInterval(timer);
  }, [router]);

  const nextStep = (flow.event?.daysLeft ?? 0) >= 3 ? "/projection" : "/look";

  return (
    <main className="iridescent-bg relative flex-1 flex flex-col">
      <BackButton href="/selfie" />
      <StepIndicator current={3} />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center mt-2">Your skin, decoded</h1>

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-6" aria-live="polite">
            <div className="relative w-40 h-40 rounded-full overflow-hidden">
              {flow.selfieDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.selfieDataUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                />
              )}
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{LOADING_MESSAGES[msgIdx]}</p>
            <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-10 mx-auto max-w-md glass rounded-3xl p-6 text-center"
          >
            <AlertCircle className="w-8 h-8 mx-auto text-destructive" aria-hidden />
            <p className="mt-3 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/selfie")}
              className="focus-ring tap-target mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              Retake my selfie
            </button>
          </div>
        )}

        {!loading && !error && flow.scores && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 grid lg:grid-cols-[320px_1fr] gap-6"
          >
            {/* Left column: selfie + global score */}
            <div className="glass rounded-3xl p-6 flex flex-col items-center">
              {flow.selfieDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.selfieDataUrl}
                  alt="Your selfie"
                  className="w-40 h-40 rounded-full object-cover border-4 border-card shadow-lg"
                />
              )}
              <p className="mt-4 text-sm text-muted-foreground">Overall score</p>
              <p className="text-5xl font-semibold tabular-nums text-primary">
                {flow.globalScore ?? "–"}
                <span className="text-lg text-muted-foreground">/100</span>
              </p>
            </div>

            {/* Right column: gauges (tap one to see where it was detected) */}
            <div className="glass rounded-3xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl">Concern by concern</h2>
                <p className="text-xs text-muted-foreground">
                  Tap a score to see where it was detected on your face
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
                {Object.entries(flow.scores).map(([key, v], i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                  >
                    <button
                      type="button"
                      onClick={() => v.maskUrl && setSelected(selected === key ? null : key)}
                      aria-pressed={selected === key}
                      className={[
                        "focus-ring w-full rounded-2xl p-1 transition-colors duration-200",
                        v.maskUrl ? "hover:bg-muted/60" : "cursor-default",
                        selected === key ? "bg-muted" : "",
                      ].join(" ")}
                    >
                      <ScoreGauge label={CONCERN_LABELS[key] ?? key} value={v.ui_score} />
                    </button>
                    {flow.insights?.[key] && (
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground text-center px-1">
                        {flow.insights[key]}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Mask viewer: the analyzed photo with the concern highlighted */}
              {selected && flow.scores[selected]?.maskUrl && (
                <motion.figure
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-5 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flow.scores[selected].maskUrl}
                    alt={`Areas of ${CONCERN_LABELS[selected] ?? selected} detected on your face`}
                    className="w-full max-w-sm mx-auto rounded-2xl"
                  />
                  <figcaption className="mt-2 text-xs text-muted-foreground text-center">
                    Highlighted: where {(CONCERN_LABELS[selected] ?? selected).toLowerCase()} was
                    detected on your photo.
                  </figcaption>
                </motion.figure>
              )}

              <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground/80 border-t border-border pt-3">
                How is this measured? Your photo is analyzed by YouCam&apos;s skin AI —
                the same engine used by 800+ beauty brands. Each concern is scored
                from the image (1–100, higher is better) and mapped to the exact
                facial areas shown above. It&apos;s a cosmetic reading, not a medical
                diagnosis.
              </p>
            </div>

            {/* Palette — full width */}
            {flow.palette && (
              <div className="glass rounded-3xl p-6 lg:col-span-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl">Your colors</h2>
                  <p className="text-sm text-accent font-semibold uppercase tracking-widest">
                    {flow.palette.season}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  {flow.palette.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {flow.palette.colors.map((hex) => (
                    <div key={hex} className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-2xl border border-border shadow-sm"
                        style={{ backgroundColor: hex }}
                        role="img"
                        aria-label={`Flattering color ${hex}`}
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
                    </div>
                  ))}
                </div>
                {flow.palette.avoid.length > 0 && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Better avoided:{" "}
                    {flow.palette.avoid.map((hex) => (
                      <span
                        key={hex}
                        className="inline-block align-middle w-4 h-4 rounded-md border border-border mx-1"
                        style={{ backgroundColor: hex }}
                        role="img"
                        aria-label={`Color to avoid ${hex}`}
                      />
                    ))}
                  </p>
                )}
              </div>
            )}

            <div className="lg:col-span-2 flex justify-center">
              <button
                type="button"
                onClick={() => router.push(nextStep)}
                className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-8 py-3.5 text-base font-semibold text-on-primary shadow-xl shadow-accent/25 transition-transform duration-300 hover:scale-[1.02]"
              >
                {nextStep === "/projection" ? "See your skin's potential" : "Build my look"}
                <ArrowRight className="w-5 h-5" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
