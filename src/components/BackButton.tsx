"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Soft back navigation, shown at the top of every step. */
export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="Go back"
      className="focus-ring tap-target absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-2xl border border-border bg-card/70 px-3.5 py-2 text-sm font-medium text-muted-foreground backdrop-blur transition-colors duration-200 hover:border-primary/50 hover:text-foreground print:hidden"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      Back
    </button>
  );
}
