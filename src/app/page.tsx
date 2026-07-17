"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, PenLine, Check } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import WhyWeAskModal from "@/components/WhyWeAskModal";
import { daysUntil, saveFlow } from "@/lib/flow";
import { searchCities, getForecast, type CityHit } from "@/lib/weather";

const PLACEHOLDER =
  "e.g. My best friend's wedding, outdoor garden ceremony in the afternoon, " +
  "semi-formal dress code, I want something elegant but comfortable…";

export default function EventLanding() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityHits, setCityHits] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [errors, setErrors] = useState<{ description?: string; date?: string; city?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // City autocomplete: suggestions come from Open-Meteo geocoding, and the
  // user must pick one — free text alone is never accepted.
  useEffect(() => {
    if (selectedCity && cityQuery === cityLabel(selectedCity)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCityHits(await searchCities(cityQuery));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityQuery, selectedCity]);

  function cityLabel(c: CityHit) {
    return `${c.name}${c.admin1 ? `, ${c.admin1}` : ""}, ${c.country}`;
  }

  // Style guide §4.9: validate on blur
  const validateDescription = (v: string) =>
    v.trim().length < 12 ? "Tell us a bit more — at least a full sentence" : undefined;
  const validateDate = (v: string) =>
    !v ? "Pick the date of your event" : v < minDate ? "That date has already passed" : undefined;
  const validateCity = () =>
    !selectedCity ? "Pick your city from the suggestions" : undefined;

  const ready =
    description.trim().length >= 12 &&
    date &&
    selectedCity != null &&
    !errors.description &&
    !errors.date;

  async function start() {
    if (submitting) return;
    const dsErr = validateDescription(description);
    const dErr = validateDate(date);
    const cErr = validateCity();
    setErrors({ description: dsErr, date: dErr, city: cErr });
    if (dsErr || dErr || cErr || !selectedCity) return;
    setSubmitting(true);
    // Forecast is only available within 16 days — otherwise we go without it.
    const weather = await getForecast(selectedCity.lat, selectedCity.lon, date).catch(() => null);
    saveFlow({
      event: {
        description: description.trim(),
        date,
        city: selectedCity.name,
        country: selectedCity.country,
        lat: selectedCity.lat,
        lon: selectedCity.lon,
        daysLeft: daysUntil(date),
        weather: weather ?? undefined,
      },
    });
    router.push("/selfie");
  }

  return (
    <main className="iridescent-bg flex-1 flex flex-col">
      <WhyWeAskModal />
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
          className="glass mt-8 sm:mt-10 w-full max-w-2xl rounded-3xl p-4 sm:p-8"
          aria-labelledby="event-title"
        >
          <h2 id="event-title" className="text-xl sm:text-2xl">
            Tell us about your event
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Describe it — the occasion, the setting, the dress code, the mood.
            The more you share, the better we can tailor your skin plan and
            your look.
          </p>

          <div className="mt-5">
            <label
              htmlFor="event-description"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <PenLine className="w-4 h-4 text-accent" aria-hidden />
              Your event
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
            <div className="relative">
              <label htmlFor="event-city" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="w-4 h-4 text-accent" aria-hidden />
                City
              </label>
              <input
                id="event-city"
                type="text"
                autoComplete="off"
                placeholder="Start typing… e.g. Paris"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setSelectedCity(null);
                }}
                onBlur={() => setErrors((p) => ({ ...p, city: validateCity() }))}
                aria-expanded={cityHits.length > 0 && !selectedCity}
                aria-controls="city-suggestions"
                className="focus-ring mt-1.5 w-full tap-target rounded-xl border border-border bg-card px-3 text-sm placeholder:text-muted-foreground/60"
              />
              {selectedCity && (
                <Check
                  className="absolute right-3 top-[38px] w-4 h-4 text-primary"
                  aria-hidden
                />
              )}
              {cityHits.length > 0 && !selectedCity && (
                <ul
                  id="city-suggestions"
                  role="listbox"
                  className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                >
                  {cityHits.map((c) => (
                    <li key={`${c.name}-${c.lat}-${c.lon}`} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity(c);
                          setCityQuery(cityLabel(c));
                          setCityHits([]);
                          setErrors((p) => ({ ...p, city: undefined }));
                        }}
                        className="focus-ring w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        {cityLabel(c)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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

        </motion.section>
      </div>
    </main>
  );
}
