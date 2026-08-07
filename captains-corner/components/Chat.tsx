"use client";

import { useEffect, useRef, useState } from "react";

const MAX_TURNS = 15;

const STARTERS = [
  "What transfers should I make this week?",
  "When should I play my wildcard?",
  "Who should I captain, and why?",
  "Which players should I be watching for the next few weeks?",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/** Light formatting only. Bold, bullets and paragraphs, nothing heavier. */
function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l)) && lines.length > 1;

        if (isList) {
          return (
            <ul key={bi} className="my-2 space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint/60" />
                  <span>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className={bi > 0 ? "mt-3" : ""}>
            {inline(block)}
          </p>
        );
      })}
    </>
  );
}

function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-chalk">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function Chat({
  teamId,
  playerIds,
  plan = "free",
}: {
  teamId?: string;
  playerIds?: number[];
  plan?: string;
}) {
  if (plan !== "premium") {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-mint/25 bg-slate1/40 p-7 text-center">
        <h2 className="text-lg font-semibold text-chalk">Talk it through</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-chalk/55">
          Premier lets you ask follow-up questions with your squad, fixtures and
          mini-league already loaded. Compare two players, sanity-check a hit, or
          plan your wildcard.
        </p>
        <a
          href="#pricing"
          className="mt-5 inline-block rounded-xl bg-mint px-6 py-3 text-sm font-semibold text-ink transition hover:bg-mint/85"
        >
          See Premier
        </a>
      </section>
    );
  }

  return <ChatThread teamId={teamId} playerIds={playerIds} />;
}

function ChatThread({
  teamId,
  playerIds,
}: {
  teamId?: string;
  playerIds?: number[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const turnsUsed = messages.filter((m) => m.role === "user").length;
  const turnsLeft = MAX_TURNS - turnsUsed;
  const capped = turnsLeft <= 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || streaming || capped) return;

    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, playerIds, messages: next }),
      });

      if (!res.ok) {
        let msg = "Something went wrong answering that.";
        try {
          const j = await res.json();
          msg = j.error ?? msg;
        } catch {}
        setError(msg);
        setMessages(next);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }

      if (!acc.trim()) {
        setError("The reply came back empty. Try asking again.");
        setMessages(next);
      }
    } catch {
      setError("Lost connection mid-answer. Check your connection and try again.");
      setMessages(next);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-mint/20 bg-slate1/50 p-6">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-chalk">Talk it through</h2>
        <span className="shrink-0 font-mono text-xs text-chalk/40">
          {turnsLeft} question{turnsLeft === 1 ? "" : "s"} left
        </span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-chalk/55">
        Your squad, fixtures and mini-league are already loaded. Ask about transfers,
        chip timing, who to captain, or compare two players head to head.
      </p>

      {messages.length === 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={streaming}
              className="rounded-lg border border-mint/25 px-3 py-2 text-left text-xs text-mint transition hover:bg-mint/10 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-5 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-mint/15 text-chalk"
                    : "bg-ink/50 text-chalk/85"
                }`}
              >
                {m.role === "assistant" && !m.content && streaming ? (
                  <span className="flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint/60"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <Formatted text={m.content} />
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-400/30 bg-red-400/8 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {capped ? (
        <p className="rounded-xl border border-dashed border-chalk/15 px-4 py-4 text-center text-sm text-chalk/45">
          That&apos;s {MAX_TURNS} questions for this review. Run a fresh analysis to start
          a new conversation.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            placeholder="Ask about your squad…"
            className="flex-1 rounded-xl border border-chalk/15 bg-ink/60 px-4 py-3 text-sm text-chalk placeholder:text-chalk/30 focus:border-mint focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-mint px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mint/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? "…" : "Ask"}
          </button>
        </form>
      )}
    </section>
  );
}
