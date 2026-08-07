import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBootstrap, resolveGameweek } from "@/lib/fpl";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint. Visit /api/health in your browser.
 *
 * It checks each moving part separately so a failure points at one thing
 * instead of a vague "something went wrong". Safe to leave up while you are
 * testing; delete this folder before you take real users, since it reveals
 * which model you use and whether billing is healthy.
 */
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const report: Record<string, unknown> = {
    checkedAt: new Date().toISOString(),
    step1_apiKey: key
      ? {
          ok: true,
          startsWith: key.slice(0, 7),
          length: key.length,
          hasWhitespace: /\s/.test(key),
          note: /\s/.test(key)
            ? "PROBLEM: your key has a space or line break in it. Re-paste it in Vercel."
            : "Key looks well formed.",
        }
      : { ok: false, note: "PROBLEM: ANTHROPIC_API_KEY is not set in Vercel. Add it, then redeploy." },
    step2_model: { configured: model },
  };

  // ---- Step 3: can we reach the FPL API from Vercel? ----
  try {
    const boot = await getBootstrap();
    const gw = resolveGameweek(boot);
    report.step3_fplApi = {
      ok: true,
      players: boot.elements.length,
      teams: boot.teams.length,
      gameweeksPublished: boot.events.length,
      resolvedGameweek: gw.label,
      preSeason: gw.isPreSeason,
      lastFinishedGameweek: gw.lastFinished,
      note: gw.isPreSeason
        ? "Season has not started. Squads are not published yet, so reviews will be general rather than squad-specific."
        : "Season data is live.",
    };
  } catch (e) {
    report.step3_fplApi = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      note: "PROBLEM: Vercel could not reach the Fantasy Premier League API.",
    };
  }

  // ---- Step 4: can we actually call Claude? ----
  if (!key) {
    report.step4_claude = { ok: false, note: "Skipped: no API key to test with." };
  } else {
    try {
      const anthropic = new Anthropic({ apiKey: key });
      const msg = await anthropic.messages.create({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with the single word: working" }],
      });
      const text = msg.content.find((b) => b.type === "text");
      report.step4_claude = {
        ok: true,
        modelResponded: model,
        reply: text && text.type === "text" ? text.text.trim() : "(no text)",
        note: "Claude is reachable and billing is healthy.",
      };
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      let note = "PROBLEM: the call to Claude failed. Full error below.";

      if (/credit balance|insufficient|billing/i.test(raw)) {
        note =
          "PROBLEM: your Anthropic account has no usable credit. Go to console.anthropic.com, Billing, and confirm the payment actually went through. A card added but not charged shows $0.";
      } else if (/not_found|does not exist|model/i.test(raw)) {
        note = `PROBLEM: the model "${model}" was rejected. Set an ANTHROPIC_MODEL variable in Vercel to claude-haiku-4-5-20251001 and redeploy to confirm.`;
      } else if (/authentication|invalid.*api.*key|401/i.test(raw)) {
        note = "PROBLEM: the API key is being rejected. Create a fresh key in the Anthropic console and re-paste it into Vercel.";
      } else if (/rate|429/i.test(raw)) {
        note = "PROBLEM: rate limited by Anthropic. Wait a minute and reload this page.";
      } else if (/permission|403/i.test(raw)) {
        note = "PROBLEM: your key does not have permission for this model.";
      }

      report.step4_claude = { ok: false, error: raw, note };
    }
  }

  const failed = Object.entries(report)
    .filter(([k, v]) => k.startsWith("step") && typeof v === "object" && v !== null && (v as any).ok === false)
    .map(([k]) => k);

  report.verdict = failed.length
    ? `FAILING: ${failed.join(", ")}. Read the "note" on each.`
    : "All checks passed. If reviews still fail, the issue is the length of the request, not the setup.";

  return NextResponse.json(report, { status: 200 });
}
