"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, PenLine, ShieldCheck } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import { daysUntil, saveFlow } from "@/lib/flow";

const PLACEHOLDER =
  "e.g. My best friend's wedding, outdoor garden ceremony in the afternoon, " +
  "semi-formal dress code, I want something elegant but comfortable…";

export default function EventLanding() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ description?: string; date?: string; city?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Style guide §4.9: validate on blur
  const validateDescription = (v: string) =>
    v.trim().length < 12 ? "Tell us a bit more — at least a full sentence" : undefined;
  const validateDate = (v: string) =>
    !v ? "Pick the date of your event" : v < minDate ? "That date has already passed" : undefined;
  const validateCity = (v: string) =>
    v.trim().length < 2 ? "Tell us the city of the event" : undefined;

  const ready =
    description.trim().length >= 12 &&
    date &&
    city.trim().length >= 2 &&
    !errors.description &&
    !errors.date &&
    !errors.city;

  async function start() {
    if (submitting) return;
    const dsErr = validateDescription(description);
    const dErr = validateDate(date);
    const cErr = validateCity(city);
    setErrors({ description: dsErr, date: dErr, city: cErr });
    if (dsErr || dErr || cErr) return;
    setSubmitting(true);
    saveFlow({
      event: {
        description: description.trim(),
        date,
        city: city.trim(),
        daysLeft: daysUntil(date),
      },
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
            Ready for your
            <span className="italic text-primary"> big day</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Skin diagnosis, your personal color palette, and a complete look
            tried on you — in minutes.
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
            Tell us about your event
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Describe it in your own words — the occasion, the setting, the dress
            code, the mood. The more you share, the better we can tailor your
            skin plan and your look.
          </p>

          <div className="mt-5">
            <label
              htmlFor="event-description"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <PenLine className="w-4 h-4 text-accent" aria-hidden />
              Your event, in your words
            </label>
            <textarea
              id="event-description"
              rows={4}
              placeholder={PLACEHOLDER}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={(e) =>
                setErrors((p) => ({ ...p, description: validateDescription(e.target.value) }))
              }
              className="focus-ring mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 resize-none"
            />
            {errors.description && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-date" className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-accent" aria-hidden />
                Date of the event
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
                City
              </label>
              <input
                id="event-city"
                type="text"
                placeholder="Paris, New York, Lagos…"
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
                ? "It's today — let's make every minute count."
                : `${daysUntil(date)} day${daysUntil(date) > 1 ? "s" : ""} to go — plenty of time to get you ready.`}
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
            Let&apos;s go
            <ArrowRight className="w-5 h-5" aria-hidden />
          </button>

          {/* Why we ask — transparency notice */}
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-muted/60 px-4 py-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-accent" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Why we ask:</span>{" "}
              your event description sets the dress code and mood of your look,
              the date lets us build a skincare plan that fits the time you have
              left, and the city gives us the weather forecast so your outfit
              works on the day. Nothing is stored beyond your session, and your
              selfie is only used for the analysis you request.
            </p>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
