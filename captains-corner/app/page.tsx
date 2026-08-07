"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Loading from "@/components/Loading";
import ReviewDisplay, { type Meta } from "@/components/ReviewDisplay";
import Chat from "@/components/Chat";
import Header from "@/components/Header";
import { BRAND } from "@/lib/brand";
import type { Review } from "@/lib/types";

interface Matched {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  readAs: string;
  confidence: "exact" | "likely" | "uncertain";
}

type Mode = "id" | "upload";

export default function Home() {
  const [mode, setMode] = useState<Mode>("id");
  const [teamId, setTeamId] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const [signedIn, setSignedIn] = useState(false);
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null);

  // Pull the saved team ID so a returning manager never types it twice.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSignedIn(Boolean(d.signedIn));
        setPlan(d.plan ?? "free");
        if (d.teamId) {
          setSavedTeamId(d.teamId);
          setTeamId((cur) => cur || d.teamId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [extracting, setExtracting] = useState(false);
  const [matched, setMatched] = useState<Matched[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [readNote, setReadNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [result, setResult] = useState<{ review: Review; meta: Meta } | null>(null);

  function resetErrors() {
    setError(null);
    setDetail(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    resetErrors();
    setResult(null);
    setMatched(null);
    setExtracting(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not read that image.");
        setDetail(data.detail ?? null);
      } else {
        setMatched(data.matched ?? []);
        setUnmatched(data.unmatched ?? []);
        setReadNote(data.note ?? "");
      }
    } catch {
      setError("Could not upload that image. Check your connection and try again.");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function analyse(e?: React.FormEvent) {
    e?.preventDefault();
    resetErrors();
    setResult(null);
    setLoading(true);

    if (signedIn && teamId.trim() && teamId.trim() !== savedTeamId) {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId.trim() }),
      })
        .then(() => setSavedTeamId(teamId.trim()))
        .catch(() => {});
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId.trim() || undefined,
          playerIds: matched?.map((m) => m.id) ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setDetail(data.detail ?? null);
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || extracting;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Header plan={plan} />

      {!result && (
        <div className="mb-9 text-center">
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
          {savedTeamId && (
            <p className="mt-3 text-xs text-teal">
              Welcome back. We remembered team {savedTeamId}.
            </p>
          )}
        </div>
      )}

      {/* Mode switch */}
      {!result && (
        <div className="mb-5 flex gap-1 rounded-xl border border-chalk/10 bg-ink/40 p-1">
          {([
            ["id", "Enter team ID"],
            ["upload", "Upload a screenshot"],
          ] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                resetErrors();
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                mode === m ? "bg-mint text-ink" : "text-chalk/60 hover:text-chalk"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Team ID mode */}
      {!result && mode === "id" && (
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
              disabled={busy || !teamId.trim()}
              className="rounded-xl bg-mint px-7 py-3.5 font-semibold text-ink transition hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Analysing…" : "Analyse my team"}
            </button>
          </div>
          <details className="mt-3 text-xs text-chalk/45">
            <summary className="cursor-pointer hover:text-mint">Where do I find my team ID?</summary>
            <p className="mt-2 leading-relaxed">
              Log in at fantasy.premierleague.com, click <strong>Pick Team</strong>, then{" "}
              <strong>View Gameweek History</strong>. Your URL will look like{" "}
              <code className="text-mint">/entry/1234567/history</code>, and the number is your ID.
            </p>
          </details>
        </form>
      )}

      {/* Upload mode */}
      {!result && mode === "upload" && (
        <div className="mb-8">
          <label className="block cursor-pointer rounded-xl border border-dashed border-mint/30 bg-ink/40 px-5 py-8 text-center transition hover:border-mint/60 hover:bg-ink/60">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFile}
              disabled={busy}
              className="hidden"
            />
            <p className="text-sm font-medium text-mint">
              {extracting ? "Reading your squad…" : "Choose a screenshot of your team"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-chalk/45">
              A screenshot of your Pick Team page works best. PNG or JPG, under 5MB.
              Useful before the season starts, when FPL has not published squads yet.
            </p>
          </label>

          {matched && (
            <div className="mt-5 rounded-xl border border-chalk/10 bg-slate1/50 p-5">
              <p className="text-sm font-semibold text-chalk">
                Read {matched.length} player{matched.length === 1 ? "" : "s"}. Check this
                before we analyse it.
              </p>
              {readNote && <p className="mt-1.5 text-xs text-chalk/50">{readNote}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {matched.map((p) => (
                  <span
                    key={p.id}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                      p.confidence === "uncertain"
                        ? "bg-amber-400/12 text-amber-100"
                        : "bg-mint/12 text-chalk"
                    }`}
                    title={
                      p.confidence === "exact"
                        ? `Read as "${p.readAs}"`
                        : `Read as "${p.readAs}", matched with ${p.confidence} confidence`
                    }
                  >
                    <span>
                      {p.name}{" "}
                      <span className="text-chalk/40">
                        {p.position} · {p.team} · £{p.price.toFixed(1)}m
                      </span>
                    </span>
                    <button
                      onClick={() => setMatched(matched.filter((m) => m.id !== p.id))}
                      className="text-chalk/30 transition hover:text-red-300"
                      aria-label={`Remove ${p.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {unmatched.length > 0 && (
                <p className="mt-4 text-xs leading-relaxed text-amber-200/70">
                  Could not identify: {unmatched.join(", ")}. These are left out. Upload a
                  clearer screenshot if any matter.
                </p>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  inputMode="numeric"
                  placeholder="Optional: team ID, for mini-league analysis"
                  className="flex-1 rounded-xl border border-chalk/15 bg-ink/60 px-4 py-3 text-sm text-chalk placeholder:text-chalk/30 focus:border-mint focus:outline-none"
                />
                <button
                  onClick={() => analyse()}
                  disabled={busy || matched.length === 0}
                  className="rounded-xl bg-mint px-6 py-3 font-semibold text-ink transition hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "Analysing…" : "Analyse this squad"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-xl border border-red-400/30 bg-red-400/8 p-4 text-sm leading-relaxed text-red-200">
          {error}
          {detail && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-300/70 hover:text-red-200">
                Technical detail
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink/60 p-3 text-[11px] leading-relaxed text-red-100/70">
                {detail}
              </pre>
            </details>
          )}
        </div>
      )}

      {loading && <Loading />}

      {result && (
        <>
          <ReviewDisplay review={result.review} meta={result.meta} />
          <Chat teamId={teamId.trim() || undefined} playerIds={matched?.map((m) => m.id) ?? []} />
          <div className="pb-10 pt-8 text-center">
            <button
              onClick={() => {
                setResult(null);
                setMatched(null);
              }}
              className="rounded-xl border border-mint/30 px-6 py-2.5 text-sm font-medium text-mint transition hover:bg-mint/10"
            >
              Analyse another squad
            </button>
          </div>
        </>
      )}

      {!result && !busy && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Minutes first", "A player on the bench scores nothing. Expected minutes outrank everything else."],
            ["Four weeks out", "Fixture swings are read five gameweeks ahead, not one."],
            ["Rival-aware", "Advice changes depending on whether you are chasing or protecting a lead."],
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
