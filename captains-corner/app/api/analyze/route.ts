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
import { normalizeReview } from "@/lib/normalize";
import { runResearch } from "@/lib/research";
import type { FplEntry } from "@/lib/types";
import { getProfile } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientId(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : null) ?? "anonymous";
}

/** Used when someone uploads a screenshot without giving us a team ID. */
function syntheticEntry(): FplEntry {
  return {
    id: 0,
    name: "Your squad",
    player_first_name: "",
    player_last_name: "",
    summary_overall_points: 0,
    summary_overall_rank: null,
    summary_event_points: 0,
    last_deadline_bank: null,
    last_deadline_value: null,
    leagues: { classic: [] },
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The site is not configured yet: ANTHROPIC_API_KEY is missing." },
      { status: 500 }
    );
  }

  // Gating the UI is not gating. Anyone can POST here directly, so the real
  // check lives on the server.
  const profile = await getProfile();
  if (!profile.signedIn) {
    return NextResponse.json(
      { error: "Please sign in to analyse a squad." },
      { status: 401 }
    );
  }

  let teamId: number | null = null;
  let playerIds: number[] = [];
  try {
    const body = await req.json();
    if (body.teamId !== undefined && body.teamId !== null && String(body.teamId).trim() !== "") {
      const n = parseInt(String(body.teamId).replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n > 0) teamId = n;
    }
    if (Array.isArray(body.playerIds)) {
      playerIds = body.playerIds
        .map((x: unknown) => parseInt(String(x), 10))
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .slice(0, 15);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!teamId && playerIds.length === 0) {
    return NextResponse.json(
      { error: "Give us either a team ID or a squad read from a screenshot." },
      { status: 400 }
    );
  }

  const id = profile.userId ?? clientId(req);
  if (!(await isSubscriber(id))) {
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
    const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
    const entry = teamId ? await getEntry(teamId) : syntheticEntry();
    const gw = resolveGameweek(bootstrap);

    const picksGw = teamId ? gw.lastFinished : null;
    const leagueId = teamId ? pickPrimaryLeague(entry) : null;

    const [picks, league] = await Promise.all([
      picksGw && teamId ? getPicks(teamId, picksGw) : Promise.resolve(null),
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
      teamId: teamId ?? 0,
      manualElementIds: playerIds,
    });

    // Only reach for the web when the official data is genuinely thin. Each
    // search costs money and seconds, and this all has to fit in 60 of them.
    const thin = gw.isPreSeason || context.squad.length === 0;
    const research = thin
      ? await runResearch({
          apiKey: process.env.ANTHROPIC_API_KEY,
          gameweekLabel: context.gameweekLabel,
          isPreSeason: gw.isPreSeason,
          reason: gw.isPreSeason
            ? "The season has not started, so no current-season statistics exist yet."
            : "This manager's squad could not be loaded from the API.",
        })
      : null;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_review" },
      messages: [{ role: "user", content: buildUserMessage(context, research?.briefing) }],
    });

    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { error: "The analysis came back in an unexpected format. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      review: normalizeReview(toolUse.input),
      meta: {
        managerName: context.managerName,
        teamName: context.teamName,
        gameweekLabel: context.gameweekLabel,
        deadline: context.deadline,
        squadValue: Number.isFinite(context.squadValue) ? context.squadValue : 0,
        bank: Number.isFinite(context.bank) ? context.bank : 0,
        overallPoints: context.overallPoints ?? 0,
        overallRank: context.overallRank ?? null,
        miniLeagueName: context.miniLeague?.name ?? null,
        miniLeagueRank: context.miniLeague?.userRank ?? null,
        miniLeagueSize: context.miniLeague?.size ?? null,
        warnings: context.dataWarnings,
        sources: research?.sources ?? [],
        researchUsed: Boolean(research),
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
