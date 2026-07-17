"use client";

import { useState } from "react";

/** A look card whose skeleton stays visible until the image has decoded. */
export default function LookCard({
  url,
  label,
  style,
}: {
  url: string;
  label: string;
  style?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="relative rounded-3xl overflow-hidden glass">
      {!loaded && <div className="skeleton absolute inset-0 aspect-[3/4]" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${label} tried on you`}
        onLoad={() => setLoaded(true)}
        className={[
          "w-full h-auto transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      {loaded && (
        <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-2.5 pt-8 text-white">
          <span className="block text-sm font-semibold">{label}</span>
          {style && (
            <span className="text-[11px] uppercase tracking-widest text-white/80">{style}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
