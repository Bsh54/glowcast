"use client";

/** Style guide §4.3: "Step X of 6" visible across the whole flow.
 *  Single light theme on every step (user decision). */
const STEPS = ["Event", "Selfie", "Diagnosis", "Projection", "Look", "Summary"];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <nav
      aria-label={`Step ${current} of ${STEPS.length}`}
      className="flex items-center justify-center gap-2 py-4"
    >
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={[
                "h-2 rounded-full transition-all duration-300",
                active ? "w-8 bg-primary" : done ? "w-2 bg-secondary" : "w-2 bg-border",
              ].join(" ")}
              aria-hidden
            />
            <span className="sr-only">
              {label} {active ? "(current step)" : done ? "(done)" : ""}
            </span>
          </div>
        );
      })}
      <span className="ml-3 text-xs font-medium tracking-wide text-muted-foreground">
        Step {current} of {STEPS.length}
      </span>
    </nav>
  );
}
