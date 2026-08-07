"use client";

import type { Review } from "@/lib/types";

export interface Meta {
  managerName: string;
  teamName: string;
  gameweekLabel: string;
  deadline: string;
  squadValue: number;
  bank: number;
  overallPoints: number;
  overallRank: number | null;
  miniLeagueName: string | null;
  miniLeagueRank: number | null;
  miniLeagueSize: number | null;
  warnings: string[];
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-mint/15 bg-slate1/50 p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-chalk">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mint/15 text-xs font-bold text-mint">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Score({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  const colour = pct >= 70 ? "bg-mint" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-chalk/60">
        <span>{label}</span>
        <span className="font-mono font-semibold text-chalk">{value}/10</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chalk/10">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bullets({ items, tone }: { items: string[]; tone: "good" | "bad" | "neutral" }) {
  if (!items?.length) return <p className="text-sm text-chalk/40">Nothing flagged.</p>;
  const dot =
    tone === "good" ? "bg-mint" : tone === "bad" ? "bg-red-400" : "bg-chalk/40";
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-chalk/80">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReviewDisplay({ review, meta }: { review: Review; meta: Meta }) {
  const s = review.executive_summary;

  const summaryRows: [string, string][] = [
    ["Best transfer", s.best_transfer],
    ["Alternative", s.alternative_transfer],
    ["Captain", s.captain],
    ["Vice captain", s.vice_captain],
    ["Chip advice", s.chip_advice],
    ["Take a hit?", s.hit_advice],
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-mint/25 bg-gradient-to-br from-slate1 to-pitch p-6">
        <p className="text-xs uppercase tracking-widest text-mint">{meta.gameweekLabel} review</p>
        <h1 className="mt-1 text-2xl font-bold text-chalk">{meta.teamName}</h1>
        <p className="text-sm text-chalk/60">{meta.managerName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Total points", meta.overallPoints.toLocaleString()],
            ["Overall rank", meta.overallRank?.toLocaleString() ?? "—"],
            ["Squad value", `£${meta.squadValue.toFixed(1)}m`],
            ["In the bank", `£${meta.bank.toFixed(1)}m`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-ink/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-chalk/45">{k}</p>
              <p className="font-mono text-sm font-semibold text-chalk">{v}</p>
            </div>
          ))}
        </div>
        {meta.miniLeagueName && (
          <p className="mt-3 text-xs text-chalk/60">
            Mini-league: <span className="text-mint">{meta.miniLeagueName}</span> — rank{" "}
            {meta.miniLeagueRank ?? "?"} of {meta.miniLeagueSize ?? "?"}
          </p>
        )}
      </div>

      {meta.warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
            Data limitations
          </p>
          <ul className="space-y-1.5 text-xs leading-relaxed text-amber-100/70">
            {meta.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Executive summary */}
      <Section n="1" title="Executive summary">
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Score value={s.squad_health} label="Squad health" />
          <Score value={s.confidence} label="Confidence in this advice" />
        </div>
        <dl className="divide-y divide-chalk/8 overflow-hidden rounded-xl border border-chalk/10">
          {summaryRows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-3 bg-ink/30 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-chalk/50">{k}</dt>
              <dd className="col-span-2 text-sm text-chalk">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 2. Squad assessment */}
      <Section n="2" title="Squad assessment">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mint">Strengths</h3>
            <Bullets items={review.squad_assessment.strengths} tone="good" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-300">Weaknesses</h3>
            <Bullets items={review.squad_assessment.weaknesses} tone="bad" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-chalk/60">Fix now</h3>
            <Bullets items={review.squad_assessment.immediate_problems} tone="bad" />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-chalk/60">Longer term</h3>
            <Bullets items={review.squad_assessment.long_term_concerns} tone="neutral" />
          </div>
        </div>
        {review.squad_assessment.behavioural_flags?.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Management patterns worth correcting
            </h3>
            <Bullets items={review.squad_assessment.behavioural_flags} tone="neutral" />
          </div>
        )}
      </Section>

      {/* 3. Transfers */}
      <Section n="3" title="Transfer recommendations">
        <div className="space-y-4">
          {review.transfers.map((t, i) => (
            <div key={i} className="rounded-xl border border-chalk/10 bg-ink/30 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-red-400/15 px-2.5 py-1 text-sm font-semibold text-red-300">
                  {t.player_out}
                </span>
                <span className="text-chalk/40">→</span>
                <span className="rounded-md bg-mint/15 px-2.5 py-1 text-sm font-semibold text-mint">
                  {t.player_in}
                </span>
                <span className="ml-auto font-mono text-xs text-chalk/50">
                  confidence {t.confidence}/10
                </span>
              </div>
              <div className="space-y-2.5 text-sm leading-relaxed text-chalk/80">
                <p><span className="text-chalk/45">Why sell: </span>{t.reason_out}</p>
                <p><span className="text-chalk/45">Why buy: </span>{t.reason_in}</p>
                <p><span className="text-chalk/45">Four gameweeks: </span>{t.four_gw_projection}</p>
                <p><span className="text-chalk/45">Risks: </span>{t.risks}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Starting XI */}
      <Section n="4" title={`Starting XI — ${review.starting_xi.formation}`}>
        <div className="flex flex-wrap gap-2">
          {review.starting_xi.starters.map((p) => (
            <span key={p} className="rounded-lg bg-mint/12 px-3 py-1.5 text-sm text-chalk">
              {p}
            </span>
          ))}
        </div>
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-chalk/45">
          Bench, in order
        </p>
        <div className="flex flex-wrap gap-2">
          {review.starting_xi.bench.map((p, i) => (
            <span key={p} className="rounded-lg bg-chalk/8 px-3 py-1.5 text-sm text-chalk/60">
              {i + 1}. {p}
            </span>
          ))}
        </div>
        {review.starting_xi.notes && (
          <p className="mt-4 text-sm leading-relaxed text-chalk/70">{review.starting_xi.notes}</p>
        )}
      </Section>

      {/* 5. Captaincy */}
      <Section n="5" title="Captaincy">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Best pick", review.captaincy.best, "border-mint/40 bg-mint/8"],
            ["Safe pick", review.captaincy.safe, "border-chalk/15 bg-ink/40"],
            ["Differential", review.captaincy.differential, "border-amber-400/30 bg-amber-400/5"],
          ].map(([label, c, cls]) => {
            const pick = c as { player: string; reasoning: string };
            return (
              <div key={label as string} className={`rounded-xl border p-4 ${cls as string}`}>
                <p className="text-[10px] uppercase tracking-widest text-chalk/45">{label as string}</p>
                <p className="mt-1 text-base font-bold text-chalk">{pick.player}</p>
                <p className="mt-2 text-xs leading-relaxed text-chalk/70">{pick.reasoning}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 6. Chips */}
      <Section n="6" title="Chip strategy">
        <div className="overflow-hidden rounded-xl border border-chalk/10">
          {review.chip_strategy.map((c, i) => (
            <div
              key={i}
              className="grid gap-2 border-b border-chalk/8 bg-ink/30 px-4 py-3 last:border-0 sm:grid-cols-[130px_110px_1fr]"
            >
              <p className="text-sm font-semibold text-chalk">{c.chip}</p>
              <p className="text-sm text-mint">{c.recommendation}</p>
              <p className="text-sm leading-relaxed text-chalk/70">{c.reasoning}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Roadmap */}
      <Section n="7" title="Four gameweek roadmap">
        <div className="space-y-3">
          {review.roadmap.map((r, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-14 shrink-0 items-center justify-center rounded-lg bg-mint/12 font-mono text-xs font-bold text-mint">
                  {r.gameweek}
                </span>
                {i < review.roadmap.length - 1 && <span className="my-1 w-px flex-1 bg-chalk/12" />}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-chalk">{r.planned_move}</p>
                <p className="mt-1 text-xs text-chalk/60">Targeting: {r.fixture_target}</p>
                <p className="mt-0.5 text-xs text-amber-200/60">Risk: {r.risk}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 8. League strategy */}
      <Section n="8" title="Mini-league strategy">
        <p className="text-sm leading-relaxed text-chalk/80">{review.league_strategy}</p>
      </Section>

      {/* 9. Uncertainties */}
      <Section n="9" title="What could change this">
        <Bullets items={review.uncertainties} tone="neutral" />
      </Section>

      <p className="pb-8 text-center text-xs leading-relaxed text-chalk/35">
        Captain&apos;s Corner is an analysis tool, not a guarantee. Always check press
        conferences and confirmed lineups before the deadline. Not affiliated with the
        Premier League or Fantasy Premier League.
      </p>
    </div>
  );
}
