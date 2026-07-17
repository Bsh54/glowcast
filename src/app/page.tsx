"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Gem,
  Briefcase,
  Sparkles,
  Heart,
  Camera,
  Star,
  MoreHorizontal,
  ArrowRight,
  CalendarDays,
  MapPin,
} from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { EVENT_OPTIONS, type EventType, daysUntil, saveFlow } from "@/lib/flow";

const ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  mariage: Gem,
  entretien: Briefcase,
  soiree: Sparkles,
  date: Heart,
  shooting: Camera,
  gala: Star,
  autre: MoreHorizontal,
};

export default function AccueilEvenement() {
  const router = useRouter();
  const [type, setType] = useState<EventType | null>(null);
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ date?: string; city?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Charte §4.9 : validation onBlur
  const validateDate = (v: string) =>
    !v ? "Choisis la date de ton événement" : v < minDate ? "La date est déjà passée" : undefined;
  const validateCity = (v: string) =>
    v.trim().length < 2 ? "Indique la ville de l'événement" : undefined;

  const ready = type && date && city.trim().length >= 2 && !errors.date && !errors.city;

  async function start() {
    if (!type || submitting) return;
    const dErr = validateDate(date);
    const cErr = validateCity(city);
    setErrors({ date: dErr, city: cErr });
    if (dErr || cErr) return;
    setSubmitting(true);
    const label = EVENT_OPTIONS.find((o) => o.type === type)!.label;
    saveFlow({
      event: { type, label, date, city: city.trim(), daysLeft: daysUntil(date) },
    });
    router.push("/selfie");
  }

  return (
    <main className="iridescent-bg flex-1 flex flex-col">
      <StepIndicator current={1} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl"
        >
          <p className="text-sm font-medium tracking-[0.25em] uppercase text-accent">
            GlowCast
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl md:text-6xl leading-tight">
            Prêt·e pour ton
            <span className="italic text-primary"> grand jour</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Diagnostic peau, palette de couleurs personnelle et look complet essayé
            sur toi — en quelques minutes.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="glass mt-10 w-full max-w-2xl rounded-3xl p-6 sm:p-8"
          aria-labelledby="event-title"
        >
          <h2 id="event-title" className="text-xl sm:text-2xl">
            Quel est ton prochain événement ?
          </h2>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {EVENT_OPTIONS.map(({ type: t, label }) => {
              const Icon = ICONS[t];
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={selected}
                  className={[
                    "tap-target focus-ring flex items-center justify-center gap-2 rounded-2xl px-3 py-3",
                    "text-sm font-medium transition-all duration-200",
                    selected
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/25 scale-[1.03]"
                      : "bg-card/70 text-foreground border border-border hover:border-primary/50 hover:bg-card",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          {type && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-date" className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarDays className="w-4 h-4 text-accent" aria-hidden />
                    Date de l&apos;événement
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onBlur={(e) => setErrors((p) => ({ ...p, date: validateDate(e.target.value) }))}
                    className="focus-ring mt-1.5 w-full tap-target rounded-xl border border-border bg-card px-3 text-sm"
                  />
                  {errors.date && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {errors.date}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="event-city" className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-accent" aria-hidden />
                    Ville
                  </label>
                  <input
                    id="event-city"
                    type="text"
                    placeholder="Paris, Cotonou, Montréal…"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={(e) => setErrors((p) => ({ ...p, city: validateCity(e.target.value) }))}
                    className="focus-ring mt-1.5 w-full tap-target rounded-xl border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/60"
                  />
                  {errors.city && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {errors.city}
                    </p>
                  )}
                </div>
              </div>

              {date && !errors.date && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {daysUntil(date) === 0
                    ? "C'est aujourd'hui — on optimise chaque minute."
                    : `Dans ${daysUntil(date)} jour${daysUntil(date) > 1 ? "s" : ""} — on a le temps de te préparer.`}
                </p>
              )}

              <button
                type="button"
                onClick={start}
                disabled={!ready || submitting}
                className={[
                  "focus-ring mt-6 w-full tap-target rounded-2xl px-6 py-3.5",
                  "flex items-center justify-center gap-2 text-base font-semibold",
                  "transition-all duration-300",
                  ready
                    ? "bg-gradient-to-r from-primary to-accent text-on-primary shadow-xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.01]"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                ].join(" ")}
              >
                C&apos;est parti
                <ArrowRight className="w-5 h-5" aria-hidden />
              </button>
            </motion.div>
          )}
        </motion.section>

        <p className="mt-8 text-xs text-muted-foreground/70 max-w-md text-center">
          Ton selfie est analysé de manière sécurisée et n&apos;est jamais conservé
          au-delà de ta session.
        </p>
      </div>
    </main>
  );
}
