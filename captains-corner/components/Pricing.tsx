"use client";

import { SignUpButton } from "@clerk/nextjs";
import { TIERS, TRIAL_DAYS } from "@/lib/tiers";

export default function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="pricing" className="mt-14">
      <h2 className="text-center text-2xl font-bold text-chalk">
        One price for the whole season
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-chalk/55">
        Pay once, not every month. Access runs to the end of the season in May,
        then stops. Nothing renews on you next August.
      </p>

      <div className="mx-auto mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
        {TIERS.map((t) => (
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
              <span className="text-3xl font-bold text-mint">{t.price}</span>
              <span className="text-xs text-chalk/45">{t.cadence}</span>
            </div>
            {t.trialDays && (
              <p className="mt-2 inline-block rounded-md bg-teal/15 px-2.5 py-1 text-xs font-semibold text-teal">
                First {t.trialDays} days free
              </p>
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
              {signedIn ? (
                <button
                  disabled={t.id !== "free"}
                  className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    t.id === "free"
                      ? "border border-chalk/20 text-chalk/70"
                      : "bg-mint text-ink hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  {t.id === "free" ? "Your current plan" : "Coming soon"}
                </button>
              ) : (
                <SignUpButton mode="modal">
                  <button
                    className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition ${
                      t.highlight
                        ? "bg-mint text-ink hover:bg-mint/85"
                        : "border border-chalk/20 text-chalk hover:border-mint/40"
                    }`}
                  >
                    {t.cta}
                  </button>
                </SignUpButton>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-relaxed text-chalk/40">
        Classic starts with {TRIAL_DAYS} days free. We take a card at sign-up and
        charge $10 when the free period ends, unless you cancel before then. We
        will email you three days beforehand either way.
      </p>
      <p className="mt-3 text-center text-xs text-chalk/30">
        Payments are not switched on yet. Create an account now and you will be
        first in when they are.
      </p>
    </section>
  );
}
