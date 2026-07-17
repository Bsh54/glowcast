"use client";

import { motion } from "framer-motion";

/** Circular score gauge — red→yellow→green scale, numeric value always
 *  visible as text (style guide §5: never rely on color alone). */
export default function ScoreGauge({
  label,
  value,
  size = 92,
}: {
  label: string;
  value: number; // 1-100
  size?: number;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color =
    value >= 70 ? "var(--score-high)" : value >= 45 ? "var(--score-mid)" : "var(--score-low)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={7}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * value) / 100 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums"
          aria-label={`${label}: ${value} out of 100`}
        >
          {value}
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center">{label}</span>
    </div>
  );
}
