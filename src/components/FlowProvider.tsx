"use client";

import { useEffect, useState } from "react";
import { hydrateFlow } from "@/lib/flow";

/** Hydrates the flow state from IndexedDB before rendering the app, so every
 *  page sees consistent data even after a reload. */
export default function FlowProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateFlow().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy="true">
        <div className="w-10 h-10 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
