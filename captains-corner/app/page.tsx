"use client";

import { useState } from "react";
import Loading from "@/components/Loading";
import ReviewDisplay, { type Meta } from "@/components/ReviewDisplay";
import type { Review } from "@/lib/types";

export default function Home() {
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ review: Review; meta: Meta } | null>(null);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      {!result && (
        <header className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-mint">Captain&apos;s Corner</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-chalk sm:text-4xl">
            Win your mini-league.
            <br />
            <span className="text-mint">Not the template.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-chalk/60">
            Most FPL tools optimise for overall rank. This one optimises for beating the
            handful of people you actually care about. Enter your team ID for a full
            gameweek review built on minutes, fixtures and underlying data.
          </p>
        </header>
      )}

      <form onSubmit={analyse} className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            inputMode="numeric"
            placeholder="Your FPL team ID, e.g. 1234567"
            className="flex-1 rounded-xl border border-mint/25 bg-ink/60 px-4 py-3.5 text-chalk placeholder:text-chalk/30 focus:border-mint focus:outline-none focus:ring-1 focus:ring-mint"
          />
          <button
            type="submit"
            disabled={loading || !teamId.trim()}
            className="rounded-xl bg-mint px-7 py-3.5 font-semibold text-ink transition hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Analysing…" : result ? "Re-run" : "Analyse my team"}
          </button>
        </div>

        {!result && !loading && (
          <details className="mt-3 text-xs text-chalk/45">
            <summary className="cursor-pointer hover:text-mint">Where do I find my team ID?</summary>
            <p className="mt-2 leading-relaxed">
              Log in at fantasy.premierleague.com, click <strong>Pick Team</strong>, then{" "}
              <strong>View Gameweek History</strong>. Your URL will look like{" "}
              <code className="text-mint">/entry/1234567/history</code> — the number is your ID.
            </p>
          </details>
        )}
      </form>

      {error && (
        <div className="mb-8 rounded-xl border border-red-400/30 bg-red-400/8 p-4 text-sm leading-relaxed text-red-200">
          {error}
        </div>
      )}

      {loading && <Loading />}

      {result && <ReviewDisplay review={result.review} meta={result.meta} />}

      {!result && !loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Minutes first", "A player on the bench scores nothing. Expected minutes outrank everything else."],
            ["Four weeks out", "Fixture swings are read five gameweeks ahead, not one."],
            ["Rival-aware", "Advice changes depending on whether you are chasing or protecting."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-chalk/10 bg-slate1/40 p-4">
              <p className="text-sm font-semibold text-mint">{t}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-chalk/60">{d}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
