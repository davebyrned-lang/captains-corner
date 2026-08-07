"use client";

import { useState } from "react";
import { SignUpButton } from "@clerk/nextjs";
import { TIERS, TRIAL_DAYS, type Period } from "@/lib/tiers";

export default function Pricing({
  signedIn,
  currentPlan = "free",
}: {
  signedIn: boolean;
  currentPlan?: string;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(tier: string) {
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, period }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout.");
    } catch {
      setError("Could not reach the payment page. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="pricing" className="mt-14">
      <h2 className="text-center text-2xl font-bold text-chalk">
        Less than a pint, for the whole season
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-chalk/55">
        Cancel any time, in two clicks, from your account.
      </p>

      {/* Billing period switch */}
      <div className="mx-auto mt-6 flex w-fit gap-1 rounded-xl border border-chalk/10 bg-ink/40 p-1">
        {([
          ["monthly", "Monthly"],
          ["annual", "Annual"],
        ] as [Period, string][]).map(([p, label]) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              period === p ? "bg-mint text-ink" : "text-chalk/60 hover:text-chalk"
            }`}
          >
            {label}
            {p === "annual" && (
              <span className={period === p ? "ml-1.5 text-ink/70" : "ml-1.5 text-teal"}>
                save ~48%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-2">
        {TIERS.map((t) => {
          const isCurrent = currentPlan === t.id;
          return (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                t.highlight
                  ? "border-mint/50 bg-gradient-to-b from-mint/10 to-slate1/60"
                  : "border-chalk/12 bg-slate1/50"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-2.5 left-6 rounded-md bg-mint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                  Most useful
                </span>
              )}

              <h3 className="text-lg font-bold text-chalk">{t.name}</h3>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-mint">
                  {period === "monthly" ? t.monthly : t.annual}
                </span>
                <span className="text-xs text-chalk/45">
                  {period === "monthly" ? "a month" : "a year"}
                </span>
              </div>

              {period === "monthly" ? (
                <p className="mt-2 inline-block rounded-md bg-teal/15 px-2.5 py-1 text-xs font-semibold text-teal">
                  First {TRIAL_DAYS} days free
                </p>
              ) : (
                <p className="mt-2 text-xs text-teal">{t.annualNote}</p>
              )}

              <p className="mt-2 text-xs leading-relaxed text-chalk/55">{t.pitch}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-chalk/80">
                    <span className="mt-1 shrink-0 text-mint">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
                {t.locked.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-chalk/30">
                    <span className="mt-1 shrink-0">✕</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {!signedIn ? (
                  <SignUpButton mode="modal">
                    <button
                      className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition ${
                        t.highlight
                          ? "bg-mint text-ink hover:bg-mint/85"
                          : "border border-chalk/20 text-chalk hover:border-mint/40"
                      }`}
                    >
                      {period === "monthly" ? "Start free month" : `Get ${t.name}`}
                    </button>
                  </SignUpButton>
                ) : isCurrent ? (
                  <button
                    disabled
                    className="w-full cursor-default rounded-xl border border-mint/40 px-5 py-3 text-sm font-semibold text-mint"
                  >
                    Your current plan
                  </button>
                ) : (
                  <button
                    onClick={() => checkout(t.id)}
                    disabled={busy !== null}
                    className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                      t.highlight
                        ? "bg-mint text-ink hover:bg-mint/85"
                        : "border border-chalk/20 text-chalk hover:border-mint/40"
                    }`}
                  >
                    {busy === t.id
                      ? "Opening…"
                      : currentPlan !== "free"
                        ? `Switch to ${t.name}`
                        : period === "monthly"
                          ? "Start free month"
                          : `Get ${t.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-lg rounded-xl border border-red-400/30 bg-red-400/8 px-4 py-3 text-center text-sm text-red-200">
          {error}
        </p>
      )}

      {currentPlan !== "free" && (
        <p className="mx-auto mt-4 max-w-lg text-center text-xs leading-relaxed text-chalk/40">
          Switching plans opens your billing page. Stripe works out the
          difference, so you are only charged for what you have not already paid.
        </p>
      )}

      <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-relaxed text-chalk/40">
        Monthly plans start with {TRIAL_DAYS} days free. We take a card at
        sign-up and charge when the free period ends, unless you cancel before
        then. Annual plans are discounted instead and charge straight away. Both
        renew until you cancel, and you can do that yourself any time.
      </p>
    </section>
  );
}
