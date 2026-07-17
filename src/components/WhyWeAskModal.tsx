"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

/** Soft popup shown on every site load, explaining why we ask for
 *  the event details and the selfie. Closed with the OK button. */
export default function WhyWeAskModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show on every page load (no persistence, by design)
    setOpen(true);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="why-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass w-full max-w-md rounded-3xl bg-card/90 p-6 sm:p-7"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-accent" aria-hidden />
              <h2 id="why-title" className="text-lg">
                Why we ask
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>
                <span className="font-semibold text-foreground">Your event description</span>{" "}
                sets the dress code and mood of your look.
              </li>
              <li>
                <span className="font-semibold text-foreground">The date</span> lets us build
                a skincare plan that fits the time you have left.
              </li>
              <li>
                <span className="font-semibold text-foreground">The city</span> gives us the
                weather, so your outfit works on the day.
              </li>
              <li>
                <span className="font-semibold text-foreground">Your selfie</span> is only
                used for the analysis you request — nothing is stored beyond your session.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="focus-ring tap-target mt-5 w-full rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-accent/25"
            >
              OK, got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
