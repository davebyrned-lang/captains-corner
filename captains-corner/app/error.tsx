"use client";

import { useEffect } from "react";

/**
 * Catches any rendering crash so people see an explanation instead of a blank
 * screen. Next.js shows this automatically when a client component throws.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Captain's Corner render error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-5 py-20">
      <div className="rounded-2xl border border-red-400/30 bg-red-400/8 p-6">
        <h1 className="text-lg font-semibold text-red-200">
          Something broke while displaying your review.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-red-100/70">
          The analysis itself may well have worked. This is a display problem, not
          a problem with your team.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-mint px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-mint/85"
        >
          Try again
        </button>
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-red-300/60 hover:text-red-200">
            Technical detail
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink/60 p-3 text-[11px] text-red-100/60">
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        </details>
      </div>
    </main>
  );
}
