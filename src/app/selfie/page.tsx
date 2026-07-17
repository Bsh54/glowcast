"use client";

import StepIndicator from "@/components/StepIndicator";

export default function CaptureSelfie() {
  return (
    <main className="flex-1 flex flex-col bg-dark-background text-white">
      <StepIndicator current={2} dark />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="glass-dark rounded-3xl p-8 text-center max-w-md">
          <h1 className="text-2xl text-dark-gold-light">Capture du selfie</h1>
          <p className="mt-3 text-sm text-white/70">
            Écran en construction — caméra guidée à venir.
          </p>
        </div>
      </div>
    </main>
  );
}
