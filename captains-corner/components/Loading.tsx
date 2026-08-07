"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading your squad from the FPL API",
  "Mapping fixture difficulty for the next five gameweeks",
  "Screening transfer targets on underlying data",
  "Checking your mini-league position and rivals",
  "Weighing captaincy ceiling against floor",
  "Writing your four-gameweek roadmap",
];

export default function Loading() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-mint/20 bg-slate1/60 p-8">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-mint" />
        <p className="text-sm font-medium text-mint">{STEPS[step]}…</p>
      </div>
      <p className="mt-2 text-xs text-chalk/50">
        A full review takes around 45 seconds. Worth the wait.
      </p>
      <div className="mt-6 space-y-3">
        {[100, 82, 91, 68].map((w, i) => (
          <div key={i} className="shimmer h-3 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
