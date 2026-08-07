import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getBootstrap,
  getFixtures,
  getEntry,
  getPicks,
  getLeagueStandings,
  pickPrimaryLeague,
  resolveGameweek,
  FplError,
} from "@/lib/fpl";
import { buildContext } from "@/lib/context";
import { SYSTEM_PROMPT, buildUserMessage, REVIEW_TOOL } from "@/lib/prompt";
import { checkRateLimit, isSubscriber } from "@/lib/ratelimit";
import type { Review } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Analysis takes 30-60s. Vercel Hobby caps at 60s; Pro allows more.

function clientId(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : null) ?? "anonymous";
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The site is not configured yet: ANTHROPIC_API_KEY is missing." },
      { status: 500 }
    );
  }

  let teamId: number;
  try {
    const body = await req.json();
    teamId = parseInt(String(body.teamId).replace(/\D/g, ""), 10);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!Number.isFinite(teamId) || teamId <= 0) {
    return NextResponse.json(
      { error: "That does not look like a valid FPL team ID." },
      { status: 400 }
    );
  }

  // ---- Rate limit ----
  const id = clientId(req);
  const subscriber = await isSubscriber(id);
  if (!subscriber) {
    const rate = await checkRateLimit(id);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `You have used your ${rate.limit} free reviews for today. They reset at midnight UTC.`,
          upgrade: process.env.PAYWALL_ENABLED === "true",
        },
        { status: 429 }
      );
    }
  }

  try {
    // ---- Gather FPL data in parallel ----
    const [bootstrap, fixtures, entry] = await Promise.all([
      getBootstrap(),
      getFixtures(),
      getEntry(teamId),
    ]);

    const gw = resolveGameweek(bootstrap);

    // Picks come from the last completed gameweek: that is the manager's real
    // current squad. Pre-season there is nothing to fetch.
    const picksGw = gw.lastFinished ?? null;
    const leagueId = pickPrimaryLeague(entry);

    const [picks, league] = await Promise.all([
      picksGw ? getPicks(teamId, picksGw) : Promise.resolve(null),
      leagueId ? getLeagueStandings(leagueId) : Promise.resolve(null),
    ]);

    const context = buildContext({
      bootstrap,
      fixtures,
      entry,
      picks,
      league,
      gameweek: gw.gameweek,
      gameweekLabel: gw.label,
      deadline: gw.deadline,
      isPreSeason: gw.isPreSeason,
      teamId,
    });

    // ---- Analyse ----
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_review" },
      messages: [{ role: "user", content: buildUserMessage(context) }],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "The analysis came back in an unexpected format. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      review: toolUse.input as Review,
      meta: {
        managerName: context.managerName,
        teamName: context.teamName,
        gameweekLabel: context.gameweekLabel,
        deadline: context.deadline,
        squadValue: context.squadValue,
        bank: context.bank,
        overallPoints: context.overallPoints,
        overallRank: context.overallRank,
        miniLeagueName: context.miniLeague?.name ?? null,
        miniLeagueRank: context.miniLeague?.userRank ?? null,
        miniLeagueSize: context.miniLeague?.size ?? null,
        warnings: context.dataWarnings,
      },
    });
  } catch (e) {
    if (e instanceof FplError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const detail = e instanceof Error ? e.message : "Unknown error";
    console.error("Analysis failed:", detail);

    if (/credit balance|insufficient|billing/i.test(detail)) {
      return NextResponse.json(
        {
          error:
            "The Anthropic account behind this site has run out of credit. If this is your site, top it up at console.anthropic.com under Billing.",
          detail,
        },
        { status: 402 }
      );
    }
    if (/authentication|invalid x-api-key|401/i.test(detail)) {
      return NextResponse.json(
        { error: "The Anthropic API key is missing or invalid. Check it in your Vercel settings.", detail },
        { status: 500 }
      );
    }
    if (/not_found_error|model/i.test(detail)) {
      return NextResponse.json(
        {
          error: `The model "${process.env.ANTHROPIC_MODEL || "claude-sonnet-5"}" was rejected by Anthropic. Set ANTHROPIC_MODEL in Vercel to a model your account can use.`,
          detail,
        },
        { status: 500 }
      );
    }
    if (/429|rate/i.test(detail)) {
      return NextResponse.json(
        { error: "Anthropic is rate limiting us. Wait a moment and try again.", detail },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong generating the review. Please try again.", detail },
      { status: 500 }
    );
  }
}
