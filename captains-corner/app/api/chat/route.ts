import { NextRequest } from "next/server";
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
import { CHAT_SYSTEM_PROMPT, buildUserMessage } from "@/lib/prompt";
import type { FplEntry } from "@/lib/types";
import { getProfile } from "@/lib/user";
import { checkWeekly } from "@/lib/ratelimit";
import { byId } from "@/lib/tiers";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 15 questions each, so 30 messages including our replies. */
const MAX_TURNS = 15;

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

function text(body: string, status: number) {
  return new Response(JSON.stringify({ error: body }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return text("The site is not configured yet: ANTHROPIC_API_KEY is missing.", 500);

  const profile = await getProfile();
  if (!profile.signedIn) return text("Please sign in to use the assistant.", 401);

  if (profile.plan !== "premium") {
    return text(
      "Chat is a Premier feature. Upgrade to talk through transfers, chips and captaincy with your squad loaded.",
      402
    );
  }

  let teamId: number | null = null;
  let playerIds: number[] = [];
  let messages: { role: "user" | "assistant"; content: string }[] = [];

  try {
    const body = await req.json();
    if (body.teamId) {
      const n = parseInt(String(body.teamId).replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n > 0) teamId = n;
    }
    if (Array.isArray(body.playerIds)) {
      playerIds = body.playerIds
        .map((x: unknown) => parseInt(String(x), 10))
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .slice(0, 15);
    }
    if (Array.isArray(body.messages)) {
      messages = body.messages
        .filter(
          (m: any) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim()
        )
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
    }
  } catch {
    return text("Invalid request.", 400);
  }

  if (messages.length === 0) return text("No message to answer.", 400);

  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns > MAX_TURNS) {
    return text(
      `You have reached ${MAX_TURNS} questions for this review. Run a fresh analysis to start a new conversation.`,
      429
    );
  }

  // Keep the last few exchanges only. A full 15-turn transcript resent on every
  // message is the biggest cost in the whole app, and the squad context (which
  // is cached) carries the important state anyway.
  const KEEP = Math.max(4, parseInt(process.env.CHAT_HISTORY_TURNS ?? "8", 10) || 8) * 2;
  if (messages.length > KEEP) messages = messages.slice(-KEEP);
  if (messages[0]?.role === "assistant") messages = messages.slice(1);

  const allowance = byId("premium").chatQuestionsPerWeek;
  const weekly = await checkWeekly("chat", profile.userId ?? "anon", allowance);
  if (!weekly.allowed) {
    return text(
      `That's your ${weekly.limit} questions for this week. Your allowance resets on Monday.`,
      429
    );
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "anonymous").split(",")[0].trim();

  try {
    const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
    const entry = teamId ? await getEntry(teamId) : syntheticEntry();
    const gw = resolveGameweek(bootstrap);
    const leagueId = teamId ? pickPrimaryLeague(entry) : null;

    const [picks, league] = await Promise.all([
      teamId && gw.lastFinished ? getPicks(teamId, gw.lastFinished) : Promise.resolve(null),
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

    const anthropic = new Anthropic({ apiKey });

    // The context block is identical on every turn, so caching it turns a
    // roughly 3p follow-up into a fraction of that.
    const stream = await anthropic.messages.create({
      model: process.env.ANTHROPIC_CHAT_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: parseInt(process.env.CHAT_MAX_TOKENS ?? "900", 10) || 900,
      stream: true,
      system: [
        { type: "text", text: CHAT_SYSTEM_PROMPT },
        {
          type: "text",
          text: buildUserMessage(context),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          console.error("Chat stream broke:", err instanceof Error ? err.message : err);
          controller.enqueue(
            encoder.encode("\n\n[The connection dropped mid-answer. Ask again and I'll pick it up.]")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (e instanceof FplError) return text(e.message, e.status);
    const detail = e instanceof Error ? e.message : String(e);
    console.error("Chat failed:", detail);
    if (/credit balance|insufficient|billing/i.test(detail)) {
      return text("The Anthropic account behind this site has run out of credit.", 402);
    }
    return text("Something went wrong answering that. Please try again.", 500);
  }
}
