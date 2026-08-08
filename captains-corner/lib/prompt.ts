import type { AnalysisContext, SquadPlayer } from "./types";

export const SYSTEM_PROMPT = `You are FPL Corner, a private Fantasy Premier League strategist. Your single job is to help this manager win their mini-leagues through evidence-based decisions that gain advantage over rivals. You are not an FPL content creator, a news summariser, or a points-chaser.

You combine the mindset of an elite FPL manager, a football data analyst, a recruitment scout and a mini-league strategist. Your guiding question for every recommendation is: "What decision gives this manager the highest probability of gaining an advantage over their rivals?"

You challenge the manager's instincts, emotions and recency bias rather than agreeing with them. You are analytical and direct, but respectful and collaborative.

## Decision framework, in strict priority order

1. EXPECTED MINUTES. Can the player actually play? Starting likelihood, rotation risk, injury status, fixture congestion. A player on the bench scores zero. This outranks everything else.
2. FIXTURE QUALITY. Always assess the next four to five gameweeks, not just the next one. Difficulty ratings are given in the data as (H/A, 1-5) where 5 is hardest.
3. UNDERLYING DATA. xGI per 90, expected goals conceded per 90, minutes, starts, form, points per game. Prioritise these over raw goals and assists.
4. SQUAD STRUCTURE. Team balance, budget allocation, bench strength, premium structure, flexibility for future moves.
5. STRATEGIC CONTEXT. Mini-league position, rival ownership, whether the manager is chasing or protecting.

## Mini-league strategy

If PROTECTING a lead: prioritise stability, ownership protection and reliable captains. Owning what rivals own neutralises their upside.
If CHASING: prioritise upside and differentials. Copying the leader guarantees you finish behind them.
Always state which mode you are in and why.

## Hard rules

- Never chase one-week hauls or recommend a player because he scored last week.
- Never ignore fixtures or expected minutes.
- Never recommend a hit unless the four-gameweek gain clearly exceeds the four points.
- Never give betting or gambling advice. Your scope is FPL strategy only.
- Only reference players that appear in the data provided to you. Do not invent players, prices, injuries or fixtures.
- If the data is thin (pre-season, no squad loaded, no league), say so plainly and cap your confidence scores accordingly. Never fake certainty you do not have.

## Style

Direct, analytical, specific. No FPL clichés, no hype, no hedging filler. Every claim should be traceable to the data you were given. Where you are uncertain, name the uncertainty and say what would change your mind.

You must respond by calling the submit_review tool exactly once. Do not write any prose outside the tool call.`;

function playerLine(p: SquadPlayer): string {
  const flags: string[] = [];
  if (p.isCaptain) flags.push("(C)");
  if (p.isVice) flags.push("(V)");
  if (p.onBench) flags.push("BENCH");
  if (p.status !== "a") flags.push(`STATUS:${p.status.toUpperCase()}`);
  if (p.chanceOfPlaying !== null && p.chanceOfPlaying < 100)
    flags.push(`${p.chanceOfPlaying}% to play`);

  const news = p.news ? ` | NEWS: ${p.news}` : "";

  return `- ${p.name} (${p.team}, ${p.position}) £${p.price.toFixed(1)}m ${flags.join(" ")}
  pts:${p.totalPoints} ppg:${p.ppg} form:${p.form} mins:${p.minutes} starts:${p.starts} xGI:${p.xGI} xGI/90:${p.xGIper90} xGC/90:${p.xGCper90} owned:${p.ownership}%
  fixtures: ${p.nextFixtures}${news}`;
}

export function buildUserMessage(ctx: AnalysisContext, research?: string | null): string {
  const sections: string[] = [];

  sections.push(`# Manager
Name: ${ctx.managerName}
Team: ${ctx.teamName}
Total points: ${ctx.overallPoints}
Overall rank: ${ctx.overallRank?.toLocaleString() ?? "not yet ranked"}
Upcoming: ${ctx.gameweekLabel} (deadline ${ctx.deadline})
Squad value: £${ctx.squadValue.toFixed(1)}m | In the bank: £${ctx.bank.toFixed(1)}m
Estimated free transfers: ${ctx.freeTransfers} (the FPL API does not expose this, so treat it as an assumption and say so if it changes your advice)
Active chip: ${ctx.activeChip ?? "none"}
Last gameweek: ${ctx.lastGwPoints ?? "n/a"} points, ${ctx.pointsOnBench ?? "n/a"} left on the bench`);

  if (ctx.dataWarnings.length) {
    sections.push(`# Data limitations you must account for
${ctx.dataWarnings.map((w) => `- ${w}`).join("\n")}`);
  }

  if (ctx.squad.length) {
    sections.push(`# Current squad (15)
${ctx.squad.map(playerLine).join("\n")}`);
  }

  sections.push(`# Fixture outlook, next 5 gameweeks
Sorted by combined difficulty, easiest run first. Format: OPPONENT(Home/Away, difficulty 1-5).
${ctx.fixtureOutlook.map((f) => `- ${f.team} [${f.difficultySum}]: ${f.next}`).join("\n")}`);

  const candidateBlocks = Object.entries(ctx.candidates)
    .filter(([, list]) => list.length)
    .map(([pos, list]) => `## ${pos}\n${list.map(playerLine).join("\n")}`)
    .join("\n\n");

  sections.push(`# Transfer candidate shortlist
These are pre-filtered by underlying data and fixtures. You may only recommend transfers IN from this list or from the manager's existing squad.

${candidateBlocks}`);

  if (ctx.miniLeague) {
    const mode =
      ctx.miniLeague.userRank === 1
        ? "The manager is TOP of this league. Protecting mode."
        : (ctx.miniLeague.gapToLeader ?? 0) > 60
          ? "The manager is well behind the leader. Aggressive chasing mode."
          : "The manager is in contention. Balanced mode with selective differentials.";

    sections.push(`# Mini-league: ${ctx.miniLeague.name}
Size: ${ctx.miniLeague.size} managers
Manager's rank: ${ctx.miniLeague.userRank ?? "unknown"}
Gap to leader: ${ctx.miniLeague.gapToLeader ?? "unknown"} points
Strategic read: ${mode}

Standings (top ${ctx.miniLeague.standings.length}):
${ctx.miniLeague.standings
  .map(
    (s) =>
      `${s.rank}. ${s.manager} (${s.teamName}) — ${s.total} pts${s.isUser ? "   <-- THIS MANAGER" : ""}`
  )
  .join("\n")}`);
  }

  if (research && research.trim()) {
    sections.push(`# Current context gathered from the web
The FPL data above was thin, so this briefing was researched from public football sources just now. Treat it as current reporting rather than confirmed fact, and say so where it drives a recommendation.

${research.trim()}`);
  }

  sections.push(`# Task
Produce a full ${ctx.gameweekLabel} review for this manager by calling the submit_review tool. Be specific, name real players from the data, and make every recommendation traceable to minutes, fixtures or underlying numbers.`);

  return sections.join("\n\n");
}

// Forcing a tool call is the reliable way to get structured JSON back from the
// model, rather than parsing prose and hoping.
export const REVIEW_TOOL = {
  name: "submit_review",
  description: "Submit the completed Fantasy Premier League gameweek review.",
  input_schema: {
    type: "object" as const,
    properties: {
      executive_summary: {
        type: "object",
        properties: {
          squad_health: { type: "number", description: "Score out of 10" },
          best_transfer: { type: "string", description: "Format: 'Player Out -> Player In', or 'Roll transfer' if no move is worth making" },
          alternative_transfer: { type: "string" },
          captain: { type: "string" },
          vice_captain: { type: "string" },
          chip_advice: { type: "string", description: "Which chip, or 'Save all chips'" },
          hit_advice: { type: "string", description: "Yes or No, with a short reason" },
          confidence: { type: "number", description: "Score out of 10" },
        },
        required: ["squad_health", "best_transfer", "alternative_transfer", "captain", "vice_captain", "chip_advice", "hit_advice", "confidence"],
      },
      squad_assessment: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          immediate_problems: { type: "array", items: { type: "string" } },
          long_term_concerns: { type: "array", items: { type: "string" } },
          behavioural_flags: {
            type: "array",
            items: { type: "string" },
            description: "Signs the manager is being reactive, hoarding cash, over-invested in one club, ignoring fixtures, or holding injured assets. Empty array if none.",
          },
        },
        required: ["strengths", "weaknesses", "immediate_problems", "long_term_concerns", "behavioural_flags"],
      },
      transfers: {
        type: "array",
        description: "One to three transfer recommendations, best first.",
        items: {
          type: "object",
          properties: {
            player_out: { type: "string" },
            reason_out: { type: "string" },
            player_in: { type: "string" },
            reason_in: { type: "string" },
            four_gw_projection: { type: "string", description: "Expected points swing over four gameweeks and why" },
            risks: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["player_out", "reason_out", "player_in", "reason_in", "four_gw_projection", "risks", "confidence"],
        },
      },
      starting_xi: {
        type: "object",
        properties: {
          formation: { type: "string" },
          starters: { type: "array", items: { type: "string" } },
          bench: { type: "array", items: { type: "string" }, description: "In bench order" },
          notes: { type: "string" },
        },
        required: ["formation", "starters", "bench", "notes"],
      },
      captaincy: {
        type: "object",
        properties: {
          best: { type: "object", properties: { player: { type: "string" }, reasoning: { type: "string" } }, required: ["player", "reasoning"] },
          safe: { type: "object", properties: { player: { type: "string" }, reasoning: { type: "string" } }, required: ["player", "reasoning"] },
          differential: { type: "object", properties: { player: { type: "string" }, reasoning: { type: "string" } }, required: ["player", "reasoning"] },
        },
        required: ["best", "safe", "differential"],
      },
      chip_strategy: {
        type: "array",
        items: {
          type: "object",
          properties: {
            chip: { type: "string" },
            recommendation: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["chip", "recommendation", "reasoning"],
        },
      },
      roadmap: {
        type: "array",
        description: "Four gameweek forward plan.",
        items: {
          type: "object",
          properties: {
            gameweek: { type: "string" },
            planned_move: { type: "string" },
            fixture_target: { type: "string" },
            risk: { type: "string" },
          },
          required: ["gameweek", "planned_move", "fixture_target", "risk"],
        },
      },
      league_strategy: {
        type: "string",
        description: "How this manager should play their mini-league specifically: protect or chase, and what that means in practice.",
      },
      uncertainties: {
        type: "array",
        items: { type: "string" },
        description: "What could change this advice: press conferences, injury news, predicted lineups, price changes.",
      },
    },
    required: ["executive_summary", "squad_assessment", "transfers", "starting_xi", "captaincy", "chip_strategy", "roadmap", "league_strategy", "uncertainties"],
  },
};


/**
 * Chat mode. Same strategist, conversational rather than producing a formal
 * review. The squad context is passed separately and cached, so this stays
 * short and stable.
 */
export const CHAT_SYSTEM_PROMPT = `You are FPL Corner, a private Fantasy Premier League strategist talking to a manager about their own squad. The squad, fixtures, transfer candidates and mini-league position are given to you separately. Refer to them constantly.

How to answer:
- Be specific. Name players, prices, fixtures and numbers from the data you were given. Never invent a player, price, injury or fixture that is not in the data.
- Lead with the answer, then the reasoning. Two or three short paragraphs is usually right. Use a short list only when comparing options.
- Weigh decisions in this order: expected minutes, then fixtures over the next four to five gameweeks, then underlying data (xGI per 90, xGC per 90, starts), then squad structure, then mini-league position.
- Push back when the manager is chasing last week's points, reacting emotionally, or about to take a hit that does not pay for itself. Say so plainly and explain why.
- If they are top of their mini-league, argue for protecting the lead. If they are chasing, argue for differentials. Say which mode you are in.
- When you are uncertain, say what would change your mind: a press conference, a fitness update, a predicted lineup, a price change.
- If the data is thin because the season has not started, say so rather than inventing confidence.

Hard rules:
- No betting or gambling advice of any kind, ever. If asked, say it is outside what you do and steer back to FPL strategy.
- No predictions of scorelines or goalscorers presented as fact.
- Stay on Fantasy Premier League. If asked about something unrelated, say so briefly and offer to get back to the squad.
- Never claim a player is injured, suspended or starting unless it appears in the data you were given.

Write conversationally. No headings, no bold-heavy formatting, no bullet-point soup. You are talking to someone, not filing a report.`;
