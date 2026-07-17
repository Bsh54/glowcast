"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Lightbulb } from "lucide-react";
import type { PlanEntry } from "@/lib/flow";

/** Vertical dated timeline for the skincare plan (screen 4 + summary). */
export default function PlanTimeline({ entries }: { entries: PlanEntry[] }) {
  return (
    <ol className="relative mt-4 space-y-5 border-l-2 border-secondary/60 pl-5">
      {entries.map((e, i) => (
        <motion.li
          key={`${e.label}-${i}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
          className="relative"
        >
          <span
            aria-hidden
            className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card"
          />
          <p className="text-sm font-semibold">{e.label}</p>
          <div className="mt-1 space-y-1">
            {e.am && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sun className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" aria-hidden />
                {e.am}
              </p>
            )}
            {e.pm && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Moon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" aria-hidden />
                {e.pm}
              </p>
            )}
            {e.tip && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground/80 italic">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-secondary" aria-hidden />
                {e.tip}
              </p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
