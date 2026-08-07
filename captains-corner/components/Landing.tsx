"use client";

import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Pricing from "@/components/Pricing";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    n: "1",
    title: "Give us your squad",
    body: "Type your FPL team ID and we pull everything automatically: your fifteen players, prices, bank, chips and mini-league. No squad published yet? Upload a screenshot instead and we will read it.",
  },
  {
    n: "2",
    title: "We do the analysis you don't have time for",
    body: "Expected minutes, five gameweeks of fixture difficulty for all twenty clubs, expected goal involvement per 90, clean sheet odds, and where you actually sit against your rivals.",
  },
  {
    n: "3",
    title: "You get a decision, not a data dump",
    body: "One transfer to make and why, a captain with the reasoning, your best eleven, and what would change the advice. Then ask it anything you like.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "Built for your mini-league",
    body: "Every other tool optimises for overall rank out of eleven million. This one works out whether you should be protecting a lead or chasing, and changes its advice accordingly.",
  },
  {
    title: "Minutes before everything",
    body: "A player on the bench scores nothing, however good his underlying numbers are. Expected minutes outrank form, price and reputation.",
  },
  {
    title: "Four weeks ahead",
    body: "Fixture swings are read five gameweeks out, not one. You stop making the transfer everyone else makes a fortnight too late.",
  },
  {
    title: "It will tell you that you are wrong",
    body: "If you are chasing last week's points or about to take a hit that does not pay for itself, it says so. It is not here to agree with you.",
  },
];

export default function Landing() {
  return (
    <>
      <section className="text-center">
        <Image
          src="/logo.png"
          alt={BRAND.name}
          width={190}
          height={190}
          priority
          className="mx-auto mb-2 h-auto w-[150px] sm:w-[190px]"
        />
        <h1 className="mx-auto mt-3 max-w-xl text-3xl font-bold leading-tight text-chalk sm:text-4xl">
          {BRAND.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-chalk/60">
          {BRAND.subhead}
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <SignUpButton mode="modal">
            <button className="rounded-xl bg-mint px-8 py-3.5 font-semibold text-ink transition hover:bg-mint/85">
              Start your free month
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="rounded-xl border border-chalk/20 px-8 py-3.5 font-medium text-chalk/80 transition hover:border-mint/40 hover:text-chalk">
              Sign in
            </button>
          </SignInButton>
        </div>
        <p className="mt-3 text-xs text-chalk/35">
          30 days free, then $10 for the rest of the season. Cancel any time
          before you are charged.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold text-chalk">How it works</h2>
        <div className="mt-7 space-y-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex gap-4 rounded-2xl border border-chalk/10 bg-slate1/40 p-5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-sm font-bold text-mint">
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold text-chalk">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-chalk/65">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold text-chalk">
          Why not just use the other tools
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {DIFFERENTIATORS.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-chalk/10 bg-slate1/40 p-5"
            >
              <h3 className="font-semibold text-mint">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-chalk/65">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Pricing signedIn={false} />

      <section className="mt-14 rounded-2xl border border-mint/25 bg-gradient-to-b from-mint/8 to-transparent p-8 text-center">
        <h2 className="text-xl font-bold text-chalk">
          Your rivals are picking on vibes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-chalk/60">
          Most managers in your league decide on Friday night from a highlights reel
          and whoever hauled last week. You do not have to.
        </p>
        <SignUpButton mode="modal">
          <button className="mt-5 rounded-xl bg-mint px-8 py-3.5 font-semibold text-ink transition hover:bg-mint/85">
            Start your free month
          </button>
        </SignUpButton>
      </section>

      <p className="mt-12 pb-8 text-center text-xs leading-relaxed text-chalk/30">
        {BRAND.disclaimer}
      </p>
    </>
  );
}
